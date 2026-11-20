-- DI Kali Wening — PostgreSQL + PostGIS schema baseline v1.0
-- Apply via Alembic migrations. Geometries stored in EPSG:4326.
-- Metric calculations must transform to EPSG:32749.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE asset_type AS ENUM (
 'bendung','bangunan_bagi','bangunan_sadap','bangunan_bagi_sadap','bangunan_pelengkap'
);
CREATE TYPE condition_type AS ENUM ('baik','rusak_ringan','rusak_sedang','rusak_berat');
CREATE TYPE report_status AS ENUM ('aktif','batal');
CREATE TYPE canal_level AS ENUM ('primer','sekunder');
CREATE TYPE import_type AS ENUM ('initial','supplemental');
CREATE TYPE import_status AS ENUM ('queued','running','completed','failed');

CREATE TABLE import_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 source_file TEXT NOT NULL,
 import_type import_type NOT NULL,
 status import_status NOT NULL DEFAULT 'queued',
 started_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 rows_read INTEGER NOT NULL DEFAULT 0 CHECK(rows_read >= 0),
 rows_inserted INTEGER NOT NULL DEFAULT 0 CHECK(rows_inserted >= 0),
 rows_updated INTEGER NOT NULL DEFAULT 0 CHECK(rows_updated >= 0),
 rows_skipped INTEGER NOT NULL DEFAULT 0 CHECK(rows_skipped >= 0),
 error_summary TEXT,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 kode_aset TEXT NOT NULL UNIQUE,
 nomenklatur_raw TEXT,
 nomenklatur_normalized TEXT,
 jenis asset_type NOT NULL,
 nama_saluran TEXT,
 condition_inventory condition_type,
 condition_current condition_type,
 tahun_bangun INTEGER,
 tgl_update DATE,
 tgl_kondisi DATE,
 source_file TEXT NOT NULL DEFAULT 'aset_bangunan.csv',
 source_row TEXT,
 geom geometry(Point,4326),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assets_nomenclature ON assets(nomenklatur_normalized);
CREATE INDEX idx_assets_type_condition ON assets(jenis,condition_current);
CREATE INDEX idx_assets_channel ON assets(nama_saluran);
CREATE INDEX idx_assets_geom ON assets USING GIST(geom);

CREATE TABLE asset_tags (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
 tag_code TEXT NOT NULL,
 detail TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(asset_id,tag_code)
);
CREATE INDEX idx_asset_tags_code ON asset_tags(tag_code);

CREATE TABLE canals (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 id_ruas TEXT,
 nama_saluran TEXT,
 tingkat canal_level NOT NULL,
 kondisi condition_type NOT NULL,
 geom geometry(LineString,4326) NOT NULL,
 length_m NUMERIC(14,3) NOT NULL CHECK(length_m >= 0),
 source_file TEXT NOT NULL DEFAULT 'saluran.geojson',
 source_feature_id TEXT,
 canonical_geometry_hash TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_canals_level_condition ON canals(tingkat,kondisi);
CREATE INDEX idx_canals_geom ON canals USING GIST(geom);
CREATE INDEX idx_canals_hash ON canals(canonical_geometry_hash);

CREATE TABLE tertiary_plots (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 kode_petak TEXT NOT NULL UNIQUE,
 nama_petak TEXT,
 luas_baku_raw TEXT,
 luas_baku_unit_detected TEXT,
 luas_ha NUMERIC(14,4) NOT NULL CHECK(luas_ha >= 0),
 nomenklatur_sadap_raw TEXT,
 nomenklatur_sadap_normalized TEXT,
 geom geometry(MultiPolygon,4326),
 has_valid_geometry BOOLEAN NOT NULL DEFAULT TRUE,
 source_file TEXT NOT NULL DEFAULT 'petak_tersier.geojson',
 source_feature_id TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plots_sadap ON tertiary_plots(nomenklatur_sadap_normalized);
CREATE INDEX idx_plots_geom ON tertiary_plots USING GIST(geom);

CREATE TABLE inspection_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 id_laporan TEXT NOT NULL UNIQUE,
 asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
 tanggal DATE NOT NULL,
 petugas TEXT,
 nomenklatur_raw TEXT,
 nomenklatur_normalized TEXT,
 jenis_kerusakan TEXT,
 kondisi condition_type NOT NULL,
 status report_status NOT NULL,
 keterangan TEXT,
 geom geometry(Point,4326),
 matching_method TEXT CHECK(matching_method IN ('nomenklatur','nearest_30m','unmatched')),
 matching_distance_m NUMERIC(12,3),
 source_file TEXT NOT NULL,
 source_row TEXT,
 source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 import_run_id UUID REFERENCES import_runs(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_asset_date ON inspection_reports(asset_id,tanggal DESC);
CREATE INDEX idx_reports_status ON inspection_reports(status);
CREATE INDEX idx_reports_nomenclature ON inspection_reports(nomenklatur_normalized);
CREATE INDEX idx_reports_geom ON inspection_reports USING GIST(geom);

CREATE TABLE data_quality_findings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 import_run_id UUID REFERENCES import_runs(id) ON DELETE SET NULL,
 source_file TEXT NOT NULL,
 source_record_id TEXT NOT NULL,
 category TEXT NOT NULL,
 problem TEXT NOT NULL,
 action_taken TEXT NOT NULL,
 raw_value JSONB,
 normalized_value JSONB,
 severity TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quality_category ON data_quality_findings(category);
CREATE INDEX idx_quality_source ON data_quality_findings(source_file);

CREATE TABLE plot_service_assignments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 plot_id UUID NOT NULL UNIQUE REFERENCES tertiary_plots(id) ON DELETE CASCADE,
 serving_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
 assignment_method TEXT NOT NULL CHECK(assignment_method IN ('nomenklatur_sadap','nearest_fallback','none')),
 distance_m NUMERIC(12,3),
 tag TEXT,
 computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plot_assignment_asset ON plot_service_assignments(serving_asset_id);

CREATE TABLE network_nodes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 node_key TEXT NOT NULL UNIQUE,
 geom geometry(Point,4326) NOT NULL,
 root_distance_m NUMERIC(14,3),
 is_root BOOLEAN NOT NULL DEFAULT FALSE,
 component_no INTEGER,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_network_nodes_geom ON network_nodes USING GIST(geom);

CREATE TABLE network_edges (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 canal_id UUID NOT NULL UNIQUE REFERENCES canals(id) ON DELETE CASCADE,
 from_node_id UUID REFERENCES network_nodes(id) ON DELETE SET NULL,
 to_node_id UUID REFERENCES network_nodes(id) ON DELETE SET NULL,
 flow_direction_status TEXT NOT NULL DEFAULT 'unresolved',
 length_m NUMERIC(14,3) NOT NULL CHECK(length_m >= 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_network_edges_from ON network_edges(from_node_id);
CREATE INDEX idx_network_edges_to ON network_edges(to_node_id);

CREATE TABLE asset_network_positions (
 asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
 canal_id UUID REFERENCES canals(id) ON DELETE SET NULL,
 edge_id UUID REFERENCES network_edges(id) ON DELETE SET NULL,
 distance_to_canal_m NUMERIC(12,3),
 measure_m NUMERIC(14,3),
 geom geometry(Point,4326),
 is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
 computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_asset_network_geom ON asset_network_positions USING GIST(geom);

CREATE TABLE asset_impact_cache (
 asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
 jumlah_petak INTEGER NOT NULL DEFAULT 0 CHECK(jumlah_petak >= 0),
 luas_terdampak_ha NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK(luas_terdampak_ha >= 0),
 algorithm_version TEXT NOT NULL,
 computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_impact_plots (
 asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
 plot_id UUID NOT NULL REFERENCES tertiary_plots(id) ON DELETE CASCADE,
 PRIMARY KEY(asset_id,plot_id)
);
CREATE INDEX idx_impact_plots_plot ON asset_impact_plots(plot_id);

-- Note: source rows/features removed by deduplication must still be represented
-- in data_quality_findings with source identifiers and action_taken.
-- Raw staging tables may be added to support full ingestion replay.
