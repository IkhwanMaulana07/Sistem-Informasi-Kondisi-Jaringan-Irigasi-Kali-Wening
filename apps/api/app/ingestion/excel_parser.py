import openpyxl
from typing import List, Dict, Any, Tuple, Optional
from datetime import date
from shapely.geometry import Point
from app.normalization.nomenclature import normalize_nomenclature
from app.normalization.condition import normalize_condition
from app.normalization.dates_and_numbers import parse_date
from app.geospatial.crs import detect_and_normalize_point, calculate_distance_meters


def parse_reports_excel(
    file_path: str,
    source_filename: str = "laporan_penelusuran.xlsx"
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses inspection reports from Excel workbook.
    Extracts columns, normalizes values, checks coordinates,
    and deduplicates reports having identical (nomenklatur/asset, tanggal, kondisi).
    """
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active

    # Read header row
    headers = [str(cell.value).strip().lower() if cell.value is not None else "" for cell in sheet[1]]
    header_map = {name: idx for idx, name in enumerate(headers) if name}

    raw_rows = []
    for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        if not any(row):
            continue
        row_dict = {}
        for col_name, col_idx in header_map.items():
            if col_idx < len(row):
                row_dict[col_name] = row[col_idx]
        raw_rows.append((row_idx, row_dict))

    quality_findings = []
    processed_reports = []

    for row_idx, r in raw_rows:
        id_laporan = str(r.get('id_laporan', '')).strip()
        if not id_laporan:
            continue

        raw_tgl = r.get('tanggal')
        tanggal, _ = parse_date(raw_tgl)

        raw_nom = r.get('nomenklatur')
        norm_nom, _ = normalize_nomenclature(raw_nom)

        raw_kondisi = r.get('kondisi')
        norm_kondisi, _ = normalize_condition(raw_kondisi)

        raw_status = str(r.get('status', 'aktif')).strip().lower()
        status = 'batal' if 'batal' in raw_status else 'aktif'

        raw_lat = r.get('lat')
        raw_lon = r.get('lon')

        geom_pt = None
        coord_tags = []
        if raw_lat is not None and raw_lon is not None:
            # Note: in reports columns are lat and lon. Pass source_is_lat_lon=True
            geom_pt, coord_tags, _ = detect_and_normalize_point(raw_lat, raw_lon, source_is_lat_lon=True)
            for tag in coord_tags:
                action_desc = "Koreksi koordinat laporan"
                prob_desc = f"Koordinat laporan {id_laporan}"
                if tag == "koordinat_utm_dikonversi":
                    action_desc = "Dikonversi dari UTM 49S ke WGS84"
                    prob_desc = "Koordinat laporan tercatat dalam format UTM 49S"
                elif tag == "koordinat_tertukar_dibetulkan":
                    action_desc = "Urutan sumbu lat/lon ditukar ke posisi yang benar"
                    prob_desc = "Koordinat latitude dan longitude laporan tertukar"
                elif tag == "koordinat_tidak_valid":
                    action_desc = "Geometri diset null"
                    prob_desc = "Koordinat laporan tidak valid"

                quality_findings.append({
                    "source_file": source_filename,
                    "source_record_id": id_laporan,
                    "category": tag,
                    "problem": prob_desc,
                    "action_taken": action_desc,
                    "raw_value": {"lat": str(raw_lat), "lon": str(raw_lon)},
                    "normalized_value": {"lon": geom_pt.x if geom_pt else None, "lat": geom_pt.y if geom_pt else None}
                })

        processed_reports.append({
            "row_idx": row_idx,
            "id_laporan": id_laporan,
            "tanggal": tanggal,
            "petugas": str(r.get('petugas', '')).strip() or None,
            "nomenklatur_raw": str(raw_nom) if raw_nom is not None else None,
            "nomenklatur_normalized": norm_nom,
            "jenis_kerusakan": str(r.get('jenis_kerusakan', '')).strip() or None,
            "kondisi": norm_kondisi,
            "status": status,
            "keterangan": str(r.get('keterangan', '')).strip() or None,
            "geom": geom_pt,
            "source_file": source_filename,
            "source_row": str(row_idx),
            "raw_payload": {k: str(v) for k, v in r.items() if v is not None}
        })

    # Deduplicate reports: (nomenklatur/asset, tanggal, kondisi)
    seen_dedup_keys: Dict[Tuple, Dict[str, Any]] = {}
    final_reports = []

    for rep in processed_reports:
        # Key: (nomenklatur_normalized, tanggal, kondisi)
        dedup_key = (rep['nomenklatur_normalized'], rep['tanggal'], rep['kondisi'])
        if dedup_key in seen_dedup_keys:
            existing = seen_dedup_keys[dedup_key]
            quality_findings.append({
                "source_file": source_filename,
                "source_record_id": rep['id_laporan'],
                "category": "laporan_ganda",
                "problem": f"Laporan ganda untuk {rep['nomenklatur_normalized']} pada tanggal {rep['tanggal']} dengan kondisi {rep['kondisi']}",
                "action_taken": f"Dibuang karena duplikat dari {existing['id_laporan']}",
                "raw_value": rep['raw_payload'],
                "normalized_value": {"kept_id_laporan": existing['id_laporan']}
            })
        else:
            seen_dedup_keys[dedup_key] = rep
            final_reports.append(rep)

    return final_reports, quality_findings


def match_reports_to_assets(
    reports: List[Dict[str, Any]],
    assets: List[Dict[str, Any]],
    source_filename: str = "laporan_penelusuran.xlsx"
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Matches reports to assets in exact order:
    1. Exact match on normalized nomenclature.
    2. Fallback to nearest eligible asset within 30 m of report coordinate (if nomenclature empty/unknown).
    3. If no match exists, preserve report and tag laporan_tanpa_aset.
    Returns (matched_reports, quality_findings).
    """
    quality_findings = []

    # Build lookup by normalized nomenclature
    nom_to_assets = {}
    for a in assets:
        nom = a.get('nomenklatur_normalized')
        if nom:
            nom_to_assets.setdefault(nom, []).append(a)

    # Prepare assets with geometry for spatial fallback
    assets_with_geom = [
        a for a in assets 
        if a.get('geom') is not None and not a['geom'].is_empty
    ]
    # Sort deterministically by kode_aset for tie breaks
    assets_with_geom.sort(key=lambda x: str(x.get('kode_aset', '')))

    matched_reports = []

    for rep in reports:
        id_laporan = rep['id_laporan']
        norm_nom = rep.get('nomenklatur_normalized')
        rep_geom = rep.get('geom')

        matched_asset = None
        matching_method = None
        matching_distance_m = None

        # 1. Exact match on normalized nomenclature
        if norm_nom and norm_nom in nom_to_assets:
            matched_asset = nom_to_assets[norm_nom][0]
            matching_method = "nomenklatur"
            matching_distance_m = 0.0

        # 2. Fallback to nearest asset within 30 meters
        elif rep_geom is not None and not rep_geom.is_empty and assets_with_geom:
            min_dist = float('inf')
            best_asset = None

            for a in assets_with_geom:
                d = calculate_distance_meters(rep_geom, a['geom'])
                if d < min_dist:
                    min_dist = d
                    best_asset = a

            if min_dist <= 30.0 and best_asset is not None:
                matched_asset = best_asset
                matching_method = "nearest_30m"
                matching_distance_m = round(min_dist, 3)

        # 3. If no match exists
        if matched_asset is not None:
            rep['asset_id'] = matched_asset.get('id')
            rep['matching_method'] = matching_method
            rep['matching_distance_m'] = matching_distance_m
        else:
            rep['asset_id'] = None
            rep['matching_method'] = "unmatched"
            rep['matching_distance_m'] = None

            quality_findings.append({
                "source_file": source_filename,
                "source_record_id": id_laporan,
                "category": "laporan_tanpa_aset",
                "problem": f"Laporan {id_laporan} tidak menemukan aset yang cocok via nomenklatur maupun radius 30m",
                "action_taken": "Laporan tetap disimpan tanpa tautan aset dan ditandai laporan_tanpa_aset",
                "raw_value": rep['raw_payload'],
                "normalized_value": {"id_laporan": id_laporan}
            })

        matched_reports.append(rep)

    return matched_reports, quality_findings
