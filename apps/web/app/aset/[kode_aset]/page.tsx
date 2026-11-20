'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  TrendingDown
} from 'lucide-react';
import { fetchAssetDetail, fetchAssetImpact } from '@/lib/api';
import { AssetDetail, AssetImpact } from '@/types';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kode_aset = params?.kode_aset as string;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [impact, setImpact] = useState<AssetImpact | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        <Loader2 className="animate-spin text-teal-600" size={36} />
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
          className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Kembali ke Daftar Bangunan
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <Link href="/aset" className="hover:text-slate-900 flex items-center gap-1 font-medium">
          <ArrowLeft size={14} /> Daftar Bangunan
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold font-mono">{asset.kode_aset}</span>
      </div>

      {/* Main Asset Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded uppercase">
              {asset.jenis.replace(/_/g, ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              asset.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
              asset.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
              asset.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              Kondisi: {asset.kondisi.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 font-mono flex items-center gap-3">
            {asset.kode_aset}
            {asset.nomenklatur && (
              <span className="text-slate-500 font-normal text-lg">({asset.nomenklatur})</span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
            <span>Saluran: <strong className="text-slate-700">{asset.nama_saluran || '-'}</strong></span>
            <span>Tanggal Kondisi: <strong className="text-slate-700">{asset.tgl_kondisi || '-'}</strong></span>
          </p>
        </div>

        {asset.lon !== null && asset.lat !== null && (
          <Link
            href={`/peta?aset=${asset.kode_aset}`}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <MapPin size={15} />
            Tampilkan di Peta
          </Link>
        )}
      </div>

      {/* Grid: Coordinates & Tags + Downstream Impact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <Info size={15} className="text-teal-600" />
            Informasi Geospasial
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Bujur (Lon)</span>
              <span className="font-mono text-slate-800">{asset.lon !== null ? asset.lon : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lintang (Lat)</span>
              <span className="font-mono text-slate-800">{asset.lat !== null ? asset.lat : '-'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Tanda Kualitas Data
            </span>
            {asset.tanda && asset.tanda.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {asset.tanda.map((t) => (
                  <span key={t} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 text-xs italic">Tidak ada catatan anomali kualitas</span>
            )}
          </div>
        </div>

        {/* Downstream Impact Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingDown size={15} className="text-orange-600" />
              Analisis Dampak Kerusakan Hilir
            </h2>
            {impact && (
              <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                Total: {impact.luas_terdampak_ha.toFixed(2)} ha ({impact.jumlah_petak} petak)
              </span>
            )}
          </div>

          {impact ? (
            <div className="space-y-3">
              {impact.jumlah_petak === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg">
                  Bangunan ini tidak memiliki petak tersier di hilirnya, atau bertanda jauh dari saluran.
                </p>
              ) : (
                <div>
                  <p className="text-xs text-slate-600 mb-2">
                    Bila bangunan ini mengalami kegagalan fungsi, pasokan air ke petak tersier berikut akan terputus:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {impact.petak.map((p) => (
                      <div key={p.kode_petak} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs">
                        <span className="font-mono font-bold text-slate-800">{p.kode_petak}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.luas_ha} ha</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">Dampak tidak tersedia</div>
          )}
        </div>
      </div>

      {/* Historical Inspection Reports (Active and Cancelled) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History size={16} className="text-teal-600" />
              Riwayat Laporan Penelusuran Lapangan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh laporan juru yang cocok dengan bangunan ini, termasuk laporan yang dibatalkan.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
            {asset.riwayat.length} Laporan
          </span>
        </div>

        {asset.riwayat.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Belum ada riwayat laporan penelusuran untuk bangunan ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">ID Laporan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Petugas</th>
                  <th className="py-3 px-4">Jenis Kerusakan</th>
                  <th className="py-3 px-4">Kondisi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Metode Cocok</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {asset.riwayat.map((rep) => (
                  <tr key={rep.id_laporan} className={`hover:bg-slate-50 transition ${
                    rep.status === 'batal' ? 'bg-slate-50/50 text-slate-400' : ''
                  }`}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {rep.id_laporan}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {rep.tanggal}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rep.petugas || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {rep.jenis_kerusakan || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        rep.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                        rep.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        rep.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {rep.kondisi.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {rep.status === 'aktif' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          <CheckCircle2 size={11} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase line-through">
                          <XCircle size={11} /> Batal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {rep.matching_method} {rep.matching_distance_m !== null ? `(${rep.matching_distance_m}m)` : ''}
                    </td>
                    <td className="py-3 px-4 text-slate-600 italic max-w-xs">
                      {rep.keterangan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
