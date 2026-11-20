from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.shape import to_shape

from app.db.session import get_db
from app.core.state import app_state
from app.core.config import settings
from app.models.models import (
    Asset,
    AssetTag,
    Canal,
    TertiaryPlot,
    InspectionReport,
    DataQualityFinding,
    AssetImpactCache,
    AssetImpactPlot,
)
from app.schemas.schemas import (
    HealthResponse,
    VersionResponse,
    AssetSchema,
    AssetListResponse,
    AssetDetailResponse,
    ReportSchema,
    ImpactResponse,
    ImpactPlotSchema,
    CanalSummaryResponse,
    CanalSummaryItem,
    PriorityResponse,
    PriorityItem,
    QualityDataResponse,
    QualityCategoryItem,
    QualityFindingItem,
    SupplementalImportResponse,
    AssetTypeEnum,
    ConditionEnum,
)
from app.analytics.canal_summary import generate_canal_summary
from app.analytics.maintenance_priority import calculate_maintenance_priority
from app.services.supplemental_service import process_supplemental_import

router = APIRouter()

MANDATORY_QUALITY_CATEGORIES = [
    "koordinat_utm_dikonversi",
    "koordinat_tertukar_dibetulkan",
    "koordinat_tidak_valid",
    "jauh_dari_saluran",
    "aset_ganda",
    "ruas_ganda",
    "petak_ganda",
    "geometri_diperbaiki",
    "luas_tidak_wajar",
    "laporan_ganda",
    "laporan_tanpa_aset",
]


@router.get("/health", response_model=HealthResponse, tags=["System"])
def get_health():
    """Returns application initialization and import status."""
    return HealthResponse(status=app_state.status if app_state.status in ["memuat", "siap"] else "memuat")


@router.get("/versi", response_model=VersionResponse, tags=["System"])
def get_version():
    """Returns API contract version 1.2."""
    return VersionResponse(versi_kontrak="1.2")


@router.get("/aset", response_model=AssetListResponse, tags=["Assets"])
def list_assets(
    jenis: Optional[AssetTypeEnum] = None,
    kondisi: Optional[ConditionEnum] = None,
    saluran: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists irrigation structures with optional filters for jenis, kondisi, saluran."""
    query = db.query(Asset)
    if jenis:
        query = query.filter(Asset.jenis == jenis)
    if kondisi:
        query = query.filter(Asset.condition_current == kondisi)
    if saluran:
        query = query.filter(Asset.nama_saluran.ilike(f"%{saluran}%"))

    assets = query.order_by(Asset.kode_aset.asc()).all()
    results = []

    for a in assets:
        tags = [t.tag_code for t in a.tags]
        lon, lat = None, None
        if a.geom is not None:
            pt = to_shape(a.geom)
            lon, lat = round(pt.x, 6), round(pt.y, 6)

        results.append(AssetSchema(
            kode_aset=a.kode_aset,
            nomenklatur=a.nomenklatur_normalized,
            jenis=a.jenis,
            nama_saluran=a.nama_saluran,
            kondisi=a.condition_current,
            tgl_kondisi=a.tgl_kondisi,
            lon=lon,
            lat=lat,
            tanda=tags
        ))

    return AssetListResponse(jumlah=len(results), data=results)


@router.get("/aset/{kode_aset}", response_model=AssetDetailResponse, tags=["Assets"])
def get_asset_detail(
    kode_aset: str,
    db: Session = Depends(get_db)
):
    """Retrieves single asset details including all historical inspection reports (including cancelled)."""
    asset = db.query(Asset).filter(Asset.kode_aset == kode_aset).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Aset dengan kode '{kode_aset}' tidak ditemukan"}
        )

    tags = [t.tag_code for t in asset.tags]
    lon, lat = None, None
    if asset.geom is not None:
        pt = to_shape(asset.geom)
        lon, lat = round(pt.x, 6), round(pt.y, 6)

    # Fetch reports associated with this asset (both active and batal)
    reports = db.query(InspectionReport).filter(
        InspectionReport.asset_id == asset.id
    ).order_by(InspectionReport.tanggal.desc()).all()

    report_list = []
    for r in reports:
        report_list.append(ReportSchema(
            id_laporan=r.id_laporan,
            tanggal=r.tanggal,
            petugas=r.petugas,
            nomenklatur=r.nomenklatur_normalized,
            jenis_kerusakan=r.jenis_kerusakan,
            kondisi=r.kondisi,
            status=r.status,
            keterangan=r.keterangan,
            matching_method=r.matching_method,
            matching_distance_m=float(r.matching_distance_m) if r.matching_distance_m is not None else None
        ))

    return AssetDetailResponse(
        kode_aset=asset.kode_aset,
        nomenklatur=asset.nomenklatur_normalized,
        jenis=asset.jenis,
        nama_saluran=asset.nama_saluran,
        kondisi=asset.condition_current,
        tgl_kondisi=asset.tgl_kondisi,
        lon=lon,
        lat=lat,
        tanda=tags,
        riwayat=report_list
    )


@router.get("/aset/{kode_aset}/dampak", response_model=ImpactResponse, tags=["Assets", "Analytics"])
def get_asset_impact(
    kode_aset: str,
    db: Session = Depends(get_db)
):
    """Calculates downstream tertiary plots and total affected irrigation area for a structure."""
    asset = db.query(Asset).filter(Asset.kode_aset == kode_aset).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Aset dengan kode '{kode_aset}' tidak ditemukan"}
        )

    cache = db.query(AssetImpactCache).filter(AssetImpactCache.asset_id == asset.id).first()
    if not cache:
        return ImpactResponse(
            kode_aset=kode_aset,
            jumlah_petak=0,
            luas_terdampak_ha=0.0,
            petak=[]
        )

    # Get affected plots
    impact_plots = (
        db.query(TertiaryPlot)
        .join(AssetImpactPlot, AssetImpactPlot.plot_id == TertiaryPlot.id)
        .filter(AssetImpactPlot.asset_id == asset.id)
        .order_by(TertiaryPlot.kode_petak.asc())
        .all()
    )

    plot_items = [
        ImpactPlotSchema(
            kode_petak=p.kode_petak,
            luas_ha=float(p.luas_ha)
        )
        for p in impact_plots
    ]

    return ImpactResponse(
        kode_aset=kode_aset,
        jumlah_petak=cache.jumlah_petak,
        luas_terdampak_ha=float(cache.luas_terdampak_ha),
        petak=plot_items
    )


@router.get("/rekap/saluran", response_model=CanalSummaryResponse, tags=["Analytics"])
def get_canal_summary(db: Session = Depends(get_db)):
    """Summarizes total canal length grouped by level (primer, sekunder) and condition."""
    canals = db.query(Canal).all()
    canals_data = [
        {
            "tingkat": c.tingkat,
            "kondisi": c.kondisi,
            "length_m": float(c.length_m)
        }
        for c in canals
    ]
    summary_items = generate_canal_summary(canals_data)
    return CanalSummaryResponse(
        data=[CanalSummaryItem(**item) for item in summary_items]
    )


@router.get("/prioritas", response_model=PriorityResponse, tags=["Analytics"])
def get_maintenance_priority(
    limit: int = Query(20, description="Jumlah maksimal baris prioritas", ge=1),
    db: Session = Depends(get_db)
):
    """Calculates maintenance priorities based on condition weight * affected downstream area."""
    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "BAD_REQUEST", "message": "Parameter limit harus berupa bilangan bulat >= 1"}
        )

    assets_with_cache = (
        db.query(Asset, AssetImpactCache)
        .outerjoin(AssetImpactCache, AssetImpactCache.asset_id == Asset.id)
        .all()
    )

    items = []
    for asset, cache in assets_with_cache:
        luas_ha = float(cache.luas_terdampak_ha) if cache else 0.0
        items.append({
            "kode_aset": asset.kode_aset,
            "condition_current": asset.condition_current,
            "luas_terdampak_ha": luas_ha
        })

    ranked = calculate_maintenance_priority(items, limit=limit)
    return PriorityResponse(data=[PriorityItem(**r) for r in ranked])


@router.get("/kualitas-data", response_model=QualityDataResponse, tags=["Data Quality"])
def get_data_quality(db: Session = Depends(get_db)):
    """
    Returns summary counts of findings per category (including mandatory categories with 0 count)
    and detailed list of data quality findings.
    """
    # Count occurrences per category in DB
    category_counts = dict(
        db.query(DataQualityFinding.category, func.count(DataQualityFinding.id))
        .group_by(DataQualityFinding.category)
        .all()
    )

    data_summary = []
    # 1. Include all mandatory categories first
    for cat in MANDATORY_QUALITY_CATEGORIES:
        data_summary.append(QualityCategoryItem(
            kategori=cat,
            jumlah=category_counts.get(cat, 0)
        ))

    # 2. Add any additional custom categories if present
    for cat, count in category_counts.items():
        if cat not in MANDATORY_QUALITY_CATEGORIES:
            data_summary.append(QualityCategoryItem(kategori=cat, jumlah=count))

    # Fetch detailed findings
    findings = db.query(DataQualityFinding).order_by(DataQualityFinding.created_at.asc()).all()
    rincian = [
        QualityFindingItem(
            sumber_berkas=f.source_file,
            pengenal_baris=f.source_record_id,
            kategori=f.category,
            masalah=f.problem,
            tindakan=f.action_taken
        )
        for f in findings
    ]

    return QualityDataResponse(data=data_summary, rincian=rincian)


@router.post("/impor/susulan", response_model=SupplementalImportResponse, tags=["Import"])
def run_supplemental_import(db: Session = Depends(get_db)):
    """
    Triggers idempotent supplemental import from configured laporan_susulan.xlsx.
    Recalculates conditions and priorities.
    """
    try:
        counters = process_supplemental_import(db)
        return SupplementalImportResponse(**counters)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FILE_NOT_FOUND", "message": str(fnf)}
        )
    except RuntimeError as rerr:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT", "message": str(rerr)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SERVER_ERROR", "message": str(e)}
        )


# GeoJSON helper endpoints for the interactive frontend Leaflet map
@router.get("/peta/saluran", tags=["GIS"])
def get_map_canals(db: Session = Depends(get_db)):
    """Returns GeoJSON FeatureCollection of all canal segments."""
    canals = db.query(Canal).all()
    features = []
    for c in canals:
        geom_json = None
        if c.geom is not None:
            geom_json = to_shape(c.geom).__geo_interface__
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(c.id),
                "id_ruas": c.id_ruas,
                "nama_saluran": c.nama_saluran,
                "tingkat": c.tingkat,
                "kondisi": c.kondisi,
                "panjang_km": round(float(c.length_m) / 1000.0, 2)
            },
            "geometry": geom_json
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/peta/bangunan", tags=["GIS"])
def get_map_assets(db: Session = Depends(get_db)):
    """Returns GeoJSON FeatureCollection of all irrigation structures."""
    assets = db.query(Asset).all()
    features = []
    for a in assets:
        geom_json = None
        if a.geom is not None:
            geom_json = to_shape(a.geom).__geo_interface__
        tags = [t.tag_code for t in a.tags]
        features.append({
            "type": "Feature",
            "properties": {
                "id": str(a.id),
                "kode_aset": a.kode_aset,
                "nomenklatur": a.nomenklatur_normalized,
                "jenis": a.jenis,
                "nama_saluran": a.nama_saluran,
                "kondisi": a.condition_current,
                "tgl_kondisi": str(a.tgl_kondisi) if a.tgl_kondisi else None,
                "tanda": tags
            },
            "geometry": geom_json
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/peta/petak", tags=["GIS"])
def get_map_plots(db: Session = Depends(get_db)):
    """Returns GeoJSON FeatureCollection of all tertiary plots."""
    plots = db.query(TertiaryPlot).all()
    features = []
    for p in plots:
        geom_json = None
        if p.geom is not None:
            geom_json = to_shape(p.geom).__geo_interface__
        
        serving_asset_code = None
        if p.service_assignment and p.service_assignment.serving_asset:
            serving_asset_code = p.service_assignment.serving_asset.kode_aset

        features.append({
            "type": "Feature",
            "properties": {
                "id": str(p.id),
                "kode_petak": p.kode_petak,
                "nama_petak": p.nama_petak,
                "luas_ha": float(p.luas_ha),
                "nomenklatur_sadap": p.nomenklatur_sadap_normalized,
                "serving_asset_code": serving_asset_code,
                "has_valid_geometry": p.has_valid_geometry
            },
            "geometry": geom_json
        })
    return {"type": "FeatureCollection", "features": features}
