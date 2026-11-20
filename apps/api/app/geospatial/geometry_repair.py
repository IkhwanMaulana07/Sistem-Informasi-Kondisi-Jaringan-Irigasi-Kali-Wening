import hashlib
from typing import Optional, Tuple, List, Dict, Any
from shapely.geometry import Polygon, MultiPolygon, LineString
from shapely.validation import make_valid
from app.geospatial.crs import calculate_area_ha, to_utm49s


def repair_polygon_geometry(geom) -> Tuple[Optional[MultiPolygon], List[str]]:
    """
    Validates and repairs polygon geometry. Ensures returned geometry is MultiPolygon in WGS84.
    Tags 'geometri_diperbaiki' if repair was performed.
    """
    if geom is None or geom.is_empty:
        return None, []
    
    tags = []
    repaired = geom
    
    if not geom.is_valid:
        tags.append("geometri_diperbaiki")
        try:
            repaired = make_valid(geom)
        except Exception:
            try:
                repaired = geom.buffer(0)
            except Exception:
                return None, ["geometri_diperbaiki"]
    
    # If buffer or make_valid changed geometry
    if repaired.geom_type == 'Polygon':
        return MultiPolygon([repaired]), tags
    elif repaired.geom_type == 'MultiPolygon':
        return repaired, tags
    elif repaired.geom_type == 'GeometryCollection':
        tags.append("geometri_diperbaiki")
        polys = [g for g in repaired.geoms if g.geom_type in ['Polygon', 'MultiPolygon']]
        if not polys:
            return None, tags
        extracted = []
        for p in polys:
            if p.geom_type == 'Polygon':
                extracted.append(p)
            elif p.geom_type == 'MultiPolygon':
                extracted.extend(p.geoms)
        return MultiPolygon(extracted), tags
    
    return None, ["geometri_diperbaiki"]


def get_canonical_line_hash(geom: LineString, precision: int = 5) -> str:
    """
    Calculates a hash for a LineString independent of digitizing direction (forward or backward).
    Coordinates are rounded to given decimal precision.
    """
    if geom is None or geom.is_empty:
        return ""
    
    coords = [(round(p[0], precision), round(p[1], precision)) for p in geom.coords]
    rev_coords = list(reversed(coords))
    
    # Lexicographical comparison to pick canonical direction
    canonical = min(coords, rev_coords)
    coord_str = ";".join(f"{x:.{precision}f},{y:.{precision}f}" for x, y in canonical)
    return hashlib.sha256(coord_str.encode('utf-8')).hexdigest()


def process_plot_area(
    raw_luas_str: Optional[str], 
    geom_wgs84: Any
) -> Tuple[float, str, List[str]]:
    """
    Calculates plot area in hectares, detects whether raw attribute was in m^2 or ha,
    checks for 20% discrepancy against geometric area in EPSG:32749,
    and returns (final_luas_ha, unit_detected, tags).
    """
    tags = []
    geom_ha = calculate_area_ha(geom_wgs84)
    
    if not raw_luas_str:
        # No attribute value, fallback to geometry area
        return round(geom_ha, 4), "ha", tags
    
    cleaned = str(raw_luas_str).strip().replace(',', '.')
    try:
        val = float(cleaned)
    except ValueError:
        return round(geom_ha, 4), "ha", tags
    
    # Detect if raw value is in m^2 or ha:
    # 1 ha = 10,000 m^2
    # If val is roughly > 1000 and within order of magnitude of geom area in m^2:
    geom_m2 = geom_ha * 10000.0
    
    unit_detected = "ha"
    attr_ha = val
    
    # If val is large (> 500) and much closer to geom_m2 than geom_ha:
    if val > 500 and geom_m2 > 0 and (abs(val - geom_m2) / geom_m2 < 0.5):
        unit_detected = "m2"
        attr_ha = val / 10000.0
    
    # Now compare attr_ha vs geom_ha
    if geom_ha > 0:
        discrepancy = abs(attr_ha - geom_ha) / geom_ha
        if discrepancy > 0.20:
            # More than 20% discrepancy: use geometric area and tag luas_tidak_wajar
            tags.append("luas_tidak_wajar")
            return round(geom_ha, 4), unit_detected, tags
            
    return round(attr_ha, 4), unit_detected, tags
