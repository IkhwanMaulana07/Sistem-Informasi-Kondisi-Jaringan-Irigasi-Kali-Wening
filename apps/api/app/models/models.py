import uuid
from datetime import datetime, date
from typing import Optional, List, Any
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    CheckConstraint,
    Index,
    Enum as SQLEnum,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from geoalchemy2 import Geometry
from app.db.base import Base

# Postgres Enum types
asset_type_enum = SQLEnum(
    'bendung',
    'bangunan_bagi',
    'bangunan_sadap',
    'bangunan_bagi_sadap',
    'bangunan_pelengkap',
    name='asset_type',
    create_type=False,
)

condition_type_enum = SQLEnum(
    'baik',
    'rusak_ringan',
    'rusak_sedang',
    'rusak_berat',
    name='condition_type',
    create_type=False,
)

report_status_enum = SQLEnum(
    'aktif',
    'batal',
    name='report_status',
    create_type=False,
)

canal_level_enum = SQLEnum(
    'primer',
    'sekunder',
    name='canal_level',
    create_type=False,
)

import_type_enum = SQLEnum(
    'initial',
    'supplemental',
    name='import_type',
    create_type=False,
)

import_status_enum = SQLEnum(
    'queued',
    'running',
    'completed',
    'failed',
    name='import_status',
    create_type=False,
)


class ImportRun(Base):
    __tablename__ = "import_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file = Column(Text, nullable=False)
    import_type = Column(import_type_enum, nullable=False)
    status = Column(import_status_enum, nullable=False, default='queued')
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    rows_read = Column(Integer, nullable=False, default=0)
    rows_inserted = Column(Integer, nullable=False, default=0)
    rows_updated = Column(Integer, nullable=False, default=0)
    rows_skipped = Column(Integer, nullable=False, default=0)
    error_summary = Column(Text)
    metadata_ = Column("metadata", JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode_aset = Column(Text, nullable=False, unique=True)
    nomenklatur_raw = Column(Text)
    nomenklatur_normalized = Column(Text, index=True)
    jenis = Column(asset_type_enum, nullable=False)
    nama_saluran = Column(Text, index=True)
    condition_inventory = Column(condition_type_enum)
    condition_current = Column(condition_type_enum)
    tahun_bangun = Column(Integer)
    tgl_update = Column(Date)
    tgl_kondisi = Column(Date)
    source_file = Column(Text, nullable=False, default='aset_bangunan.csv')
    source_row = Column(Text)
    geom = Column(Geometry(geometry_type='POINT', srid=4326))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    tags = relationship("AssetTag", back_populates="asset", cascade="all, delete-orphan")
    reports = relationship("InspectionReport", back_populates="asset")
    impact_cache = relationship("AssetImpactCache", back_populates="asset", uselist=False, cascade="all, delete-orphan")
    network_position = relationship("AssetNetworkPosition", back_populates="asset", uselist=False, cascade="all, delete-orphan")


class AssetTag(Base):
    __tablename__ = "asset_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    tag_code = Column(Text, nullable=False, index=True)
    detail = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset = relationship("Asset", back_populates="tags")

    __table_args__ = (
        UniqueConstraint("asset_id", "tag_code", name="uq_asset_tag"),
    )


class Canal(Base):
    __tablename__ = "canals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_ruas = Column(Text)
    nama_saluran = Column(Text)
    tingkat = Column(canal_level_enum, nullable=False)
    kondisi = Column(condition_type_enum, nullable=False)
    geom = Column(Geometry(geometry_type='LINESTRING', srid=4326), nullable=False)
    length_m = Column(Numeric(14, 3), nullable=False)
    source_file = Column(Text, nullable=False, default='saluran.geojson')
    source_feature_id = Column(Text)
    canonical_geometry_hash = Column(Text, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class TertiaryPlot(Base):
    __tablename__ = "tertiary_plots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode_petak = Column(Text, nullable=False, unique=True)
    nama_petak = Column(Text)
    luas_baku_raw = Column(Text)
    luas_baku_unit_detected = Column(Text)
    luas_ha = Column(Numeric(14, 4), nullable=False)
    nomenklatur_sadap_raw = Column(Text)
    nomenklatur_sadap_normalized = Column(Text, index=True)
    geom = Column(Geometry(geometry_type='MULTIPOLYGON', srid=4326))
    has_valid_geometry = Column(Boolean, nullable=False, default=True)
    source_file = Column(Text, nullable=False, default='petak_tersier.geojson')
    source_feature_id = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    service_assignment = relationship("PlotServiceAssignment", back_populates="plot", uselist=False, cascade="all, delete-orphan")


class InspectionReport(Base):
    __tablename__ = "inspection_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_laporan = Column(Text, nullable=False, unique=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"))
    tanggal = Column(Date, nullable=False)
    petugas = Column(Text)
    nomenklatur_raw = Column(Text)
    nomenklatur_normalized = Column(Text, index=True)
    jenis_kerusakan = Column(Text)
    kondisi = Column(condition_type_enum, nullable=False)
    status = Column(report_status_enum, nullable=False)
    keterangan = Column(Text)
    geom = Column(Geometry(geometry_type='POINT', srid=4326))
    matching_method = Column(Text)  # 'nomenklatur', 'nearest_30m', 'unmatched'
    matching_distance_m = Column(Numeric(12, 3))
    source_file = Column(Text, nullable=False)
    source_row = Column(Text)
    source_payload = Column(JSONB, nullable=False, default=dict)
    import_run_id = Column(UUID(as_uuid=True), ForeignKey("import_runs.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    asset = relationship("Asset", back_populates="reports")


class DataQualityFinding(Base):
    __tablename__ = "data_quality_findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_run_id = Column(UUID(as_uuid=True), ForeignKey("import_runs.id", ondelete="SET NULL"))
    source_file = Column(Text, nullable=False, index=True)
    source_record_id = Column(Text, nullable=False)
    category = Column(Text, nullable=False, index=True)
    problem = Column(Text, nullable=False)
    action_taken = Column(Text, nullable=False)
    raw_value = Column(JSONB)
    normalized_value = Column(JSONB)
    severity = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class PlotServiceAssignment(Base):
    __tablename__ = "plot_service_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("tertiary_plots.id", ondelete="CASCADE"), nullable=False, unique=True)
    serving_asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="SET NULL"), index=True)
    assignment_method = Column(Text, nullable=False)  # 'nomenklatur_sadap', 'nearest_fallback', 'none'
    distance_m = Column(Numeric(12, 3))
    tag = Column(Text)
    computed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    plot = relationship("TertiaryPlot", back_populates="service_assignment")
    serving_asset = relationship("Asset")


class NetworkNode(Base):
    __tablename__ = "network_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_key = Column(Text, nullable=False, unique=True)
    geom = Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    root_distance_m = Column(Numeric(14, 3))
    is_root = Column(Boolean, nullable=False, default=False)
    component_no = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class NetworkEdge(Base):
    __tablename__ = "network_edges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    canal_id = Column(UUID(as_uuid=True), ForeignKey("canals.id", ondelete="CASCADE"), nullable=False, unique=True)
    from_node_id = Column(UUID(as_uuid=True), ForeignKey("network_nodes.id", ondelete="SET NULL"), index=True)
    to_node_id = Column(UUID(as_uuid=True), ForeignKey("network_nodes.id", ondelete="SET NULL"), index=True)
    flow_direction_status = Column(Text, nullable=False, default='unresolved')
    length_m = Column(Numeric(14, 3), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    canal = relationship("Canal")
    from_node = relationship("NetworkNode", foreign_keys=[from_node_id])
    to_node = relationship("NetworkNode", foreign_keys=[to_node_id])


class AssetNetworkPosition(Base):
    __tablename__ = "asset_network_positions"

    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    canal_id = Column(UUID(as_uuid=True), ForeignKey("canals.id", ondelete="SET NULL"))
    edge_id = Column(UUID(as_uuid=True), ForeignKey("network_edges.id", ondelete="SET NULL"))
    distance_to_canal_m = Column(Numeric(12, 3))
    measure_m = Column(Numeric(14, 3))
    geom = Column(Geometry(geometry_type='POINT', srid=4326))
    is_eligible = Column(Boolean, nullable=False, default=False)
    computed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset = relationship("Asset", back_populates="network_position")
    canal = relationship("Canal")
    edge = relationship("NetworkEdge")


class AssetImpactCache(Base):
    __tablename__ = "asset_impact_cache"

    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    jumlah_petak = Column(Integer, nullable=False, default=0)
    luas_terdampak_ha = Column(Numeric(14, 2), nullable=False, default=0)
    algorithm_version = Column(Text, nullable=False)
    computed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    asset = relationship("Asset", back_populates="impact_cache")


class AssetImpactPlot(Base):
    __tablename__ = "asset_impact_plots"

    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    plot_id = Column(UUID(as_uuid=True), ForeignKey("tertiary_plots.id", ondelete="CASCADE"), primary_key=True)
