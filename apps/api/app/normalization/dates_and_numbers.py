import re
from datetime import datetime, date
from typing import Optional, Tuple, Union, Any

INDONESIAN_MONTHS = {
    "januari": 1, "jan": 1,
    "februari": 2, "feb": 2,
    "maret": 3, "mar": 3,
    "april": 4, "apr": 4,
    "mei": 5, "may": 5,
    "juni": 6, "jun": 6,
    "juli": 7, "jul": 7,
    "agustus": 8, "agt": 8, "agu": 8,
    "september": 9, "sep": 9,
    "oktober": 10, "okt": 10,
    "november": 11, "nov": 11,
    "desember": 12, "des": 12
}


def parse_date(val: Any) -> Tuple[Optional[date], Optional[str]]:
    """
    Parses ambiguous date formats into python date object with day-first priority.
    Handles Indonesian month names, ISO formats, slashes, dashes, timestamps.
    """
    if val is None:
        return None, "empty"
    
    if isinstance(val, (datetime, date)):
        return (val.date() if isinstance(val, datetime) else val), None
    
    s = str(val).strip()
    if not s or s.upper() in ["NAN", "NONE", "NULL", "-", ""]:
        return None, "empty"
    
    # Try textual month names, e.g. "11 Oktober 2026" or "14-Agustus-2026"
    for m_name, m_num in INDONESIAN_MONTHS.items():
        if m_name in s.lower():
            # Match regex e.g. (\d{1,2})\s*(?:-|/|\s+)([a-zA-Z]+)(?:-|/|\s+)(\d{4})
            m = re.search(rf'(\d{{1,2}})\s*(?:-|/|\s+){m_name}(?:-|/|\s+)(\d{{4}})', s, re.IGNORECASE)
            if m:
                d_day, d_year = int(m.group(1)), int(m.group(2))
                try:
                    return date(d_year, m_num, d_day), None
                except ValueError as e:
                    return None, f"Invalid date: {e}"
    
    # Clean time portion if present, e.g. "2026-10-11 00:00:00"
    s_date = s.split()[0]
    
    # Check ISO format YYYY-MM-DD
    iso_match = re.match(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$', s_date)
    if iso_match:
        y, m, d = int(iso_match.group(1)), int(iso_match.group(2)), int(iso_match.group(3))
        try:
            return date(y, m, d), None
        except ValueError as e:
            return None, f"Invalid date: {e}"
    
    # Check Day-first format DD-MM-YYYY or D/M/YYYY
    dmy_match = re.match(r'^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$', s_date)
    if dmy_match:
        d, m, y = int(dmy_match.group(1)), int(dmy_match.group(2)), int(dmy_match.group(3))
        try:
            return date(y, m, d), None
        except ValueError as e:
            return None, f"Invalid date: {e}"
    
    # Fallback try strptime formats
    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d", "%d-%b-%Y"]:
        try:
            return datetime.strptime(s_date, fmt).date(), None
        except ValueError:
            pass
            
    return None, f"Cannot parse date '{val}'"


def parse_float(val: Any) -> Tuple[Optional[float], Optional[str]]:
    """
    Parses numeric float supporting comma decimals.
    """
    if val is None:
        return None, "empty"
    
    if isinstance(val, (int, float)):
        if val != val:  # NaN
            return None, "empty"
        return float(val), None
    
    s = str(val).strip().replace(',', '.')
    if not s or s.upper() in ["NAN", "NONE", "NULL", "-", ""]:
        return None, "empty"
    
    try:
        return float(s), None
    except ValueError:
        return None, f"Cannot parse float '{val}'"


def parse_int(val: Any) -> Tuple[Optional[int], Optional[str]]:
    """
    Parses integer value.
    """
    f, err = parse_float(val)
    if f is None:
        return None, err
    return int(round(f)), None
