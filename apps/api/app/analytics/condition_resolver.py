from datetime import date
from typing import Optional, List, Dict, Tuple, Any
from app.normalization.condition import normalize_condition


def resolve_asset_current_condition(
    condition_inventory: Optional[str],
    tgl_update: Optional[date],
    reports: List[Dict[str, Any]]
) -> Tuple[Optional[str], Optional[date]]:
    """
    Determines current condition and tgl_kondisi for an asset:
    1. Compares inventory condition at tgl_update with active matching reports.
    2. Latest date wins.
    3. If dates are identical, report wins.
    4. Cancelled reports (status == 'batal') are ignored.
    5. If neither exists, returns (None, None).
    """
    # Filter active reports with valid dates
    active_reports = [
        r for r in reports 
        if r.get('status') == 'aktif' and r.get('tanggal') is not None and r.get('kondisi') is not None
    ]
    
    # Sort active reports by date descending
    active_reports.sort(key=lambda x: x['tanggal'], reverse=True)
    
    latest_report = active_reports[0] if active_reports else None
    
    if latest_report is None:
        # No active report, inventory wins
        return condition_inventory, tgl_update
        
    if tgl_update is None:
        # No inventory date, latest active report wins
        return latest_report['kondisi'], latest_report['tanggal']
        
    report_date = latest_report['tanggal']
    
    if report_date > tgl_update:
        return latest_report['kondisi'], report_date
    elif report_date == tgl_update:
        # Report wins when dates are identical
        return latest_report['kondisi'], report_date
    else:
        # Inventory date is more recent
        return condition_inventory, tgl_update
