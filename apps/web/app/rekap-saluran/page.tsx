'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Loader2, Info } from 'lucide-react';
import { fetchCanalSummary } from '@/lib/api';
import { CanalSummaryItem } from '@/types';

export default function CanalSummaryPage() {
  const [data, setData] = useState<CanalSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchCanalSummary();
        setData(res.data);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat rekap saluran');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalLengthKm = data.reduce((acc, item) => acc + item.panjang_km, 0);

  // Split by primer and sekunder
  const primerTotal = data.filter(d => d.tingkat === 'primer').reduce((acc, i) => acc + i.panjang_km, 0);
  const sekunderTotal = data.filter(d => d.tingkat === 'sekunder').reduce((acc, i) => acc + i.panjang_km, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="text-teal-600" size={24} />
          Rekapitulasi Panjang Ruas Saluran
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Ringkasan panjang saluran irigasi dikelompokkan menurut tingkat saluran dan kondisi fisik (dalam kilometer).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Panjang Saluran
          </span>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {totalLengthKm.toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Setelah deduplikasi ruas ganda</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Saluran Primer
          </span>
          <h3 className="text-2xl font-bold text-teal-700 mt-1 font-mono">
            {primerTotal.toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalLengthKm ? ((primerTotal / totalLengthKm) * 100).toFixed(1) : 0}% dari total jaringan
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Saluran Sekunder
          </span>
          <h3 className="text-2xl font-bold text-sky-700 mt-1 font-mono">
            {sekunderTotal.toFixed(2)} <span className="text-sm font-normal text-slate-500">km</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {totalLengthKm ? ((sekunderTotal / totalLengthKm) * 100).toFixed(1) : 0}% dari total jaringan
          </p>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Tabel Panjang per Tingkat dan Kondisi
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Presisi 2 Angka Desimal
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="animate-spin text-teal-600" size={30} />
            <span className="text-xs">Memuat rekapitulasi panjang saluran...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-5">Tingkat Saluran</th>
                  <th className="py-3 px-5">Kondisi Fisik</th>
                  <th className="py-3 px-5 text-right">Panjang (km)</th>
                  <th className="py-3 px-5 text-right">Proporsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => {
                  const share = totalLengthKm > 0 ? (item.panjang_km / totalLengthKm) * 100 : 0;
                  return (
                    <tr key={`${item.tingkat}-${item.kondisi}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-5 font-bold uppercase text-slate-800">
                        {item.tingkat}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                          item.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          item.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {item.kondisi.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900 text-sm">
                        {item.panjang_km.toFixed(2)} km
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-500 font-mono text-xs">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                  <td colSpan={2} className="py-3 px-5 uppercase text-xs">Total Seluruh Jaringan</td>
                  <td className="py-3 px-5 text-right font-mono text-sm text-teal-800">
                    {totalLengthKm.toFixed(2)} km
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-xs">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
