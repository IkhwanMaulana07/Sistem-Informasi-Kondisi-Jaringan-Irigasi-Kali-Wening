from typing import Optional, Tuple

ASSET_TYPE_MAP = {
    # bendung
    "bendung": "bendung",
    "dam": "bendung",
    "weir": "bendung",
    "intake": "bendung",
    # bangunan_bagi
    "bangunan bagi": "bangunan_bagi",
    "bangunan_bagi": "bangunan_bagi",
    "bagi": "bangunan_bagi",
    # bangunan_sadap
    "bangunan sadap": "bangunan_sadap",
    "bangunan_sadap": "bangunan_sadap",
    "sadap": "bangunan_sadap",
    # bangunan_bagi_sadap
    "bangunan bagi-sadap": "bangunan_bagi_sadap",
    "bangunan bagi sadap": "bangunan_bagi_sadap",
    "bangunan_bagi_sadap": "bangunan_bagi_sadap",
    "bagi-sadap": "bangunan_bagi_sadap",
    "bagi_sadap": "bangunan_bagi_sadap",
    "bagisadap": "bangunan_bagi_sadap",
    # bangunan_pelengkap
    "bangunan pelengkap": "bangunan_pelengkap",
    "bangunan_pelengkap": "bangunan_pelengkap",
    "pelengkap": "bangunan_pelengkap",
    "talang": "bangunan_pelengkap",
    "aqueduct": "bangunan_pelengkap",
    "gorong-gorong": "bangunan_pelengkap",
    "gorong gorong": "bangunan_pelengkap",
    "gorong_gorong": "bangunan_pelengkap",
    "culvert": "bangunan_pelengkap",
    "siphon": "bangunan_pelengkap",
    "sifon": "bangunan_pelengkap",
    "terjunan": "bangunan_pelengkap",
    "drop structure": "bangunan_pelengkap",
}


def normalize_asset_type(val: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalizes asset type string to one of the 5 canonical values:
    'bendung', 'bangunan_bagi', 'bangunan_sadap', 'bangunan_bagi_sadap', 'bangunan_pelengkap'.
    """
    if val is None:
        return None, "empty"
    
    s = str(val).strip().lower()
    if not s or s in ["nan", "none", "null", "-", ""]:
        return None, "empty"
    
    s_clean = " ".join(s.replace("-", " ").replace("_", " ").split())
    if s in ASSET_TYPE_MAP:
        return ASSET_TYPE_MAP[s], None
    if s_clean in ASSET_TYPE_MAP:
        return ASSET_TYPE_MAP[s_clean], None
    
    return None, f"Unknown asset type '{val}'"
