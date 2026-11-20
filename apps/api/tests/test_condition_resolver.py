import pytest
from datetime import date
from app.analytics.condition_resolver import resolve_asset_current_condition


def test_condition_resolution_latest_date_wins():
    # Inventory dated 2025-01-01 (baik), report dated 2026-05-01 (rusak_berat)
    reports = [
        {"kondisi": "rusak_berat", "status": "aktif", "tanggal": date(2026, 5, 1)}
    ]
    cond, tgl = resolve_asset_current_condition("baik", date(2025, 1, 1), reports)
    assert cond == "rusak_berat"
    assert tgl == date(2026, 5, 1)


def test_condition_resolution_inventory_more_recent():
    # Inventory dated 2026-08-01 (baik), report dated 2026-02-01 (rusak_ringan)
    reports = [
        {"kondisi": "rusak_ringan", "status": "aktif", "tanggal": date(2026, 2, 1)}
    ]
    cond, tgl = resolve_asset_current_condition("baik", date(2026, 8, 1), reports)
    assert cond == "baik"
    assert tgl == date(2026, 8, 1)


def test_condition_resolution_tied_date_report_wins():
    # Identical dates: 2026-06-15. Report MUST win tie according to PRD!
    reports = [
        {"kondisi": "rusak_sedang", "status": "aktif", "tanggal": date(2026, 6, 15)}
    ]
    cond, tgl = resolve_asset_current_condition("baik", date(2026, 6, 15), reports)
    assert cond == "rusak_sedang"
    assert tgl == date(2026, 6, 15)


def test_condition_resolution_cancelled_report_ignored():
    # Cancelled report (batal) should NOT affect current condition
    reports = [
        {"kondisi": "rusak_berat", "status": "batal", "tanggal": date(2026, 9, 1)}
    ]
    cond, tgl = resolve_asset_current_condition("baik", date(2025, 1, 1), reports)
    assert cond == "baik"
    assert tgl == date(2025, 1, 1)
