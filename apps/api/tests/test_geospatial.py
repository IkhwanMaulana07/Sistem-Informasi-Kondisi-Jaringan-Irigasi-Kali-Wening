import pytest
from shapely.geometry import Point, LineString, Polygon
from app.geospatial.crs import (
    detect_and_normalize_point,
    transform_geometry_to_wgs84,
    calculate_length_meters,
    calculate_area_ha,
    calculate_distance_meters,
)
from app.geospatial.geometry_repair import (
    repair_polygon_geometry,
    get_canonical_line_hash,
    process_plot_area,
)


def test_coordinate_crs_and_swap():
    # Normal WGS84
    pt, tags, _ = detect_and_normalize_point(110.412, -7.654)
    assert pt is not None
    assert abs(pt.x - 110.412) < 1e-4
    assert abs(pt.y - -7.654) < 1e-4
    assert "koordinat_tertukar_dibetulkan" not in tags

    # Swapped WGS84: c1 is lat (-7.654), c2 is lon (110.412)
    pt_swapped, tags_swapped, _ = detect_and_normalize_point(-7.654, 110.412)
    assert pt_swapped is not None
    assert abs(pt_swapped.x - 110.412) < 1e-4
    assert abs(pt_swapped.y - -7.654) < 1e-4
    assert "koordinat_tertukar_dibetulkan" in tags_swapped

    # UTM 49S normal: 430002.82, 9155998.98
    pt_utm, tags_utm, _ = detect_and_normalize_point(430002.82, 9155998.98)
    assert pt_utm is not None
    assert 109.0 <= pt_utm.x <= 112.5
    assert -8.5 <= pt_utm.y <= -6.5
    assert "koordinat_utm_dikonversi" in tags_utm


def test_canonical_line_hash_direction_independence():
    # Line digitized A -> B vs B -> A
    line_fwd = LineString([(110.38, -7.64), (110.39, -7.65), (110.40, -7.66)])
    line_rev = LineString([(110.40, -7.66), (110.39, -7.65), (110.38, -7.64)])

    hash_fwd = get_canonical_line_hash(line_fwd)
    hash_rev = get_canonical_line_hash(line_rev)

    assert hash_fwd != ""
    assert hash_fwd == hash_rev


def test_polygon_repair_invalid():
    # Bowtie / self-intersecting polygon
    bowtie = Polygon([(0, 0), (2, 2), (2, 0), (0, 2), (0, 0)])
    assert not bowtie.is_valid

    repaired, tags = repair_polygon_geometry(bowtie)
    assert repaired is not None
    assert repaired.is_valid
    assert "geometri_diperbaiki" in tags


def test_plot_area_discrepancy_threshold():
    # Square 1000m x 1000m in UTM = 1,000,000 m^2 = 100 ha
    # In WGS84 approx ~ 0.009 degrees
    poly_wgs = Polygon([
        (110.40, -7.65),
        (110.409, -7.65),
        (110.409, -7.659),
        (110.40, -7.659),
        (110.40, -7.65)
    ])
    geom_ha = calculate_area_ha(poly_wgs)
    assert geom_ha > 0

    # Case 1: Attribute within 10% discrepancy (e.g. geom_ha is 120, attr is 125)
    close_val = f"{geom_ha * 1.05:.2f}".replace('.', ',')
    final_ha, _, tags = process_plot_area(close_val, poly_wgs)
    assert "luas_tidak_wajar" not in tags

    # Case 2: Attribute discrepancy > 20% (e.g. 50% larger)
    far_val = f"{geom_ha * 1.5:.2f}".replace('.', ',')
    final_ha_bad, _, tags_bad = process_plot_area(far_val, poly_wgs)
    assert "luas_tidak_wajar" in tags_bad
    # Must use geometric area
    assert abs(final_ha_bad - geom_ha) < 0.01
