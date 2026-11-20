export type AssetType = 
  | 'bendung'
  | 'bangunan_bagi'
  | 'bangunan_sadap'
  | 'bangunan_bagi_sadap'
  | 'bangunan_pelengkap';

export type ConditionType = 
  | 'baik'
  | 'rusak_ringan'
  | 'rusak_sedang'
  | 'rusak_berat';

export type ReportStatus = 'aktif' | 'batal';
export type CanalLevel = 'primer' | 'sekunder';

export interface Asset {
  kode_aset: string;
  nomenklatur: string | null;
  jenis: AssetType;
  nama_saluran: string | null;
  kondisi: ConditionType;
  tgl_kondisi: string | null;
  lon: number | null;
  lat: number | null;
  tanda: string[];
}

export interface Report {
  id_laporan: string;
  tanggal: string;
  petugas: string | null;
  nomenklatur: string | null;
  jenis_kerusakan: string | null;
  kondisi: ConditionType;
  status: ReportStatus;
  keterangan: string | null;
  matching_method: string | null;
  matching_distance_m: number | null;
}

export interface AssetDetail extends Asset {
  riwayat: Report[];
}

export interface ImpactPlot {
  kode_petak: string;
  luas_ha: number;
}

export interface AssetImpact {
  kode_aset: string;
  jumlah_petak: number;
  luas_terdampak_ha: number;
  petak: ImpactPlot[];
}

export interface CanalSummaryItem {
  tingkat: CanalLevel;
  kondisi: ConditionType;
  panjang_km: number;
}

export interface PriorityItem {
  peringkat: number;
  kode_aset: string;
  kondisi: ConditionType;
  luas_terdampak_ha: number;
  skor: number;
}

export interface QualityCategoryItem {
  kategori: string;
  jumlah: number;
}

export interface QualityFindingItem {
  sumber_berkas: string;
  pengenal_baris: string;
  kategori: string;
  masalah: string;
  tindakan: string;
}

export interface QualityDataResponse {
  data: QualityCategoryItem[];
  rincian: QualityFindingItem[];
}

export interface SupplementalImportResult {
  ditambah: number;
  diubah: number;
  dibatalkan: number;
  tidak_berubah: number;
}

export interface HealthStatus {
  status: 'memuat' | 'siap';
}

export interface VersionInfo {
  versi_kontrak: string;
}
