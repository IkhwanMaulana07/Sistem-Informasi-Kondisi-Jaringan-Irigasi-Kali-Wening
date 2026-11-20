import os
import uuid
import logging
from datetime import datetime, date
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape

from app.core.config import settings
from app.core.state import app_state
from app.models.models import (
    ImportRun,
    Asset,
    AssetTag,
    Canal,
    TertiaryPlot,
    InspectionReport,
    DataQualityFinding,
    PlotServiceAssignment,
    NetworkNode,
    NetworkEdge,
    AssetNetworkPosition,
    AssetImpactCache,
    AssetImpactPlot,
)
from app.ingestion.csv_parser import parse_assets_csv
from app.ingestion.geojson_parser import parse_canals_geojson, parse_plots_geojson
from app.ingestion.excel_parser import parse_reports_excel, match_reports_to_assets
from app.analytics.condition_resolver import resolve_asset_current_condition
from app.geospatial.network import IrrigationNetwork
from app.geospatial.crs import calculate_distance_meters

logger = logging.getLogger("ingestion.pipeline")


def run_initial_import(db: Session) -> bool:
    """
    Executes the automatic initial import pipeline inside a transaction.
    Processes:
      - aset_bangunan.csv
      - saluran.geojson
      - petak_tersier.geojson
      - laporan_penelusuran.xlsx
    Does NOT process laporan_susulan.xlsx during startup.
    Sets app_state.status to 'siap' upon success, or 'gagal' on failure.
    """
    acquired = app_state.import_lock.acquire(blocking=False)
    if not acquired:
        logger.warning("Import lock already held. Skipping concurrent initial import.")
        return False

    app_state.status = "memuat"
    start_time = datetime.utcnow()

    import_run = ImportRun(
        id=uuid.uuid4(),
        source_file="initial_dataset",
        import_type="initial",
        status="running",
        started_at=start_time
    )
    db.add(import_run)
    db.commit()

    try:
        data_dir = settings.DATA_DIR
        asset_file = os.path.join(data_dir, settings.INITIAL_ASSET_FILE)
        canal_file = os.path.join(data_dir, settings.CANAL_FILE)
        plot_file = os.path.join(data_dir, settings.PLOT_FILE)
        report_file = os.path.join(data_dir, settings.INITIAL_REPORT_FILE)

        # 1. Parse Canals
        logger.info(f"Parsing canals from {canal_file}...")
        cleaned_canals, canal_findings = parse_canals_geojson(canal_file)

        # 2. Parse Assets
        logger.info(f"Parsing assets from {asset_file}...")
        cleaned_assets, asset_findings = parse_assets_csv(asset_file)

        # 3. Parse Tertiary Plots
        logger.info(f"Parsing tertiary plots from {plot_file}...")
        cleaned_plots, plot_findings = parse_plots_geojson(plot_file)

        # 4. Check distance from assets to canals for the 2 km and 50 m rules
        # "Koordinat kosong, bernilai 0,0, atau lebih dari 2 km dari saluran terdekat setelah diperbaiki:
        # Simpan asetnya tanpa geometri dan beri tanda koordinat_tidak_valid"
        canal_lines = [c['geom'] for c in cleaned_canals if c.get('geom')]
        
        for a in cleaned_assets:
            pt = a.get('geom')
            if pt is not None and not pt.is_empty and canal_lines:
                # Find min distance to canal in meters
                min_canal_dist = min(calculate_distance_meters(pt, cline) for cline in canal_lines)
                if min_canal_dist > 2000.0:
                    a['geom'] = None
                    a['tags'].append("koordinat_tidak_valid")
                    asset_findings.append({
                        "source_file": "aset_bangunan.csv",
                        "source_record_id": a['kode_aset'],
                        "category": "koordinat_tidak_valid",
                        "problem": f"Koordinat berjarak {min_canal_dist:.1f} m (> 2 km) dari saluran terdekat",
                        "action_taken": "Geometri diset null dan aset ditandai koordinat_tidak_valid",
                        "raw_value": a['raw_payload'],
                        "normalized_value": {"distance_to_canal_m": min_canal_dist}
                    })

        # Assign UUIDs to assets for relationships
        asset_uuid_map = {}
        for a in cleaned_assets:
            a_id = uuid.uuid4()
            a['id'] = a_id
            asset_uuid_map[a['kode_aset']] = a_id

        # Assign UUIDs to canals
        for c in cleaned_canals:
            c['id'] = uuid.uuid4()

        # Assign UUIDs to plots
        for p in cleaned_plots:
            p['id'] = uuid.uuid4()

        # 5. Parse Reports and match to assets
        logger.info(f"Parsing initial reports from {report_file}...")
        cleaned_reports, report_findings = parse_reports_excel(report_file, "laporan_penelusuran.xlsx")
        matched_reports, match_findings = match_reports_to_assets(cleaned_reports, cleaned_assets, "laporan_penelusuran.xlsx")

        # 6. Resolve asset current conditions
        # Group matched reports by asset_id
        reports_by_asset: Dict[Any, List[Dict[str, Any]]] = {}
        for rep in matched_reports:
            aid = rep.get('asset_id')
            if aid:
                reports_by_asset.setdefault(aid, []).append(rep)

        for a in cleaned_assets:
            aid = a['id']
            matched_reps = reports_by_asset.get(aid, [])
            curr_cond, tgl_cond = resolve_asset_current_condition(
                a['condition_inventory'],
                a['tgl_update'],
                matched_reps
            )
            a['condition_current'] = curr_cond
            a['tgl_kondisi'] = tgl_cond

        # 7. Build canal network graph and downstream analysis
        logger.info("Building canal network graph and downstream flow model...")
        network = IrrigationNetwork(connection_tolerance_m=10.0)

        # Find bendung location
        bendung_asset = next((a for a in cleaned_assets if a.get('jenis') == 'bendung' and a.get('geom')), None)
        root_pt = bendung_asset['geom'] if bendung_asset else None

        network.build_network(cleaned_canals, root_point_wgs84=root_pt)

        # Project assets onto canals (50m rule)
        asset_positions = network.project_assets(cleaned_assets, max_distance_m=50.0)

        # Attach 'jauh_dari_saluran' tag and finding
        for a in cleaned_assets:
            aid = str(a['id'])
            pos = asset_positions.get(aid, {})
            if "jauh_dari_saluran" in pos.get('tags', []):
                a['tags'].append("jauh_dari_saluran")
                asset_findings.append({
                    "source_file": "aset_bangunan.csv",
                    "source_record_id": a['kode_aset'],
                    "category": "jauh_dari_saluran",
                    "problem": f"Bangunan berjarak {pos.get('distance_m')} m (> 50 m) dari saluran",
                    "action_taken": "Ditandai jauh_dari_saluran dan dikecualikan dari analisis dampak hilir",
                    "raw_value": a['raw_payload'],
                    "normalized_value": {"distance_m": pos.get('distance_m')}
                })

        # Assign tertiary plots to assets
        plot_assignments = network.assign_plots_to_assets(cleaned_plots, cleaned_assets, fallback_max_dist_m=200.0)

        # Calculate downstream impacts
        plots_lookup = {str(p['id']): p for p in cleaned_plots}
        downstream_impacts = network.calculate_downstream_impacts(
            cleaned_assets,
            asset_positions,
            plot_assignments,
            plots_lookup
        )

        # 8. Database Persistence inside atomic transaction
        logger.info("Persisting imported entities into PostgreSQL + PostGIS...")
        
        # Clear existing data cleanly if re-running
        db.query(AssetImpactPlot).delete()
        db.query(AssetImpactCache).delete()
        db.query(AssetNetworkPosition).delete()
        db.query(NetworkEdge).delete()
        db.query(NetworkNode).delete()
        db.query(PlotServiceAssignment).delete()
        db.query(DataQualityFinding).delete()
        db.query(InspectionReport).delete()
        db.query(TertiaryPlot).delete()
        db.query(Canal).delete()
        db.query(AssetTag).delete()
        db.query(Asset).delete()

        # Persist Assets
        asset_orm_map = {}
        for a in cleaned_assets:
            geom_wkb = from_shape(a['geom'], srid=4326) if a['geom'] else None
            asset_obj = Asset(
                id=a['id'],
                kode_aset=a['kode_aset'],
                nomenklatur_raw=a['nomenklatur_raw'],
                nomenklatur_normalized=a['nomenklatur_normalized'],
                jenis=a['jenis'],
                nama_saluran=a['nama_saluran'],
                condition_inventory=a['condition_inventory'],
                condition_current=a['condition_current'],
                tahun_bangun=a['tahun_bangun'],
                tgl_update=a['tgl_update'],
                tgl_kondisi=a['tgl_kondisi'],
                source_file="aset_bangunan.csv",
                source_row=a['source_row'],
                geom=geom_wkb
            )
            db.add(asset_obj)
            asset_orm_map[a['id']] = asset_obj

            # Unique tags
            for tag_code in set(a['tags']):
                tag_obj = AssetTag(
                    id=uuid.uuid4(),
                    asset_id=a['id'],
                    tag_code=tag_code,
                    detail=f"Tanda kualitas {tag_code}"
                )
                db.add(tag_obj)
        db.flush()

        # Persist Canals
        canal_orm_map = {}
        for c in cleaned_canals:
            canal_obj = Canal(
                id=c['id'],
                id_ruas=c['id_ruas'],
                nama_saluran=c['nama_saluran'],
                tingkat=c['tingkat'],
                kondisi=c['kondisi'],
                geom=from_shape(c['geom'], srid=4326),
                length_m=c['length_m'],
                source_file="saluran.geojson",
                source_feature_id=c['source_feature_id'],
                canonical_geometry_hash=c['canonical_geometry_hash']
            )
            db.add(canal_obj)
            canal_orm_map[c['id']] = canal_obj

        db.flush()

        # Persist Tertiary Plots
        plot_orm_map = {}
        for p in cleaned_plots:
            geom_wkb = from_shape(p['geom'], srid=4326) if p['geom'] else None
            plot_obj = TertiaryPlot(
                id=p['id'],
                kode_petak=p['kode_petak'],
                nama_petak=p['nama_petak'],
                luas_baku_raw=p['luas_baku_raw'],
                luas_baku_unit_detected=p['luas_baku_unit_detected'],
                luas_ha=p['luas_ha'],
                nomenklatur_sadap_raw=p['nomenklatur_sadap_raw'],
                nomenklatur_sadap_normalized=p['nomenklatur_sadap_normalized'],
                geom=geom_wkb,
                has_valid_geometry=p['has_valid_geometry'],
                source_file="petak_tersier.geojson",
                source_feature_id=p['source_feature_id']
            )
            db.add(plot_obj)
            plot_orm_map[p['id']] = plot_obj

        db.flush()

        # Persist Reports
        for rep in matched_reports:
            geom_wkb = from_shape(rep['geom'], srid=4326) if rep.get('geom') else None
            report_obj = InspectionReport(
                id=uuid.uuid4(),
                id_laporan=rep['id_laporan'],
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
                source_file="laporan_penelusuran.xlsx",
                source_row=rep['source_row'],
                source_payload=rep['raw_payload'],
                import_run_id=import_run.id
            )
            db.add(report_obj)

        # Persist Network Nodes
        node_id_to_uuid = {}
        for nid, (nx_val, ny_val) in network.nodes_dict.items():
            node_uuid = uuid.uuid4()
            node_id_to_uuid[nid] = node_uuid
            wgs_pt = network.node_positions[nid]
            is_root = (nid == network.root_node_id)
            node_obj = NetworkNode(
                id=node_uuid,
                node_key=nid,
                geom=from_shape(wgs_pt, srid=4326),
                is_root=is_root,
                component_no=1
            )
            db.add(node_obj)

        # Persist Network Edges
        edge_canal_to_uuid = {}
        for cid, edge_info in network.canal_edges.items():
            edge_uuid = uuid.uuid4()
            edge_canal_to_uuid[cid] = edge_uuid
            edge_obj = NetworkEdge(
                id=edge_uuid,
                canal_id=uuid.UUID(cid),
                from_node_id=node_id_to_uuid[edge_info['from_node']],
                to_node_id=node_id_to_uuid[edge_info['to_node']],
                flow_direction_status='resolved',
                length_m=edge_info['length']
            )
            db.add(edge_obj)

        # Persist Asset Network Positions
        for a in cleaned_assets:
            aid = str(a['id'])
            pos = asset_positions.get(aid, {})
            cid_str = pos.get('canal_id')
            canal_uuid = uuid.UUID(cid_str) if cid_str else None
            edge_uuid = edge_canal_to_uuid.get(cid_str) if cid_str else None
            proj_pt = pos.get('projected_wgs')
            geom_wkb = from_shape(proj_pt, srid=4326) if proj_pt else None

            pos_obj = AssetNetworkPosition(
                asset_id=a['id'],
                canal_id=canal_uuid,
                edge_id=edge_uuid,
                distance_to_canal_m=pos.get('distance_m'),
                measure_m=pos.get('measure_m'),
                geom=geom_wkb,
                is_eligible=pos.get('is_eligible', False)
            )
            db.add(pos_obj)

        # Persist Plot Service Assignments
        for p in cleaned_plots:
            pid = str(p['id'])
            assign = plot_assignments.get(pid, {})
            serv_aid = assign.get('serving_asset_id')
            serving_uuid = uuid.UUID(serv_aid) if serv_aid else None

            assign_obj = PlotServiceAssignment(
                id=uuid.uuid4(),
                plot_id=p['id'],
                serving_asset_id=serving_uuid,
                assignment_method=assign.get('assignment_method', 'none'),
                distance_m=assign.get('distance_m'),
                tag=assign.get('tag')
            )
            db.add(assign_obj)

        # Persist Downstream Impacts (Cache + Plots)
        for a in cleaned_assets:
            aid_str = str(a['id'])
            impact = downstream_impacts.get(aid_str, {
                'jumlah_petak': 0,
                'luas_terdampak_ha': 0.0,
                'petak': []
            })
            cache_obj = AssetImpactCache(
                asset_id=a['id'],
                jumlah_petak=impact['jumlah_petak'],
                luas_terdampak_ha=impact['luas_terdampak_ha'],
                algorithm_version="1.0-DAG-BFS"
            )
            db.add(cache_obj)

            # Relate affected plots
            for pl in impact['petak']:
                # Find plot by kode_petak
                matched_plot = next((p for p in cleaned_plots if p['kode_petak'] == pl['kode_petak']), None)
                if matched_plot:
                    link_obj = AssetImpactPlot(
                        asset_id=a['id'],
                        plot_id=matched_plot['id']
                    )
                    db.add(link_obj)

        # Persist All Quality Findings
        all_findings = canal_findings + asset_findings + plot_findings + report_findings + match_findings
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

        # Update import run
        import_run.status = "completed"
        import_run.finished_at = datetime.utcnow()
        import_run.rows_read = len(cleaned_assets) + len(cleaned_canals) + len(cleaned_plots) + len(cleaned_reports)
        import_run.rows_inserted = import_run.rows_read
        db.commit()

        app_state.status = "siap"
        logger.info("Initial import completed successfully. Health status set to 'siap'.")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Error during initial import: {e}", exc_info=True)
        import_run.status = "failed"
        import_run.error_summary = str(e)
        import_run.finished_at = datetime.utcnow()
        db.commit()
        app_state.status = "gagal"
        app_state.last_error = str(e)
        return False

    finally:
        app_state.import_lock.release()
