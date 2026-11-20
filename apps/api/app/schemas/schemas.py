from datetime import date
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# Contract Enums
AssetTypeEnum = Literal[
    "bendung", 
    "bangunan_bagi", 
    "bangunan_sadap", 
    "bangunan_bagi_sadap", 
    "bangunan_pelengkap"
]
ConditionEnum = Literal["baik", "rusak_ringan", "rusak_sedang", "rusak_berat"]
ReportStatusEnum = Literal["aktif", "batal"]
CanalLevelEnum = Literal["primer", "sekunder"]


class HealthResponse(BaseModel):
    status: Literal["memuat", "siap"]


class VersionResponse(BaseModel):
    versi_kontrak: Literal["1.2"]


class AssetSchema(BaseModel):
    kode_aset: str
    nomenklatur: Optional[str] = None
    jenis: AssetTypeEnum
    nama_saluran: Optional[str] = None
    kondisi: ConditionEnum
    tgl_kondisi: Optional[date] = None
    lon: Optional[float] = None
    lat: Optional[float] = None
    tanda: List[str] = Field(default_factory=list)


class AssetListResponse(BaseModel):
    jumlah: int
    data: List[AssetSchema]


class ReportSchema(BaseModel):
    id_laporan: str
    tanggal: date
    petugas: Optional[str] = None
    nomenklatur: Optional[str] = None
    jenis_kerusakan: Optional[str] = None
    kondisi: ConditionEnum
    status: ReportStatusEnum
    keterangan: Optional[str] = None
    matching_method: Optional[str] = None
    matching_distance_m: Optional[float] = None


class AssetDetailResponse(AssetSchema):
    riwayat: List[ReportSchema] = Field(default_factory=list)


class ImpactPlotSchema(BaseModel):
    kode_petak: str
    luas_ha: float


class ImpactResponse(BaseModel):
    kode_aset: str
    jumlah_petak: int
    luas_terdampak_ha: float
    petak: List[ImpactPlotItem] if False else List[ImpactPlotSchema]


class CanalSummaryItem(BaseModel):
    tingkat: CanalLevelEnum
    kondisi: ConditionEnum
    panjang_km: float


class CanalSummaryResponse(BaseModel):
    data: List[CanalSummaryItem]


class PriorityItem(BaseModel):
    peringkat: int
    kode_aset: str
    kondisi: ConditionEnum
    luas_terdampak_ha: float
    skor: float


class PriorityResponse(BaseModel):
    data: List[PriorityItem]


class QualityCategoryItem(BaseModel):
    kategori: str
    jumlah: int


class QualityFindingItem(BaseModel):
    sumber_berkas: str
    pengenal_baris: str
    kategori: str
    masalah: str
    tindakan: str


class QualityDataResponse(BaseModel):
    data: List[QualityCategoryItem]
    rincian: List[QualityFindingItem] = Field(default_factory=list)


class SupplementalImportResponse(BaseModel):
    ditambah: int
    diubah: int
    dibatalkan: int
    tidak_berubah: int


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
