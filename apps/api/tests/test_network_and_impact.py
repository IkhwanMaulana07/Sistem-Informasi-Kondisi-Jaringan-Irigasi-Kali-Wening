import pytest
from shapely.geometry import Point, LineString, Polygon
from app.geospatial.network import IrrigationNetwork
from app.analytics.maintenance_priority import calculate_maintenance_priority


def test_network_tree_flow_and_downstream_impact():
    """
    Constructs a synthetic irrigation tree:
    Weir (Root) at (0, 0)
    Canal 1: (0, 0) to (1000, 0) -> Canal 1 has Asset A at 200m and Asset B at 600m
    Canal 2: (1000, 0) to (2000, 0) -> Asset C at 1500m
    Plot 1 served by Asset A (area 20 ha)
    Plot 2 served by Asset B (area 30 ha)
    Plot 3 served by Asset C (area 50 ha)

    Expected Downstream Impacts:
    - Asset A: impacts Plot 1, Plot 2, Plot 3 -> 20 + 30 + 50 = 100 ha
    - Asset B: impacts Plot 2, Plot 3 -> 30 + 50 = 80 ha (Plot 1 at A is upstream, excluded!)
    - Asset C: impacts Plot 3 -> 50 ha
    """
    net = IrrigationNetwork(connection_tolerance_m=10.0)

    # In UTM 49S coordinates around 430000, 9150000
    base_x, base_y = 430000.0, 9150000.0

    c1_utm = LineString([(base_x, base_y), (base_x + 1000, base_y)])
    c2_utm = LineString([(base_x + 1000, base_y), (base_x + 2000, base_y)])

    from app.geospatial.crs import to_wgs84
    c1_wgs = to_wgs84(c1_utm)
    c2_wgs = to_wgs84(c2_utm)

    canals = [
        {'id': 'c1', 'id_ruas': 'KW-1', 'geom_utm': c1_utm, 'geom_wgs': c1_wgs, 'tingkat': 'primer'},
        {'id': 'c2', 'id_ruas': 'KW-2', 'geom_utm': c2_utm, 'geom_wgs': c2_wgs, 'tingkat': 'sekunder'}
    ]

    weir_pt_wgs = to_wgs84(Point(base_x, base_y))
    net.build_network(canals, root_point_wgs84=weir_pt_wgs)

    # Assets
    asset_a_wgs = to_wgs84(Point(base_x + 200, base_y))
    asset_b_wgs = to_wgs84(Point(base_x + 600, base_y))
    asset_c_wgs = to_wgs84(Point(base_x + 1500, base_y))

    assets = [
        {'id': 'a1', 'kode_aset': 'A-01', 'nomenklatur_normalized': 'B.KW.1', 'jenis': 'bangunan_bagi_sadap', 'geom': asset_a_wgs},
        {'id': 'a2', 'kode_aset': 'A-02', 'nomenklatur_normalized': 'B.KW.2', 'jenis': 'bangunan_bagi_sadap', 'geom': asset_b_wgs},
        {'id': 'a3', 'kode_aset': 'A-03', 'nomenklatur_normalized': 'B.KW.3', 'jenis': 'bangunan_sadap', 'geom': asset_c_wgs},
    ]

    positions = net.project_assets(assets, max_distance_m=50.0)
    assert positions['a1']['is_eligible']
    assert positions['a2']['is_eligible']
    assert positions['a3']['is_eligible']

    # Plots
    plots = [
        {'id': 'p1', 'kode_petak': 'P1', 'luas_ha': 20.0, 'nomenklatur_sadap_normalized': 'B.KW.1', 'geom': None},
        {'id': 'p2', 'kode_petak': 'P2', 'luas_ha': 30.0, 'nomenklatur_sadap_normalized': 'B.KW.2', 'geom': None},
        {'id': 'p3', 'kode_petak': 'P3', 'luas_ha': 50.0, 'nomenklatur_sadap_normalized': 'B.KW.3', 'geom': None},
    ]

    assignments = net.assign_plots_to_assets(plots, assets)
    assert assignments['p1']['serving_asset_id'] == 'a1'
    assert assignments['p2']['serving_asset_id'] == 'a2'
    assert assignments['p3']['serving_asset_id'] == 'a3'

    plots_dict = {p['id']: p for p in plots}
    impacts = net.calculate_downstream_impacts(assets, positions, assignments, plots_dict)

    # Asset A impacts P1, P2, P3 = 100 ha
    assert impacts['a1']['jumlah_petak'] == 3
    assert abs(impacts['a1']['luas_terdampak_ha'] - 100.0) < 0.01

    # Asset B impacts P2, P3 = 80 ha (P1 is upstream)
    assert impacts['a2']['jumlah_petak'] == 2
    assert abs(impacts['a2']['luas_terdampak_ha'] - 80.0) < 0.01

    # Asset C impacts P3 = 50 ha
    assert impacts['a3']['jumlah_petak'] == 1
    assert abs(impacts['a3']['luas_terdampak_ha'] - 50.0) < 0.01


def test_maintenance_priority_ranking():
    # Asset 1: rusak_sedang (weight 2), area 50 ha -> score = 100.0
    # Asset 2: rusak_berat (weight 4), area 30 ha -> score = 120.0
    # Asset 3: baik (weight 0), area 100 ha -> score = 0 (excluded!)
    # Asset 4: rusak_ringan (weight 1), area 100 ha -> score = 100.0 (tied with Asset 1)
    assets = [
        {'kode_aset': 'KW-0002', 'condition_current': 'rusak_sedang', 'luas_terdampak_ha': 50.0},
        {'kode_aset': 'KW-0001', 'condition_current': 'rusak_berat', 'luas_terdampak_ha': 30.0},
        {'kode_aset': 'KW-0003', 'condition_current': 'baik', 'luas_terdampak_ha': 100.0},
        {'kode_aset': 'KW-0004', 'condition_current': 'rusak_ringan', 'luas_terdampak_ha': 100.0},
    ]

    ranked = calculate_maintenance_priority(assets, limit=10)

    # Total ranked items with score > 0: 3 items (Asset 3 excluded)
    assert len(ranked) == 3

    # Rank 1: KW-0001 with score 120.0
    assert ranked[0]['peringkat'] == 1
    assert ranked[0]['kode_aset'] == 'KW-0001'
    assert ranked[0]['skor'] == 120.0

    # Tied score 100.0 between KW-0002 and KW-0004
    # Tie break is kode_aset ASC -> KW-0002 before KW-0004
    assert ranked[1]['peringkat'] == 2
    assert ranked[1]['kode_aset'] == 'KW-0002'
    assert ranked[1]['skor'] == 100.0

    assert ranked[2]['peringkat'] == 3
    assert ranked[2]['kode_aset'] == 'KW-0004'
    assert ranked[2]['skor'] == 100.0
