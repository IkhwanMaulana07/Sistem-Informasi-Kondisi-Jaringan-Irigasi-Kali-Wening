import math
from typing import Optional, Tuple, List, Dict, Any
from pyproj import Transformer
from shapely.geometry import Point, LineString, Polygon, MultiPolygon
from shapely.ops import transform
import shapely

# Transformers
# WGS84 is EPSG:4326 (lon, lat)
# UTM Zone 49S is EPSG:32749 (easting X, northing Y)
utm_to_wgs = Transformer.from_crs(32749, 4326, always_xy=True)
wgs_to_utm = Transformer.from_crs(4326, 32749, always_xy=True)


def parse_coord(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if val != val:  # NaN
            return None
        return float(val)
    s = str(val).strip().replace(',', '.')
    if not s or s.upper() in ["NAN", "NONE", "NULL", "-", ""]:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def detect_and_normalize_point(
    c1_val: Any, 
    c2_val: Any, 
    source_is_lat_lon: bool = False
) -> Tuple[Optional[Point], List[str], Dict[str, Any]]:
    """
    Detects CRS and axis order for a 2D point (x/y or lat/lon).
    Returns (wgs84_point, quality_tags, metadata).
    Quality tags may include:
      - 'koordinat_tertukar_dibetulkan'
      - 'koordinat_utm_dikonversi'
      - 'koordinat_tidak_valid'
    """
    c1 = parse_coord(c1_val)
    c2 = parse_coord(c2_val)
    tags: List[str] = []
    meta: Dict[str, Any] = {"raw_c1": c1_val, "raw_c2": c2_val}

    if c1 is None or c2 is None or (c1 == 0 and c2 == 0):
        tags.append("koordinat_tidak_valid")
        return None, tags, meta

    # In DI Kali Wening / Central Java region:
    # WGS84: Longitude ~ 109.0 to 112.5 E, Latitude ~ -8.5 to -6.5 S
    # UTM 49S: Easting ~ 300,000 to 600,000 m, Northing ~ 9,000,000 to 9,300,000 m

    # Check WGS84 degrees
    is_c1_deg = (-90 <= c1 <= 180) and not (300000 <= c1 <= 10000000)
    is_c2_deg = (-90 <= c2 <= 180) and not (300000 <= c2 <= 10000000)

    if is_c1_deg and is_c2_deg:
        # Check if swapped: c1 is lat (~ -7.6) and c2 is lon (~ 110.4)
        if (-8.5 <= c1 <= -6.5) and (109.0 <= c2 <= 112.5):
            lon, lat = c2, c1
            tags.append("koordinat_tertukar_dibetulkan")
        elif (109.0 <= c1 <= 112.5) and (-8.5 <= c2 <= -6.5):
            lon, lat = c1, c2
        else:
            # Check if source explicitly claimed lat, lon
            if source_is_lat_lon:
                lat, lon = c1, c2
                if not (109.0 <= lon <= 112.5 and -8.5 <= lat <= -6.5):
                    # Could lat and lon be swapped in the file?
                    if 109.0 <= lat <= 112.5 and -8.5 <= lon <= -6.5:
                        lon, lat = lat, lon
                        tags.append("koordinat_tertukar_dibetulkan")
            else:
                lon, lat = c1, c2
        
        # Verify plausible WGS84 bounds
        if not (-8.5 <= lat <= -6.5 and 109.0 <= lon <= 112.5):
            tags.append("koordinat_tidak_valid")
            return None, tags, meta
            
        pt = Point(lon, lat)
        return pt, tags, meta

    # Check UTM 49S meters
    # Normal UTM: c1 is Easting X (~430,000), c2 is Northing Y (~9,150,000)
    # Swapped UTM: c1 is Northing Y (~9,150,000), c2 is Easting X (~430,000)
    if (9000000 <= c1 <= 9300000) and (300000 <= c2 <= 600000):
        # Swapped UTM
        tags.append("koordinat_tertukar_dibetulkan")
        tags.append("koordinat_utm_dikonversi")
        easting, northing = c2, c1
        lon, lat = utm_to_wgs.transform(easting, northing)
        pt = Point(lon, lat)
        return pt, tags, meta

    elif (300000 <= c1 <= 600000) and (9000000 <= c2 <= 9300000):
        # Normal UTM
        tags.append("koordinat_utm_dikonversi")
        easting, northing = c1, c2
        lon, lat = utm_to_wgs.transform(easting, northing)
        pt = Point(lon, lat)
        return pt, tags, meta

    # If neither WGS84 nor UTM 49S
    tags.append("koordinat_tidak_valid")
    return None, tags, meta


def transform_geometry_to_wgs84(geom) -> Tuple[Any, List[str]]:
    """
    Inspects geometry coordinates. If UTM 49S or swapped, transforms to EPSG:4326.
    Returns (wgs84_geom, tags).
    """
    if geom is None or geom.is_empty:
        return None, ["geometri_diperbaiki"]
    
    tags = []
    # Sample a coordinate to test CRS
    sample_pt = None
    if geom.geom_type == 'Point':
        sample_pt = (geom.x, geom.y)
    elif geom.geom_type in ['LineString', 'LinearRing']:
        sample_pt = geom.coords[0]
    elif geom.geom_type == 'Polygon':
        sample_pt = geom.exterior.coords[0]
    elif geom.geom_type == 'MultiPolygon':
        sample_pt = geom.geoms[0].exterior.coords[0]
    elif geom.geom_type == 'MultiLineString':
        sample_pt = geom.geoms[0].coords[0]
        
    if sample_pt is None:
        return None, ["geometri_diperbaiki"]

    c1, c2 = sample_pt[0], sample_pt[1]
    
    # Check if UTM 49S
    is_utm = (300000 <= c1 <= 600000 and 9000000 <= c2 <= 9300000)
    is_swapped_utm = (9000000 <= c1 <= 9300000 and 300000 <= c2 <= 600000)
    is_swapped_wgs = (-8.5 <= c1 <= -6.5 and 109.0 <= c2 <= 112.5)

    if is_utm:
        tags.append("koordinat_utm_dikonversi")
        transformed = transform(utm_to_wgs.transform, geom)
        return transformed, tags
    elif is_swapped_utm:
        tags.append("koordinat_tertukar_dibetulkan")
        tags.append("koordinat_utm_dikonversi")
        # Swap x and y
        swapped = transform(lambda x, y: (y, x), geom)
        transformed = transform(utm_to_wgs.transform, swapped)
        return transformed, tags
    elif is_swapped_wgs:
        tags.append("koordinat_tertukar_dibetulkan")
        swapped = transform(lambda x, y: (y, x), geom)
        return swapped, tags
    else:
        # Assumed WGS84
        return geom, tags


def to_utm49s(geom):
    """Transforms geometry from EPSG:4326 to EPSG:32749 (metric UTM 49S)"""
    if geom is None or geom.is_empty:
        return None
    return transform(wgs_to_utm.transform, geom)


def to_wgs84(geom):
    """Transforms geometry from EPSG:32749 to EPSG:4326"""
    if geom is None or geom.is_empty:
        return None
    return transform(utm_to_wgs.transform, geom)


def calculate_length_meters(geom_wgs84) -> float:
    """Calculates length of LineString in meters using EPSG:32749"""
    if geom_wgs84 is None or geom_wgs84.is_empty:
        return 0.0
    geom_utm = to_utm49s(geom_wgs84)
    return float(geom_utm.length)


def calculate_area_ha(geom_wgs84) -> float:
    """Calculates area of Polygon/MultiPolygon in hectares using EPSG:32749"""
    if geom_wgs84 is None or geom_wgs84.is_empty:
        return 0.0
    geom_utm = to_utm49s(geom_wgs84)
    area_m2 = float(geom_utm.area)
    return area_m2 / 10000.0


def calculate_distance_meters(geom_wgs84_a, geom_wgs84_b) -> float:
    """Calculates distance between two geometries in meters using EPSG:32749"""
    if geom_wgs84_a is None or geom_wgs84_b is None:
        return float('inf')
    utm_a = to_utm49s(geom_wgs84_a)
    utm_b = to_utm49s(geom_wgs84_b)
    return float(utm_a.distance(utm_b))
