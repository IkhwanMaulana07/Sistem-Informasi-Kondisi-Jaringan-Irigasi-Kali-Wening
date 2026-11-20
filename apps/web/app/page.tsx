'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { 
  fetchAssets, 
  fetchCanalSummary, 
  fetchPriorities, 
  fetchQualityData, 
  fetchHealth 
} from '@/lib/api';
import { Asset, CanalSummaryItem, PriorityItem, QualityDataResponse } from '@/types';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [canalSummary, setCanalSummary] = useState<CanalSummaryItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [quality, setQuality] = useState<QualityDataResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('memuat');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [hRes, aRes, cRes, pRes, qRes] = await Promise.all([
          fetchHealth().catch(() => ({ status: 'memuat' as const })),
          fetchAssets().catch(() => ({ jumlah: 0, data: [] })),
          fetchCanalSummary().catch(() => ({ data: [] })),
          fetchPriorities(5).catch(() => ({ data: [] })),
          fetchQualityData().catch(() => ({ data: [], rincian: [] })),
        ]);

        setHealthStatus(hRes.status);
        setAssets(aRes.data);
        setCanalSummary(cRes.data);
        setPriorities(pRes.data);
        setQuality(qRes);
      } catch (err: any) {
        setError(err?.message || 'Terjadi kesalahan saat memuat data dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-slate-500">
        <Loader2 className="animate-spin text-teal-600" size={36} />
        <p className="text-sm font-medium">Memuat data operasional irigasi...</p>
      </div>
    );
  }

  // Derived statistics
  const totalAssets = assets.length;
  const conditionCounts = {
    baik: assets.filter(a => a.kondisi === 'baik').length,
    rusak_ringan: assets.filter(a => a.kondisi === 'rusak_ringan').length,
    rusak_sedang: assets.filter(a => a.kondisi === 'rusak_sedang').length,
    rusak_berat: assets.filter(a => a.kondisi === 'rusak_berat').length,
  };

  const totalCanalKm = canalSummary.reduce((acc, c) => acc + c.panjang_km, 0);
  const totalFindings = quality?.rincian?.length || 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-sm border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/60 border border-teal-800/80 px-2 py-0.5 rounded">
            Daerah Irigasi Kali Wening
          </span>
          <h1 className="text-xl md:text-2xl font-bold mt-2 text-white">
            Dashboard Kondisi Jaringan Irigasi
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            Sistem terintegrasi inventaris bangunan, laporan kerusakan penelusuran lapangan, analisis dampak hilir layanan petak tersier, dan audit kualitas data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/peta"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <MapPin size={15} />
            Buka Peta Interaktif
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bangunan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAssets}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Inventaris terverifikasi</p>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-700 rounded-xl flex items-center justify-center">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Panjang Saluran</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCanalKm.toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span></h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Primer & sekunder aktif</p>
          </div>
          <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
            <Layers size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aset Butuh Perbaikan</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {conditionCounts.rusak_sedang + conditionCounts.rusak_berat}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Rusak sedang & berat</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Temuan Kualitas Data</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalFindings}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Audit log tercatat</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Condition breakdown & Top Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Condition Distribution Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-teal-600" />
              Distribusi Kondisi Bangunan
            </h2>
            <p className="text-xs text-slate-500 mt-1">Status kondisi terkini berdasarkan resolusi tanggal sumber.</p>

            <div className="space-y-4 mt-6">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Baik
                  </span>
                  <span>{conditionCounts.baik} ({totalAssets ? Math.round((conditionCounts.baik/totalAssets)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${totalAssets ? (conditionCounts.baik/totalAssets)*100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-2 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Rusak Ringan
                  </span>
                  <span>{conditionCounts.rusak_ringan} ({totalAssets ? Math.round((conditionCounts.rusak_ringan/totalAssets)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${totalAssets ? (conditionCounts.rusak_ringan/totalAssets)*100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-2 text-orange-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Rusak Sedang
                  </span>
                  <span>{conditionCounts.rusak_sedang} ({totalAssets ? Math.round((conditionCounts.rusak_sedang/totalAssets)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${totalAssets ? (conditionCounts.rusak_sedang/totalAssets)*100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-2 text-red-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Rusak Berat
                  </span>
                  <span>{conditionCounts.rusak_berat} ({totalAssets ? Math.round((conditionCounts.rusak_berat/totalAssets)*100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: `${totalAssets ? (conditionCounts.rusak_berat/totalAssets)*100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <Link
              href="/aset"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center justify-between"
            >
              <span>Lihat semua bangunan</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Top Maintenance Priorities Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-600" />
                  Prioritas Pemeliharaan Tertinggi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dihitung otomatis: <span className="font-mono text-slate-700">skor = bobot × luas_terdampak_ha</span>
                </p>
              </div>
              <Link
                href="/prioritas"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Peringkat</th>
                    <th className="py-2.5 px-3">Kode Aset</th>
                    <th className="py-2.5 px-3">Kondisi</th>
                    <th className="py-2.5 px-3 text-right">Luas Terdampak</th>
                    <th className="py-2.5 px-3 text-right">Skor Prioritas</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priorities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Tidak ada bangunan yang memerlukan prioritas pemeliharaan darurat.
                      </td>
                    </tr>
                  ) : (
                    priorities.map((item) => (
                      <tr key={item.kode_aset} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            item.peringkat === 1 ? 'bg-amber-100 text-amber-800 font-bold' :
                            item.peringkat === 2 ? 'bg-slate-200 text-slate-800' :
                            item.peringkat === 3 ? 'bg-orange-100 text-orange-800' : 'text-slate-600'
                          }`}>
                            {item.peringkat}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 font-mono">
                          {item.kode_aset}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            item.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                            item.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.kondisi.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          {item.luas_terdampak_ha.toFixed(2)} ha
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                          {item.skor.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Link
                            href={`/peta?aset=${item.kode_aset}`}
                            className="text-teal-600 hover:text-teal-800 text-[11px] font-medium underline"
                          >
                            Lokasi
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
