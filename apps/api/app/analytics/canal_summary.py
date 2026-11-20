from typing import List, Dict, Any
from collections import defaultdict


def generate_canal_summary(canals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Summarizes canal length by level and condition:
    Grouped by (tingkat, kondisi), length in km rounded to 2 decimal places.
    """
    # Group lengths in meters
    grouped = defaultdict(float)
    
    for c in canals:
        tingkat = c.get('tingkat')
        kondisi = c.get('kondisi')
        length_m = float(c.get('length_m', 0.0))
        if tingkat and kondisi:
            grouped[(tingkat, kondisi)] += length_m

    # Format result list
    result = []
    # Pre-defined order for clean presentation
    order_levels = ['primer', 'sekunder']
    order_conditions = ['baik', 'rusak_ringan', 'rusak_sedang', 'rusak_berat']

    for lvl in order_levels:
        for cond in order_conditions:
            if (lvl, cond) in grouped:
                length_km = round(grouped[(lvl, cond)] / 1000.0, 2)
                result.append({
                    "tingkat": lvl,
                    "kondisi": cond,
                    "panjang_km": length_km
                })

    # Catch any remaining groups
    for (lvl, cond), length_m in grouped.items():
        if lvl not in order_levels or cond not in order_conditions:
            result.append({
                "tingkat": lvl,
                "kondisi": cond,
                "panjang_km": round(length_m / 1000.0, 2)
            })

    return result
