import re
from typing import Optional, Tuple


def normalize_nomenclature(val: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Normalizes irrigation structure nomenclature into canonical format 'B.KW.1'
    with uppercase letters, dot separators, and uppercase letter suffixes (e.g. 'B.KW.6A').
    Returns (normalized_value, note_or_issue).
    """
    if val is None:
        return None, "empty"
    
    raw = str(val).strip()
    if not raw or raw.upper() in ["NAN", "NONE", "NULL", "-", ""]:
        return None, "empty"
    
    s = raw.upper()
    
    # Check standard irrigation pattern: (B|BD) + canal_code (2-3 chars) + number + optional suffix letter
    m = re.match(r'^(BD|B)[._\s-]*([A-Z]{2,3})[._\s-]*(\d+)[._\s-]*([A-Z]?)$', s)
    if m:
        prefix, canal, num, suffix = m.groups()
        return f"{prefix}.{canal}.{num}{suffix}", None
    
    # Without B prefix, e.g. KW.1 or KW 1
    m2 = re.match(r'^([A-Z]{2,3})[._\s-]*(\d+)[._\s-]*([A-Z]?)$', s)
    if m2:
        canal, num, suffix = m2.groups()
        return f"B.{canal}.{num}{suffix}", None
    
    # Check if starts with B followed by digits (e.g. B1)
    m3 = re.match(r'^(BD|B)[._\s-]*(\d+)[._\s-]*([A-Z]?)$', s)
    if m3:
        prefix, num, suffix = m3.groups()
        return f"{prefix}.{num}{suffix}", None
    
    # Generic normalization: replace any sequence of space/dash/underscore with dots
    cleaned = re.sub(r'[_\s-]+', '.', s)
    return cleaned, None
