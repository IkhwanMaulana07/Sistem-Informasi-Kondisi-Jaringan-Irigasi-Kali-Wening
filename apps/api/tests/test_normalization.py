import pytest
from datetime import date
from app.normalization.nomenclature import normalize_nomenclature
from app.normalization.condition import normalize_condition
from app.normalization.asset_type import normalize_asset_type
from app.normalization.canal_level import normalize_canal_level
from app.normalization.dates_and_numbers import parse_date, parse_float, parse_int


def test_nomenclature_normalization():
    # Various format variations
    assert normalize_nomenclature("B.KW.1")[0] == "B.KW.1"
    assert normalize_nomenclature("BKW 1")[0] == "B.KW.1"
    assert normalize_nomenclature("bkw1")[0] == "B.KW.1"
    assert normalize_nomenclature("B-KW-2")[0] == "B.KW.2"
    assert normalize_nomenclature("B.KW.6a")[0] == "B.KW.6A"
    assert normalize_nomenclature("b_wg_4 ")[0] == "B.WG.4"
    assert normalize_nomenclature("BTS 1")[0] == "B.TS.1"
    assert normalize_nomenclature("bbu 2a")[0] == "B.BU.2A"
    assert normalize_nomenclature("B.SR.17c")[0] == "B.SR.17C"
    assert normalize_nomenclature(" B_KW_4a ")[0] == "B.KW.4A"
    assert normalize_nomenclature("")[0] is None
    assert normalize_nomenclature(None)[0] is None


def test_condition_normalization():
    assert normalize_condition("baik")[0] == "baik"
    assert normalize_condition("BAIK ")[0] == "baik"
    assert normalize_condition("B")[0] == "baik"
    assert normalize_condition("RR")[0] == "rusak_ringan"
    assert normalize_condition("Rusak  Ringan")[0] == "rusak_ringan"
    assert normalize_condition("rusak-ringan")[0] == "rusak_ringan"
    assert normalize_condition("RS")[0] == "rusak_sedang"
    assert normalize_condition("rusak sedang")[0] == "rusak_sedang"
    assert normalize_condition("RB")[0] == "rusak_berat"
    assert normalize_condition("Rusak-Berat")[0] == "rusak_berat"
    assert normalize_condition("invalid_text")[0] is None


def test_asset_type_normalization():
    assert normalize_asset_type("Bendung")[0] == "bendung"
    assert normalize_asset_type("Bangunan Bagi")[0] == "bangunan_bagi"
    assert normalize_asset_type("BANGUNAN SADAP")[0] == "bangunan_sadap"
    assert normalize_asset_type("Bangunan Bagi-Sadap")[0] == "bangunan_bagi_sadap"
    # Pelengkap mapping
    assert normalize_asset_type("Talang")[0] == "bangunan_pelengkap"
    assert normalize_asset_type("Gorong-gorong")[0] == "bangunan_pelengkap"
    assert normalize_asset_type("Siphon")[0] == "bangunan_pelengkap"
    assert normalize_asset_type("Terjunan")[0] == "bangunan_pelengkap"


def test_canal_level_normalization():
    assert normalize_canal_level("PRIMER")[0] == "primer"
    assert normalize_canal_level("sekunder")[0] == "sekunder"


def test_date_parsing_day_first():
    # Ambiguous date: 04-05-2026 must be 4 May 2026
    d, err = parse_date("04-05-2026")
    assert d == date(2026, 5, 4)
    assert err is None

    # Textual Indonesian date: "11 Oktober 2026"
    d2, _ = parse_date("11 Oktober 2026")
    assert d2 == date(2026, 10, 11)

    # Textual: "14/06/2025"
    d3, _ = parse_date("14/06/2025")
    assert d3 == date(2025, 6, 14)

    # ISO: "2024-05-28"
    d4, _ = parse_date("2024-05-28")
    assert d4 == date(2024, 5, 28)


def test_float_parsing_comma():
    val, _ = parse_float("110,402958")
    assert abs(val - 110.402958) < 1e-6

    val2, _ = parse_float("38,6")
    assert abs(val2 - 38.6) < 1e-6
