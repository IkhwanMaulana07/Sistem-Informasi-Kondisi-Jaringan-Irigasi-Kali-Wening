from typing import Optional, Tuple

CONDITION_MAP = {
    # baik
    "b": "baik",
    "baik": "baik",
    "good": "baik",
    # rusak_ringan
    "rr": "rusak_ringan",
    "rusak ringan": "rusak_ringan",
    "rusak-ringan": "rusak_ringan",
    "rusak_ringan": "rusak_ringan",
    "ringan": "rusak_ringan",
    # rusak_sedang
    "rs": "rusak_sedang",
    "rusak sedang": "rusak_sedang",
    "rusak-sedang": "rusak_sedang",
    "rusak_sedang": "rusak_sedang",
    "sedang": "rusak_sedang",
    # rusak_berat
    "rb": "rusak_berat",
    "rusak berat": "rusak_berat",
    "rusak-berat": "rusak_berat",
    "rusak_berat": "rusak_berat",
    "berat": "rusak_berat",
}

CONDITION_WEIGHTS = {
    "baik": 0,
    "rusak_ringan": 1,
    "rusak_sedang": 2,
    "rusak_berat": 4,
}


def normalize_condition(val: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalizes condition string to one of the 4 canonical values:
    'baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat'.
    Returns (canonical_value, error_reason).
    """
    if val is None:
        return None, "empty"
    
    s = str(val).strip().lower()
    if not s or s in ["nan", "none", "null", "-", ""]:
        return None, "empty"
    
    # Normalize multiple whitespace and dashes
    s_clean = " ".join(s.replace("-", " ").replace("_", " ").split())
    if s in CONDITION_MAP:
        return CONDITION_MAP[s], None
    if s_clean in CONDITION_MAP:
        return CONDITION_MAP[s_clean], None
    
    return None, f"Unknown condition value '{val}'"
