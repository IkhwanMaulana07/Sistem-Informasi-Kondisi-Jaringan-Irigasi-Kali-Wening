from typing import Optional, Tuple


def normalize_canal_level(val: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalizes canal level to 'primer' or 'sekunder'.
    """
    if val is None:
        return None, "empty"
    
    s = str(val).strip().lower()
    if "primer" in s or s == "p":
        return "primer", None
    elif "sekunder" in s or s == "s":
        return "sekunder", None
    
    return None, f"Unknown canal level '{val}'"
