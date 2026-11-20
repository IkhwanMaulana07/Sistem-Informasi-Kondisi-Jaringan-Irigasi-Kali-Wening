from typing import List, Dict, Any
from app.normalization.condition import CONDITION_WEIGHTS


def calculate_maintenance_priority(
    assets_with_impact: List[Dict[str, Any]],
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Calculates maintenance priority:
    - score = weight(current_condition) * downstream_affected_area_ha
    - Displays only scores > 0
    - Sorted by score DESC, then kode_aset ASC
    - Ranking: 1, 2, 3...
    - Returns up to limit items
    """
    scored_items = []
    
    for a in assets_with_impact:
        kode_aset = a.get('kode_aset')
        kondisi = a.get('condition_current')
        luas_ha = float(a.get('luas_terdampak_ha', 0.0))
        weight = CONDITION_WEIGHTS.get(kondisi, 0)
        
        score = round(weight * luas_ha, 2)
        if score > 0:
            scored_items.append({
                "kode_aset": kode_aset,
                "kondisi": kondisi,
                "luas_terdampak_ha": luas_ha,
                "skor": score
            })

    # Sort score DESC, kode_aset ASC
    scored_items.sort(key=lambda x: (-x['skor'], x['kode_aset']))

    # Assign rankings and apply limit
    results = []
    for rank, item in enumerate(scored_items[:limit], start=1):
        results.append({
            "peringkat": rank,
            "kode_aset": item['kode_aset'],
            "kondisi": item['kondisi'],
            "luas_terdampak_ha": item['luas_terdampak_ha'],
            "skor": item['skor']
        })

    return results
