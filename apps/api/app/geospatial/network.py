import math
from typing import List, Dict, Tuple, Optional, Set, Any
import networkx as nx
from shapely.geometry import Point, LineString, Polygon, MultiPolygon
from shapely.ops import nearest_points
from app.geospatial.crs import (
    to_utm49s,
    to_wgs84,
    calculate_distance_meters,
)


class IrrigationNetwork:
    def __init__(self, connection_tolerance_m: float = 10.0):
        self.connection_tolerance_m = connection_tolerance_m
        self.undirected_graph = nx.Graph()
        self.directed_dag = nx.DiGraph()
        self.nodes_dict: Dict[str, Tuple[float, float]] = {}  # node_id -> (utm_x, utm_y)
        self.canal_edges: Dict[str, Dict[str, Any]] = {}  # canal_id -> edge info
        self.root_node_id: Optional[str] = None
        self.node_positions: Dict[str, Point] = {}  # node_id -> Point(wgs84_lon, wgs84_lat)

    def _get_or_create_node(self, utm_pt: Tuple[float, float]) -> str:
        px, py = utm_pt[0], utm_pt[1]
        for nid, (nx_val, ny_val) in self.nodes_dict.items():
            dist = math.hypot(px - nx_val, py - ny_val)
            if dist <= self.connection_tolerance_m:
                return nid
        
        nid = f"node_{len(self.nodes_dict) + 1}"
        self.nodes_dict[nid] = (px, py)
        wgs_pt = to_wgs84(Point(px, py))
        self.node_positions[nid] = wgs_pt
        return nid

    def build_network(
        self, 
        canals: List[Dict[str, Any]], 
        root_point_wgs84: Optional[Point] = None
    ) -> None:
        """
        Builds the canal network graph.
        canals: list of dicts with keys:
          'id': canal_id
          'id_ruas': canal code/name
          'geom_utm': LineString in UTM 49S
          'geom_wgs': LineString in WGS84
          'tingkat': 'primer' / 'sekunder'
          'kondisi': condition
        """
        self.undirected_graph.clear()
        self.directed_dag.clear()
        self.nodes_dict.clear()
        self.canal_edges.clear()

        # 1. Snap endpoints and add edges to undirected graph
        for c in canals:
            cid = str(c['id'])
            geom_utm: LineString = c['geom_utm']
            p_start = geom_utm.coords[0]
            p_end = geom_utm.coords[-1]

            u = self._get_or_create_node(p_start)
            v = self._get_or_create_node(p_end)

            edge_len = float(geom_utm.length)
            self.undirected_graph.add_edge(
                u, v,
                canal_id=cid,
                length=edge_len,
                geom_utm=geom_utm,
                geom_wgs=c.get('geom_wgs') or c.get('geom'),
                canal_info=c
            )

        # 2. Determine root node (weir / bendung)
        if root_point_wgs84 is not None and not root_point_wgs84.is_empty:
            root_utm = to_utm49s(root_point_wgs84)
            rx, ry = root_utm.x, root_utm.y
            min_dist = float('inf')
            best_node = None
            for nid, (nx_val, ny_val) in self.nodes_dict.items():
                d = math.hypot(rx - nx_val, ry - ny_val)
                if d < min_dist:
                    min_dist = d
                    best_node = nid
            self.root_node_id = best_node
        else:
            # Fallback: node on primary canal with degree 1 or first node
            primary_nodes = set()
            for u, v, data in self.undirected_graph.edges(data=True):
                if data.get('canal_info', {}).get('tingkat') == 'primer':
                    primary_nodes.add(u)
                    primary_nodes.add(v)
            if primary_nodes:
                # Find degree 1 in primary
                candidates = [n for n in primary_nodes if self.undirected_graph.degree(n) == 1]
                self.root_node_id = candidates[0] if candidates else list(primary_nodes)[0]
            elif self.nodes_dict:
                self.root_node_id = list(self.nodes_dict.keys())[0]

        # 3. Orient flow downstream using BFS from root
        if self.root_node_id and self.root_node_id in self.undirected_graph:
            visited_nodes: Set[str] = {self.root_node_id}
            queue: List[str] = [self.root_node_id]

            while queue:
                curr = queue.pop(0)
                for neighbor in self.undirected_graph.neighbors(curr):
                    if neighbor not in visited_nodes:
                        visited_nodes.add(neighbor)
                        edge_data = self.undirected_graph.get_edge_data(curr, neighbor)
                        cid = edge_data['canal_id']
                        
                        # Add directed edge curr -> neighbor (water flows from curr to neighbor)
                        self.directed_dag.add_edge(
                            curr, neighbor,
                            canal_id=cid,
                            length=edge_data['length'],
                            geom_utm=edge_data['geom_utm'],
                            geom_wgs=edge_data['geom_wgs'],
                            canal_info=edge_data['canal_info']
                        )

                        # Check if canal LineString needs to be oriented from curr to neighbor
                        geom_utm = edge_data['geom_utm']
                        curr_pt = self.nodes_dict[curr]
                        start_pt = geom_utm.coords[0]
                        dist_start_to_curr = math.hypot(start_pt[0] - curr_pt[0], start_pt[1] - curr_pt[1])
                        
                        # If start_pt is closer to neighbor than curr, then the LineString was digitized backward
                        forward_oriented = dist_start_to_curr < self.connection_tolerance_m

                        self.canal_edges[cid] = {
                            'from_node': curr,
                            'to_node': neighbor,
                            'length': edge_data['length'],
                            'forward_oriented': forward_oriented,
                            'geom_utm': geom_utm,
                            'geom_wgs': edge_data['geom_wgs']
                        }
                        queue.append(neighbor)

    def project_assets(
        self, 
        assets: List[Dict[str, Any]], 
        max_distance_m: float = 50.0
    ) -> Dict[str, Dict[str, Any]]:
        """
        Projects assets onto nearest canal within max_distance_m (50 m).
        Returns dict: asset_id -> {
            'is_eligible': bool,
            'canal_id': Optional[str],
            'distance_m': float,
            'measure_m': float, # distance along edge from upstream node
            'projected_wgs': Point,
            'tags': List[str]
        }
        """
        results = {}
        for a in assets:
            aid = str(a['id'])
            pt_wgs: Optional[Point] = a.get('geom')
            
            if pt_wgs is None or pt_wgs.is_empty:
                results[aid] = {
                    'is_eligible': False,
                    'canal_id': None,
                    'distance_m': None,
                    'measure_m': None,
                    'projected_wgs': None,
                    'tags': []
                }
                continue

            pt_utm = to_utm49s(pt_wgs)
            min_dist = float('inf')
            best_canal_id = None
            best_proj_pt_utm = None
            best_measure = 0.0

            for cid, edge_info in self.canal_edges.items():
                geom_utm: LineString = edge_info['geom_utm']
                dist = float(geom_utm.distance(pt_utm))
                if dist < min_dist:
                    min_dist = dist
                    best_canal_id = cid
                    
                    # Project point onto LineString
                    measure_along = float(geom_utm.project(pt_utm))
                    best_proj_pt_utm = geom_utm.interpolate(measure_along)
                    
                    # Adjust measure if LineString is backward relative to flow
                    if edge_info['forward_oriented']:
                        best_measure = measure_along
                    else:
                        best_measure = float(geom_utm.length) - measure_along

            tags = []
            if min_dist > max_distance_m:
                tags.append("jauh_dari_saluran")
                results[aid] = {
                    'is_eligible': False,
                    'canal_id': None,
                    'distance_m': round(min_dist, 3),
                    'measure_m': None,
                    'projected_wgs': None,
                    'tags': tags
                }
            else:
                proj_wgs = to_wgs84(best_proj_pt_utm)
                results[aid] = {
                    'is_eligible': True,
                    'canal_id': best_canal_id,
                    'distance_m': round(min_dist, 3),
                    'measure_m': round(best_measure, 3),
                    'projected_wgs': proj_wgs,
                    'tags': tags
                }

        return results

    def assign_plots_to_assets(
        self,
        plots: List[Dict[str, Any]],
        assets: List[Dict[str, Any]],
        fallback_max_dist_m: float = 200.0
    ) -> Dict[str, Dict[str, Any]]:
        """
        Assigns tertiary plots to serving structure:
        1. Exact match on nomenklatur_sadap.
        2. Fallback to nearest eligible sadap/bagi-sadap within 200 m of plot boundary.
        3. If none, tag 'tanpa_sadap'.
        Returns dict: plot_id -> {
            'serving_asset_id': Optional[str],
            'assignment_method': 'nomenklatur_sadap' | 'nearest_fallback' | 'none',
            'distance_m': Optional[float],
            'tag': Optional[str]
        }
        """
        # Build nomenclature lookup for assets
        nom_to_asset = {}
        eligible_fallback_assets = []

        for a in assets:
            aid = str(a['id'])
            nom = a.get('nomenklatur_normalized')
            if nom:
                nom_to_asset[nom] = a
            
            # Eligible fallback assets are sadap or bagi-sadap with geometry
            jenis = a.get('jenis')
            geom = a.get('geom')
            if jenis in ['bangunan_sadap', 'bangunan_bagi_sadap'] and geom is not None and not geom.is_empty:
                eligible_fallback_assets.append({
                    'id': aid,
                    'kode_aset': a.get('kode_aset'),
                    'geom_utm': to_utm49s(geom)
                })

        # Sort eligible fallback assets by kode_aset for deterministic tie-breaking
        eligible_fallback_assets.sort(key=lambda x: str(x['kode_aset']))

        assignments = {}

        for p in plots:
            pid = str(p['id'])
            sadap_nom = p.get('nomenklatur_sadap_normalized')
            geom_wgs = p.get('geom')

            # 1. Try exact match on nomenclature
            if sadap_nom and sadap_nom in nom_to_asset:
                matched_asset = nom_to_asset[sadap_nom]
                assignments[pid] = {
                    'serving_asset_id': str(matched_asset['id']),
                    'assignment_method': 'nomenklatur_sadap',
                    'distance_m': 0.0,
                    'tag': None
                }
                continue

            # 2. Try fallback to nearest eligible sadap/bagi-sadap within 200 m
            if geom_wgs is not None and not geom_wgs.is_empty and eligible_fallback_assets:
                plot_utm = to_utm49s(geom_wgs)
                min_dist = float('inf')
                best_aid = None

                for fa in eligible_fallback_assets:
                    d = float(plot_utm.distance(fa['geom_utm']))
                    if d < min_dist:
                        min_dist = d
                        best_aid = fa['id']

                if min_dist <= fallback_max_dist_m and best_aid is not None:
                    assignments[pid] = {
                        'serving_asset_id': best_aid,
                        'assignment_method': 'nearest_fallback',
                        'distance_m': round(min_dist, 3),
                        'tag': None
                    }
                    continue

            # 3. No match found
            assignments[pid] = {
                'serving_asset_id': None,
                'assignment_method': 'none',
                'distance_m': None,
                'tag': 'tanpa_sadap'
            }

        return assignments

    def calculate_downstream_impacts(
        self,
        assets: List[Dict[str, Any]],
        asset_positions: Dict[str, Dict[str, Any]],
        plot_assignments: Dict[str, Dict[str, Any]],
        plots_dict: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculates downstream impact for every asset:
        - jumlah_petak
        - luas_terdampak_ha
        - petak: List[{kode_petak, luas_ha}]
        """
        # Map asset_id -> list of plot dicts served directly at asset
        direct_plots_by_asset: Dict[str, List[Dict[str, Any]]] = {}
        for pid, assign in plot_assignments.items():
            aid = assign['serving_asset_id']
            if aid and pid in plots_dict:
                direct_plots_by_asset.setdefault(aid, []).append(plots_dict[pid])

        # Group assets by canal_id
        assets_on_canal: Dict[str, List[Dict[str, Any]]] = {}
        for a in assets:
            aid = str(a['id'])
            pos = asset_positions.get(aid, {})
            if pos.get('is_eligible') and pos.get('canal_id'):
                cid = pos['canal_id']
                assets_on_canal.setdefault(cid, []).append({
                    'id': aid,
                    'measure_m': pos.get('measure_m', 0.0)
                })

        # Sort assets on each canal by measure_m ascending (upstream to downstream)
        for cid in assets_on_canal:
            assets_on_canal[cid].sort(key=lambda x: x['measure_m'])

        # Precompute reachable nodes and edges from every node in directed DAG
        downstream_nodes_cache: Dict[str, Set[str]] = {}
        for node in self.directed_dag.nodes:
            downstream_nodes_cache[node] = nx.descendants(self.directed_dag, node)

        impacts = {}

        for a in assets:
            aid = str(a['id'])
            pos = asset_positions.get(aid, {})

            if not pos.get('is_eligible') or not pos.get('canal_id'):
                # Ineligible or far from canals: return 0 impact
                impacts[aid] = {
                    'jumlah_petak': 0,
                    'luas_terdampak_ha': 0.0,
                    'petak': []
                }
                continue

            target_canal_id = pos['canal_id']
            target_measure = pos['measure_m']
            edge_info = self.canal_edges.get(target_canal_id)

            if not edge_info:
                impacts[aid] = {
                    'jumlah_petak': 0,
                    'luas_terdampak_ha': 0.0,
                    'petak': []
                }
                continue

            to_node = edge_info['to_node']
            downstream_nodes = downstream_nodes_cache.get(to_node, set()) | {to_node}

            # Collect all affected assets:
            # 1. Assets on the same canal edge with measure >= target_measure
            affected_asset_ids: Set[str] = set()
            for other in assets_on_canal.get(target_canal_id, []):
                if other['measure_m'] >= target_measure:
                    affected_asset_ids.add(other['id'])

            # 2. Assets on all downstream canal edges
            for other_cid, other_edge in self.canal_edges.items():
                if other_cid == target_canal_id:
                    continue
                # If the from_node of this other edge is in downstream_nodes, the entire edge is downstream!
                if other_edge['from_node'] in downstream_nodes:
                    for other in assets_on_canal.get(other_cid, []):
                        affected_asset_ids.add(other['id'])

            # Collect unique tertiary plots served by these affected assets
            affected_plots_map: Dict[str, Dict[str, Any]] = {}
            for aff_aid in affected_asset_ids:
                for pl in direct_plots_by_asset.get(aff_aid, []):
                    affected_plots_map[pl['kode_petak']] = pl

            # Sort affected plots deterministically by kode_petak ascending
            sorted_plots = sorted(
                [
                    {'kode_petak': kp, 'luas_ha': float(pl['luas_ha'])}
                    for kp, pl in affected_plots_map.items()
                ],
                key=lambda x: x['kode_petak']
            )

            total_ha = round(sum(p['luas_ha'] for p in sorted_plots), 2)

            impacts[aid] = {
                'jumlah_petak': len(sorted_plots),
                'luas_terdampak_ha': total_ha,
                'petak': sorted_plots
            }

        return impacts
