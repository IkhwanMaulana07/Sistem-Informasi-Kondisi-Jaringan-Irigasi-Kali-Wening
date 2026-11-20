'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { fetchPriorities } from '@/lib/api';
import { PriorityItem } from '@/types';

export default function PriorityPage() {
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [limit, setLimit] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchPriorities(limit);
        setPriorities(res.data);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat daftar prioritas');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [limit]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={24} />
            Prioritas Pemeliharaan Jaringan
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Urutan prioritas pemeliharaan bangunan berdasarkan tingkat kerusakan dan luas dampak layanan hilir.
          </p>
        </div>

        {/* Limit Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
          <SlidersHorizontal size={14} className="text-slate-500" />
          <span className="text-slate-500">Tampilkan:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value={10}>10 Teratas</option>
            <option value={20}>20 Teratas (Default)</option>
            <option value={50}>50 Teratas</option>
            <option value={100}>Semua Prioritas</option>
          </select>
        </div>
      </div>

      {/* Formula Explanation Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info size={14} />
            Metodologi Perhitungan Skor
          </h2>
          <p className="text-xs text-slate-300">
            Skor dihitung secara deterministik dengan mengalikan bobot kondisi terhadap total luas petak layanan hilir:
          </p>
          <p className="text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded text-teal-300 inline-block mt-2">
            skor = bobot_kondisi × luas_terdampak_ha
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-800/80 p-2 rounded border border-slate-700/80 text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Baik</span>
            <span className="font-bold text-emerald-400">Bobot 0</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded border border-slate-700/80 text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Rusak Ringan</span>
            <span className="font-bold text-amber-400">Bobot 1</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded border border-slate-700/80 text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Rusak Sedang</span>
            <span className="font-bold text-orange-400">Bobot 2</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded border border-slate-700/80 text-center">
            <span className="text-slate-400 text-[10px] block uppercase">Rusak Berat</span>
            <span className="font-bold text-red-400">Bobot 4</span>
          </div>
        </div>
      </div>

      {/* Priority Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="animate-spin text-teal-600" size={30} />
            <span className="text-xs">Menghitung dan memeringkat prioritas...</span>
          </div>
        ) : priorities.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Tidak ada bangunan dengan skor prioritas positif.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4 text-center">Peringkat</th>
                  <th className="py-3 px-4">Kode Aset</th>
                  <th className="py-3 px-4">Kondisi Terkini</th>
                  <th className="py-3 px-4 text-right">Luas Terdampak (ha)</th>
                  <th className="py-3 px-4 text-right">Skor Prioritas</th>
                  <th className="py-3 px-4 text-center">Navigasi Peta</th>
                  <th className="py-3 px-4 text-center">Detail Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorities.map((item) => (
                  <tr key={item.kode_aset} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        item.peringkat === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-sm' :
                        item.peringkat === 2 ? 'bg-slate-200 text-slate-800' :
                        item.peringkat === 3 ? 'bg-orange-100 text-orange-900' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.peringkat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                      <Link 
                        href={`/aset/${item.kode_aset}`}
                        className="hover:text-teal-700 hover:underline"
                      >
                        {item.kode_aset}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                        item.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.kondisi.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 text-xs">
                      {item.luas_terdampak_ha.toFixed(2)} ha
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-teal-800 text-sm">
                      {item.skor.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/peta?aset=${item.kode_aset}`}
                        className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold px-2.5 py-1 rounded transition text-[11px]"
                      >
                        <MapPin size={13} />
                        Lihat di Peta
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/aset/${item.kode_aset}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium text-[11px] hover:underline"
                      >
                        Rincian <ArrowRight size={12} />
                      </Link>
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
