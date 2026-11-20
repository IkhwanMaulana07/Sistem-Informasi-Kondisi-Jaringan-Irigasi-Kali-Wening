'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Layers, 
  ArrowLeft, 
  Loader2, 
  History,
  Info,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Map as MapIcon,
  Check,
  Clock,
  Droplets,
  LayoutGrid
} from 'lucide-react';
import { fetchAssetDetail, fetchAssetImpact } from '@/lib/api';
import { AssetDetail, AssetImpact, ConditionType } from '@/types';
import AnimatedNumber from '@/components/reactbits/AnimatedNumber';
import FadeIn from '@/components/reactbits/FadeIn';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kode_aset = params?.kode_aset as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [impact, setImpact] = useState<AssetImpact | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'riwayat' | 'dampak' | 'kualitas' | 'lokasi'>('info');

  useEffect(() => {
    async function load() {
      if (!kode_aset) return;
      try {
        setLoading(true);
        const [aRes, iRes] = await Promise.all([
          fetchAssetDetail(kode_aset),
          fetchAssetImpact(kode_aset).catch(() => null),
        ]);
        setAsset(aRes);
        setImpact(iRes);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat detail aset');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kode_aset]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-slate-400">
        <Loader2 className="animate-spin text-[#16a34a]" size={36} />
        <span className="text-xs font-medium">Memuat detail aset dan riwayat laporan...</span>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
          <h2 className="text-lg font-bold">Data Tidak Ditemukan</h2>
          <p className="text-xs mt-1">{error || 'Aset yang diminta tidak ditemukan di basis data.'}</p>
        </div>
        <button
          onClick={() => router.push('/aset')}
          className="text-xs font-semibold text-[#16a34a] hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Kembali ke Data Aset
        </button>
      </div>
    );
  }

  const formatJenisLabel = (j: string) => {
    if (j === 'bangunan_bagi_sadap') return 'Bagi-Sadap';
    if (j === 'bangunan_bagi') return 'Bagi';
    if (j === 'bangunan_sadap') return 'Sadap';
    if (j === 'bendung') return 'Bendung';
    if (j === 'bangunan_pelengkap') return 'Pelengkap';
    return j.replace(/_/g, ' ');
  };

  const getConditionBadge = (kondisi: ConditionType) => {
    switch (kondisi) {
      case 'baik':
        return <span className="bg-[#16a34a] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">Baik</span>;
      case 'rusak_ringan':
        return <span className="bg-[#eab308] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">Rusak Ringan</span>;
      case 'rusak_sedang':
        return <span className="bg-[#f97316] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">Rusak Sedang</span>;
      case 'rusak_berat':
      default:
        return <span className="bg-[#ef4444] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-2xs">Rusak Berat</span>;
    }
  };

  const formatDateDisplay = (d: string | null) => {
    if (!d) return '14 Jan 2026';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb matching mockup */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/aset" className="hover:text-slate-800 transition-colors font-medium">
          Data Aset
        </Link>
        <span>&gt;</span>
        <span className="text-slate-700 font-medium">Detail Aset</span>
      </div>

      {/* Main Asset Header Card matching mockup */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Left Title and Pill */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {asset.kode_aset}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              {asset.nomenklatur || formatJenisLabel(asset.jenis)}
            </span>
          </div>

          {/* Right Condition Badge & Subtitle */}
          <div className="flex flex-col items-start sm:items-end">
            {getConditionBadge(asset.kondisi)}
            <span className="text-[11px] text-slate-400 mt-1 font-medium">
              Kondisi per {formatDateDisplay(asset.tgl_kondisi)}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 border-b border-slate-200 mt-6 pt-1 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'info', label: 'Informasi' },
            { id: 'riwayat', label: 'Riwayat Laporan' },
            { id: 'dampak', label: 'Dampak Hilir' },
            { id: 'kualitas', label: 'Kualitas Data' },
            { id: 'lokasi', label: 'Lokasi' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-3 text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  isActive ? 'text-[#16a34a] font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeDetailTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#16a34a]"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Informasi (3-Column Layout Matching Mockup 100%) */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
              >
                {/* Left Column: Photo & View Map Button */}
                <div className="md:col-span-4 lg:col-span-3 space-y-3">
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100 aspect-[4/3] relative group">
                    <img
                      src="/images/weir.svg"
                      alt={asset.kode_aset}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent pointer-events-none" />
                  </div>

                  <button
                    onClick={() => router.push(`/peta?aset=${encodeURIComponent(asset.kode_aset)}&search=${encodeURIComponent(asset.kode_aset)}`)}
                    className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs flex items-center justify-center gap-2 transition"
                  >
                    <MapPin size={15} className="text-blue-500" />
                    <span>Lihat di Peta</span>
                  </button>
                </div>

                {/* Middle Column: Informasi Aset Key-Value Table */}
                <div className="md:col-span-4 lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 tracking-wide mb-4">
                    Informasi Aset
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Kode Aset</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="font-bold text-slate-900 font-mono">{asset.kode_aset}</span>
                    </div>

                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Nomenklatur</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="text-slate-800 font-medium">{asset.nomenklatur || '-'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Jenis Aset</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="text-slate-800 font-medium">{formatJenisLabel(asset.jenis)}</span>
                    </div>

                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Saluran</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="text-slate-800 font-medium">{asset.nama_saluran || '-'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Koordinat</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="font-mono text-slate-700 text-[11px]">
                        {asset.lat !== null && asset.lon !== null 
                          ? `${asset.lat.toFixed(6)}, ${asset.lon.toFixed(6)}`
                          : '-'}
                      </span>
                    </div>

                    <div className="flex">
                      <span className="w-36 text-slate-500 font-normal">Tanggal Inventaris</span>
                      <span className="text-slate-400 mr-2">:</span>
                      <span className="text-slate-800 font-medium">
                        {formatDateDisplay(asset.tgl_kondisi)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Dampak Hilir 2 Highlight Cards */}
                <div className="md:col-span-4 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 tracking-wide mb-4">
                    Dampak Hilir
                  </h3>

                  <div className="space-y-3.5">
                    {/* Metric 1: Petak Terdampak (Amber/Yellow tint) */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                        <LayoutGrid size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                          <AnimatedNumber value={impact?.jumlah_petak || 0} />
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          Petak Terdampak
                        </div>
                      </div>
                    </div>

                    {/* Metric 2: Luas Terdampak (Orange tint) */}
                    <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 flex-shrink-0">
                        <Droplets size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                          <AnimatedNumber 
                            value={impact?.luas_terdampak_ha || 0} 
                            decimals={2} 
                            formatComma 
                            suffix=" ha" 
                          />
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          Luas Terdampak
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Riwayat Laporan */}
            {activeTab === 'riwayat' && (
              <motion.div
                key="riwayat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Riwayat Laporan Penelusuran ({asset.riwayat.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Diurutkan berdasarkan tanggal terbaru</span>
                </div>
                {asset.riwayat.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Belum ada riwayat laporan penelusuran untuk bangunan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">ID Laporan</th>
                          <th className="py-2.5 px-4">Tanggal</th>
                          <th className="py-2.5 px-4">Petugas</th>
                          <th className="py-2.5 px-4">Jenis Kerusakan</th>
                          <th className="py-2.5 px-4">Kondisi</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Pencocokan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {asset.riwayat.map((r) => (
                          <tr key={r.id_laporan} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{r.id_laporan}</td>
                            <td className="py-2.5 px-4 text-slate-600">{formatDateDisplay(r.tanggal)}</td>
                            <td className="py-2.5 px-4 text-slate-600">{r.petugas || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-700">{r.jenis_kerusakan || '-'}</td>
                            <td className="py-2.5 px-4">{getConditionBadge(r.kondisi)}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.status === 'aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 font-mono text-[10px]">
                              {r.matching_method || 'exact'} {r.matching_distance_m ? `(${r.matching_distance_m.toFixed(1)}m)` : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 3: Dampak Hilir Detail */}
            {activeTab === 'dampak' && (
              <motion.div
                key="dampak"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Daftar Petak Tersier Terdampak ({impact?.petak.length || 0})
                  </h3>
                  <span className="text-xs font-bold text-amber-700 font-mono">
                    Total: {impact?.luas_terdampak_ha.toFixed(2) || '0.00'} ha
                  </span>
                </div>
                {!impact?.petak || impact.petak.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada petak tersier hilir yang terdampak oleh bangunan ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">Kode Petak Tersier</th>
                          <th className="py-2.5 px-4 text-right">Luas Lahan (ha)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {impact.petak.map((p, idx) => (
                          <tr key={p.kode_petak} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-4 text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-4 font-semibold text-slate-800">{p.kode_petak}</td>
                            <td className="py-2 px-4 text-right text-slate-700">{p.luas_ha.toFixed(2).replace('.', ',')} ha</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 4: Kualitas Data */}
            {activeTab === 'kualitas' && (
              <motion.div
                key="kualitas"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4"
              >
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Catatan Kualitas Data & Flag Pembersihan
                </h3>
                {(!asset.tanda || asset.tanda.length === 0) ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Tidak ditemukan anomali atau catatan khusus pada aset ini (data bersih).</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {asset.tanda.map((flag, i) => (
                      <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                        <span className="font-mono">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 5: Lokasi */}
            {activeTab === 'lokasi' && (
              <motion.div
                key="lokasi"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4"
              >
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Koordinat Spasial Geografis (WGS 84)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Latitude</span>
                    <span className="text-base font-bold text-slate-900 mt-1 block">
                      {asset.lat !== null ? asset.lat.toFixed(6) : 'Tidak ada data'}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Longitude</span>
                    <span className="text-base font-bold text-slate-900 mt-1 block">
                      {asset.lon !== null ? asset.lon.toFixed(6) : 'Tidak ada data'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/peta?aset=${encodeURIComponent(asset.kode_aset)}&search=${encodeURIComponent(asset.kode_aset)}`}
                    className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                  >
                    <MapIcon size={14} />
                    <span>Buka pada Peta Interaktif Jaringan Irigasi</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
