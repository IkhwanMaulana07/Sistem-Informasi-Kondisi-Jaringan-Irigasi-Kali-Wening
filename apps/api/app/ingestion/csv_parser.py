import csv
from typing import List, Dict, Any, Tuple
from datetime import date
from shapely.geometry import Point
from app.normalization.nomenclature import normalize_nomenclature
from app.normalization.condition import normalize_condition
from app.normalization.asset_type import normalize_asset_type
from app.normalization.dates_and_numbers import parse_date, parse_int
from app.geospatial.crs import detect_and_normalize_point


def parse_assets_csv(file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses aset_bangunan.csv.
    Performs normalization, CRS/coordinate transformation, and asset deduplication by latest tgl_update.
    Returns (cleaned_assets, quality_findings).
    """
    raw_rows = []
    with open(file_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            raw_rows.append((row_idx, row))

    quality_findings = []
    processed_records = []

    for row_idx, r in raw_rows:
        kode_aset = str(r.get('kode_aset', '')).strip()
        if not kode_aset:
            continue

        raw_nom = r.get('nomenklatur')
        norm_nom, _ = normalize_nomenclature(raw_nom)

        raw_jenis = r.get('jenis')
        norm_jenis, jenis_err = normalize_asset_type(raw_jenis)

        raw_kondisi = r.get('kondisi')
        norm_kondisi, cond_err = normalize_condition(raw_kondisi)

        raw_update = r.get('tgl_update')
        tgl_update, _ = parse_date(raw_update)

        raw_tahun = r.get('tahun_bangun')
        tahun_bangun, _ = parse_int(raw_tahun)

        raw_x = r.get('x')
        raw_y = r.get('y')
        geom_pt, coord_tags, coord_meta = detect_and_normalize_point(raw_x, raw_y, source_is_lat_lon=False)

        # Log coordinate findings
        for tag in coord_tags:
            action_desc = "Koreksi koordinat"
            prob_desc = f"Nilai koordinat {raw_x}, {raw_y}"
            if tag == "koordinat_utm_dikonversi":
                action_desc = "Dikonversi dari UTM 49S ke WGS84"
                prob_desc = "Koordinat tercatat dalam format UTM 49S"
            elif tag == "koordinat_tertukar_dibetulkan":
                action_desc = "Urutan sumbu lat/lon ditukar ke posisi yang benar"
                prob_desc = "Koordinat latitude dan longitude tertukar"
            elif tag == "koordinat_tidak_valid":
                action_desc = "Geometri diset null dan aset ditandai koordinat_tidak_valid"
                prob_desc = "Koordinat kosong, bernilai 0,0, atau di luar rentang valid"

            quality_findings.append({
                "source_file": "aset_bangunan.csv",
                "source_record_id": kode_aset,
                "category": tag,
                "problem": prob_desc,
                "action_taken": action_desc,
                "raw_value": {"x": raw_x, "y": raw_y},
                "normalized_value": {"lon": geom_pt.x if geom_pt else None, "lat": geom_pt.y if geom_pt else None}
            })

        processed_records.append({
            "row_idx": row_idx,
            "kode_aset": kode_aset,
            "nomenklatur_raw": raw_nom,
            "nomenklatur_normalized": norm_nom,
            "jenis": norm_jenis,
            "nama_saluran": str(r.get('nama_saluran', '')).strip() or None,
            "condition_inventory": norm_kondisi,
            "condition_current": norm_kondisi,  # Initially set to inventory condition
            "tahun_bangun": tahun_bangun,
            "tgl_update": tgl_update,
            "tgl_kondisi": tgl_update,
            "source_file": "aset_bangunan.csv",
            "source_row": str(row_idx),
            "geom": geom_pt,
            "tags": list(coord_tags),
            "raw_payload": dict(r)
        })

    # Deduplicate assets by kode_aset: keep the one with latest tgl_update
    grouped_by_code: Dict[str, List[Dict[str, Any]]] = {}
    for rec in processed_records:
        grouped_by_code.setdefault(rec['kode_aset'], []).append(rec)

    final_assets = []
    for kode, items in grouped_by_code.items():
        if len(items) == 1:
            final_assets.append(items[0])
        else:
            # Sort by tgl_update descending, then row_idx ascending (first seen tie breaker)
            sorted_items = sorted(
                items,
                key=lambda x: (x['tgl_update'] or date.min, -x['row_idx']),
                reverse=True
            )
            winner = sorted_items[0]
            final_assets.append(winner)

            # Record discarded rows as 'aset_ganda'
            for dropped in sorted_items[1:]:
                quality_findings.append({
                    "source_file": "aset_bangunan.csv",
                    "source_record_id": kode,
                    "category": "aset_ganda",
                    "problem": f"Aset duplikat di inventaris dengan tanggal update {dropped['tgl_update']}",
                    "action_taken": f"Dibuang karena terdapat data lebih baru bertanggal {winner['tgl_update']}",
                    "raw_value": dropped['raw_payload'],
                    "normalized_value": {"kept_row": winner['source_row']}
                })

    return final_assets, quality_findings
