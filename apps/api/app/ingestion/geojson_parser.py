import json
from typing import List, Dict, Any, Tuple
from shapely.geometry import shape, LineString, Polygon, MultiPolygon
from app.normalization.condition import normalize_condition
from app.normalization.canal_level import normalize_canal_level
from app.normalization.nomenclature import normalize_nomenclature
from app.geospatial.crs import (
    transform_geometry_to_wgs84,
    to_utm49s,
    calculate_length_meters,
)
from app.geospatial.geometry_repair import (
    repair_polygon_geometry,
    get_canonical_line_hash,
    process_plot_area,
)


def parse_canals_geojson(file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses saluran.geojson.
    Normalizes level and condition, transforms coordinates to WGS84,
    deduplicates identical canal geometries independent of digitizing direction,
    and calculates metric length in EPSG:32749.
    """
    with open(file_path, mode='r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    quality_findings = []
    seen_hashes: Dict[str, Dict[str, Any]] = {}
    cleaned_canals = []

    for idx, feat in enumerate(features, start=1):
        props = feat.get('properties', {})
        id_ruas = props.get('id_ruas') or f"R-{idx}"
        raw_geom = shape(feat.get('geometry', {}))

        # Transform to WGS84
        geom_wgs, coord_tags = transform_geometry_to_wgs84(raw_geom)
        
        for tag in coord_tags:
            action_desc = "Koreksi koordinat ruas saluran"
            prob_desc = f"Koordinat ruas {id_ruas}"
            if tag == "koordinat_utm_dikonversi":
                action_desc = "Dikonversi dari UTM 49S ke WGS84"
                prob_desc = "Geometri saluran tercatat dalam format UTM 49S"
            elif tag == "koordinat_tertukar_dibetulkan":
                action_desc = "Urutan sumbu lat/lon ditukar ke posisi yang benar"
                prob_desc = "Koordinat latitude dan longitude ruas saluran tertukar"
            elif tag == "geometri_diperbaiki":
                action_desc = "Geometri diperbaiki"
                prob_desc = "Geometri saluran tidak valid atau kosong"

            quality_findings.append({
                "source_file": "saluran.geojson",
                "source_record_id": str(id_ruas),
                "category": tag,
                "problem": prob_desc,
                "action_taken": action_desc,
                "raw_value": props,
                "normalized_value": {"id_ruas": id_ruas}
            })

        if geom_wgs is None or geom_wgs.is_empty:
            continue

        raw_level = props.get('tingkat')
        norm_level, _ = normalize_canal_level(raw_level)

        raw_cond = props.get('kondisi')
        norm_cond, _ = normalize_condition(raw_cond)

        # Ensure LineString geometry
        if geom_wgs.geom_type != 'LineString':
            if geom_wgs.geom_type == 'MultiLineString':
                geom_wgs = list(geom_wgs.geoms)[0]

        # Calculate canonical hash for deduplication
        geom_hash = get_canonical_line_hash(geom_wgs)

        length_m = calculate_length_meters(geom_wgs)

        canal_record = {
            "id": id_ruas,
            "id_ruas": id_ruas,
            "nama_saluran": props.get('nama_saluran'),
            "tingkat": norm_level,
            "kondisi": norm_cond,
            "geom": geom_wgs,
            "geom_wgs": geom_wgs,
            "geom_utm": to_utm49s(geom_wgs),
            "length_m": round(length_m, 3),
            "source_file": "saluran.geojson",
            "source_feature_id": str(props.get('id', idx)),
            "canonical_geometry_hash": geom_hash,
            "raw_properties": props
        }

        if geom_hash in seen_hashes:
            # Duplicate canal segment found
            existing = seen_hashes[geom_hash]
            quality_findings.append({
                "source_file": "saluran.geojson",
                "source_record_id": str(id_ruas),
                "category": "ruas_ganda",
                "problem": f"Ruas saluran memiliki geometri yang sama dengan ruas {existing['id_ruas']}",
                "action_taken": f"Dibuang karena duplikat dari {existing['id_ruas']}",
                "raw_value": props,
                "normalized_value": {"kept_id_ruas": existing['id_ruas']}
            })
        else:
            seen_hashes[geom_hash] = canal_record
            cleaned_canals.append(canal_record)

    return cleaned_canals, quality_findings


def parse_plots_geojson(file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Parses petak_tersier.geojson.
    Repairs polygon geometries, converts coordinates to WGS84,
    handles unit detection for luas_baku (m^2 vs ha), checks 20% area discrepancy,
    and deduplicates by kode_petak.
    """
    with open(file_path, mode='r', encoding='utf-8') as f:
        data = json.load(f)

    features = data.get('features', [])
    quality_findings = []
    seen_plot_codes: Dict[str, Dict[str, Any]] = {}
    cleaned_plots = []

    for idx, feat in enumerate(features, start=1):
        props = feat.get('properties', {})
        kode_petak = str(props.get('kode_petak', '')).strip() or f"P-{idx}"
        raw_geom = shape(feat.get('geometry', {}))

        # Transform coordinates to WGS84
        geom_wgs, coord_tags = transform_geometry_to_wgs84(raw_geom)
        for tag in coord_tags:
            action_desc = "Koreksi koordinat petak"
            prob_desc = f"Koordinat petak {kode_petak}"
            if tag == "koordinat_utm_dikonversi":
                action_desc = "Dikonversi dari UTM 49S ke WGS84"
                prob_desc = "Geometri petak tersier tercatat dalam format UTM 49S"
            elif tag == "koordinat_tertukar_dibetulkan":
                action_desc = "Urutan sumbu lat/lon ditukar ke posisi yang benar"
                prob_desc = "Koordinat petak tersier tertukar"

            quality_findings.append({
                "source_file": "petak_tersier.geojson",
                "source_record_id": kode_petak,
                "category": tag,
                "problem": prob_desc,
                "action_taken": action_desc,
                "raw_value": props,
                "normalized_value": {"kode_petak": kode_petak}
            })

        # Repair polygon geometry if needed
        repaired_geom, repair_tags = repair_polygon_geometry(geom_wgs)
        for tag in repair_tags:
            quality_findings.append({
                "source_file": "petak_tersier.geojson",
                "source_record_id": kode_petak,
                "category": tag,
                "problem": "Geometri poligon petak tidak valid atau mengalami self-intersection",
                "action_taken": "Geometri poligon diperbaiki menjadi MultiPolygon valid",
                "raw_value": props,
                "normalized_value": {"kode_petak": kode_petak}
            })

        has_valid_geom = repaired_geom is not None and not repaired_geom.is_empty

        # Process plot area (m^2 vs ha detection and 20% discrepancy rule)
        raw_luas = props.get('luas_baku')
        final_luas_ha, unit_detected, area_tags = process_plot_area(raw_luas, repaired_geom)

        for tag in area_tags:
            if tag == "luas_tidak_wajar":
                quality_findings.append({
                    "source_file": "petak_tersier.geojson",
                    "source_record_id": kode_petak,
                    "category": tag,
                    "problem": f"Luas atribut ({raw_luas}) berselisih >20% dengan luas geometri ({final_luas_ha:.2f} ha)",
                    "action_taken": f"Menggunakan luas hasil perhitungan geometri {final_luas_ha:.2f} ha",
                    "raw_value": {"luas_baku_raw": raw_luas},
                    "normalized_value": {"luas_ha": final_luas_ha}
                })

        raw_sadap = props.get('nomenklatur_sadap')
        norm_sadap, _ = normalize_nomenclature(raw_sadap)

        plot_record = {
            "kode_petak": kode_petak,
            "nama_petak": props.get('nama_petak'),
            "luas_baku_raw": str(raw_luas) if raw_luas is not None else None,
            "luas_baku_unit_detected": unit_detected,
            "luas_ha": final_luas_ha,
            "nomenklatur_sadap_raw": raw_sadap,
            "nomenklatur_sadap_normalized": norm_sadap,
            "geom": repaired_geom,
            "has_valid_geometry": has_valid_geom,
            "source_file": "petak_tersier.geojson",
            "source_feature_id": str(props.get('id', idx)),
            "raw_properties": props
        }

        # Deduplicate by kode_petak
        if kode_petak in seen_plot_codes:
            existing = seen_plot_codes[kode_petak]
            quality_findings.append({
                "source_file": "petak_tersier.geojson",
                "source_record_id": kode_petak,
                "category": "petak_ganda",
                "problem": f"Petak ganda dengan kode {kode_petak}",
                "action_taken": f"Menyimpan satu petak dan membuang fitur duplikat",
                "raw_value": props,
                "normalized_value": {"kept_feature_id": existing['source_feature_id']}
            })
        else:
            seen_plot_codes[kode_petak] = plot_record
            cleaned_plots.append(plot_record)

    return cleaned_plots, quality_findings
