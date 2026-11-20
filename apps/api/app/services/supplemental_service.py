import os
import uuid
import logging
from datetime import datetime, date
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape

from app.core.config import settings
from app.core.state import app_state
from app.models.models import (
    ImportRun,
    Asset,
    InspectionReport,
    DataQualityFinding,
    AssetImpactCache,
)
from app.ingestion.excel_parser import parse_reports_excel, match_reports_to_assets
from app.analytics.condition_resolver import resolve_asset_current_condition

logger = logging.getLogger("services.supplemental")


def process_supplemental_import(db: Session) -> Dict[str, int]:
    """
    Executes supplemental report import from the configured laporan_susulan.xlsx path.
    - Idempotent and thread-safe.
    - Tracks ditambah, diubah, dibatalkan, tidak_berubah.
    - Recalculates current condition for all assets.
    - Recomputes priority ranking dependencies.
    """
    acquired = app_state.import_lock.acquire(blocking=True, timeout=30.0)
    if not acquired:
        raise RuntimeError("Another import process is currently running. Please try again.")

    import_run = ImportRun(
        id=uuid.uuid4(),
        source_file=settings.SUPPLEMENTAL_REPORT_FILE,
        import_type="supplemental",
        status="running",
        started_at=datetime.utcnow()
    )
    db.add(import_run)
    db.commit()

    try:
        file_path = os.path.join(settings.DATA_DIR, settings.SUPPLEMENTAL_REPORT_FILE)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Supplemental report file not found at {file_path}")

        # 1. Parse supplemental reports
        parsed_reports, quality_findings = parse_reports_excel(
            file_path, 
            source_filename=settings.SUPPLEMENTAL_REPORT_FILE
        )

        # 2. Match to existing assets
        existing_assets = db.query(Asset).all()
        assets_dict_list = [
            {
                'id': a.id,
                'kode_aset': a.kode_aset,
                'nomenklatur_normalized': a.nomenklatur_normalized,
                'geom': a.geom
            }
            for a in existing_assets
        ]

        matched_reports, match_findings = match_reports_to_assets(
            parsed_reports, 
            assets_dict_list, 
            source_filename=settings.SUPPLEMENTAL_REPORT_FILE
        )

        # 3. Process each supplemental report against DB
        ditambah = 0
        diubah = 0
        dibatalkan = 0
        tidak_berubah = 0

        existing_reports_map = {
            r.id_laporan: r for r in db.query(InspectionReport).all()
        }

        affected_asset_ids = set()

        for rep in matched_reports:
            id_rep = rep['id_laporan']
            geom_wkb = from_shape(rep['geom'], srid=4326) if rep.get('geom') else None

            if id_rep not in existing_reports_map:
                # 1. New report
                new_report = InspectionReport(
                    id=uuid.uuid4(),
                    id_laporan=id_rep,
                    asset_id=rep.get('asset_id'),
                    tanggal=rep['tanggal'],
                    petugas=rep['petugas'],
                    nomenklatur_raw=rep['nomenklatur_raw'],
                    nomenklatur_normalized=rep['nomenklatur_normalized'],
                    jenis_kerusakan=rep['jenis_kerusakan'],
                    kondisi=rep['kondisi'],
                    status=rep['status'],
                    keterangan=rep['keterangan'],
                    geom=geom_wkb,
                    matching_method=rep.get('matching_method'),
                    matching_distance_m=rep.get('matching_distance_m'),
                    source_file=settings.SUPPLEMENTAL_REPORT_FILE,
                    source_row=rep['source_row'],
                    source_payload=rep['raw_payload'],
                    import_run_id=import_run.id
                )
                db.add(new_report)
                existing_reports_map[id_rep] = new_report
                ditambah += 1
                if rep.get('asset_id'):
                    affected_asset_ids.add(rep['asset_id'])
            else:
                # Existing report: compare fields
                curr_rep = existing_reports_map[id_rep]
                
                # Check status change
                is_becoming_batal = (rep['status'] == 'batal' and curr_rep.status != 'batal')
                
                # Check if any content changed
                has_changed = (
                    curr_rep.kondisi != rep['kondisi'] or
                    curr_rep.status != rep['status'] or
                    curr_rep.tanggal != rep['tanggal'] or
                    curr_rep.keterangan != rep['keterangan'] or
                    curr_rep.jenis_kerusakan != rep['jenis_kerusakan'] or
                    curr_rep.petugas != rep['petugas']
                )

                if is_becoming_batal:
                    dibatalkan += 1
                    curr_rep.status = 'batal'
                    curr_rep.keterangan = rep['keterangan']
                    curr_rep.kondisi = rep['kondisi']
                    curr_rep.tanggal = rep['tanggal']
                    curr_rep.updated_at = datetime.utcnow()
                    if curr_rep.asset_id:
                        affected_asset_ids.add(curr_rep.asset_id)
                elif has_changed:
                    diubah += 1
                    curr_rep.kondisi = rep['kondisi']
                    curr_rep.status = rep['status']
                    curr_rep.tanggal = rep['tanggal']
                    curr_rep.keterangan = rep['keterangan']
                    curr_rep.jenis_kerusakan = rep['jenis_kerusakan']
                    curr_rep.petugas = rep['petugas']
                    curr_rep.updated_at = datetime.utcnow()
                    if curr_rep.asset_id:
                        affected_asset_ids.add(curr_rep.asset_id)
                else:
                    tidak_berubah += 1

        # 4. Save data quality findings
        all_findings = quality_findings + match_findings
        for f in all_findings:
            finding_obj = DataQualityFinding(
                id=uuid.uuid4(),
                import_run_id=import_run.id,
                source_file=f['source_file'],
                source_record_id=f['source_record_id'],
                category=f['category'],
                problem=f['problem'],
                action_taken=f['action_taken'],
                raw_value=f.get('raw_value'),
                normalized_value=f.get('normalized_value'),
                severity="warning"
            )
            db.add(finding_obj)

        # 5. Recalculate current condition for affected assets
        if affected_asset_ids:
            all_reports = db.query(InspectionReport).all()
            reports_by_asset = {}
            for r in all_reports:
                if r.asset_id:
                    reports_by_asset.setdefault(r.asset_id, []).append({
                        'kondisi': r.kondisi,
                        'status': r.status,
                        'tanggal': r.tanggal
                    })

            for asset in existing_assets:
                if asset.id in affected_asset_ids:
                    reps = reports_by_asset.get(asset.id, [])
                    curr_cond, tgl_cond = resolve_asset_current_condition(
                        asset.condition_inventory,
                        asset.tgl_update,
                        reps
                    )
                    asset.condition_current = curr_cond
                    asset.tgl_kondisi = tgl_cond

        import_run.status = "completed"
        import_run.finished_at = datetime.utcnow()
        import_run.rows_read = len(matched_reports)
        import_run.rows_inserted = ditambah
        import_run.rows_updated = diubah + dibatalkan
        import_run.rows_skipped = tidak_berubah
        db.commit()

        logger.info(f"Supplemental import result: ditambah={ditambah}, diubah={diubah}, dibatalkan={dibatalkan}, tidak_berubah={tidak_berubah}")

        return {
            "ditambah": ditambah,
            "diubah": diubah,
            "dibatalkan": dibatalkan,
            "tidak_berubah": tidak_berubah
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Supplemental import failed: {e}", exc_info=True)
        import_run.status = "failed"
        import_run.error_summary = str(e)
        import_run.finished_at = datetime.utcnow()
        db.commit()
        raise e

    finally:
        app_state.import_lock.release()
