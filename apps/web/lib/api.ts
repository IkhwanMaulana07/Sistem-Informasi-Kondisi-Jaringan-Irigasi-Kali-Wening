import {
  Asset,
  AssetDetail,
  AssetImpact,
  CanalSummaryItem,
  PriorityItem,
  QualityDataResponse,
  SupplementalImportResult,
  HealthStatus,
  VersionInfo,
} from '@/types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal mengambil status health');
  return res.json();
}

export async function fetchVersion(): Promise<VersionInfo> {
  const res = await fetch(`${API_BASE}/versi`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal mengambil versi kontrak');
  return res.json();
}

export async function fetchAssets(params?: {
  jenis?: string;
  kondisi?: string;
  saluran?: string;
}): Promise<{ jumlah: number; data: Asset[] }> {
  const query = new URLSearchParams();
  if (params?.jenis) query.append('jenis', params.jenis);
  if (params?.kondisi) query.append('kondisi', params.kondisi);
  if (params?.saluran) query.append('saluran', params.saluran);

  const url = `${API_BASE}/aset${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat daftar aset');
  return res.json();
}

export async function fetchAssetDetail(kode_aset: string): Promise<AssetDetail> {
  const res = await fetch(`${API_BASE}/aset/${encodeURIComponent(kode_aset)}`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Aset '${kode_aset}' tidak ditemukan`);
    throw new Error('Gagal memuat detail aset');
  }
  return res.json();
}

export async function fetchAssetImpact(kode_aset: string): Promise<AssetImpact> {
  const res = await fetch(`${API_BASE}/aset/${encodeURIComponent(kode_aset)}/dampak`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat analisis dampak');
  return res.json();
}

export async function fetchCanalSummary(): Promise<{ data: CanalSummaryItem[] }> {
  const res = await fetch(`${API_BASE}/rekap/saluran`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat rekap saluran');
  return res.json();
}

export async function fetchPriorities(limit: number = 20): Promise<{ data: PriorityItem[] }> {
  const res = await fetch(`${API_BASE}/prioritas?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat daftar prioritas');
  return res.json();
}

export async function fetchQualityData(): Promise<QualityDataResponse> {
  const res = await fetch(`${API_BASE}/kualitas-data`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat data kualitas');
  return res.json();
}

export async function triggerSupplementalImport(): Promise<SupplementalImportResult> {
  const res = await fetch(`${API_BASE}/impor/susulan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Gagal menjalankan impor susulan');
  }
  return res.json();
}

// Map GeoJSON fetchers
export async function fetchMapCanals(): Promise<any> {
  const res = await fetch(`${API_BASE}/peta/saluran`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat data peta saluran');
  return res.json();
}

export async function fetchMapAssets(): Promise<any> {
  const res = await fetch(`${API_BASE}/peta/bangunan`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat data peta bangunan');
  return res.json();
}

export async function fetchMapPlots(): Promise<any> {
  const res = await fetch(`${API_BASE}/peta/petak`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat data peta petak');
  return res.json();
}
