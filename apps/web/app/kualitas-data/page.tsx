'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  Loader2, 
  FileText, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { fetchQualityData } from '@/lib/api';
import { QualityDataResponse, QualityCategoryItem, QualityFindingItem } from '@/types';

export default function QualityDataPage() {
  const [data, setData] = useState<QualityDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchQualityData();
        setData(res);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat temuan kualitas data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = data?.data || [];
  const findings = data?.rincian || [];

  const filteredFindings = findings.filter((f) => {
    if (selectedCategory && f.kategori !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchFile = f.sumber_berkas.toLowerCase().includes(q);
      const matchId = f.pengenal_baris.toLowerCase().includes(q);
      const matchProb = f.masalah.toLowerCase().includes(q);
      const matchAct = f.tindakan.toLowerCase().includes(q);
      return matchFile || matchId || matchProb || matchAct;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="text-teal-600" size={24} />
          Audit Kualitas Data & Tindakan Pembersihan
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Daftar temuan anomali data sumber beserta catatan tindakan koreksi, penandaan, dan deduplikasi yang dilakukan secara deterministik dan transparan.
        </p>
      </div>

      {/* Summary of Categories (11 Mandatory Categories) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
          <span>Ringkasan Temuan per Kategori Wajib</span>
          <span className="text-[11px] font-normal text-slate-500">
            Total {findings.length} Catatan Tindakan
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.kategori;
            return (
              <button
                key={cat.kategori}
                onClick={() => setSelectedCategory(isSelected ? '' : cat.kategori)}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-teal-50 border-teal-500 shadow-xs' 
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-medium text-slate-600 truncate block w-full" title={cat.kategori}>
                  {cat.kategori.replace(/_/g, ' ')}
                </span>
                <span className={`text-lg font-bold mt-1 font-mono ${cat.jumlah > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                  {cat.jumlah}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID baris, sumber berkas, deskripsi masalah, atau tindakan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Category filter dropdown */}
        <div className="w-full md:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">Semua Kategori ({findings.length})</option>
            {categories.map((cat) => (
              <option key={cat.kategori} value={cat.kategori}>
                {cat.kategori.replace(/_/g, ' ')} ({cat.jumlah})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Findings Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Rincian Log Temuan dan Tindakan
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {filteredFindings.length} baris ditampilkan
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="animate-spin text-teal-600" size={30} />
            <span className="text-xs">Memuat catatan kualitas data...</span>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Tidak ada temuan kualitas data yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Sumber Berkas</th>
                  <th className="py-3 px-4">Pengenal Baris</th>
                  <th className="py-3 px-4">Kategori Masalah</th>
                  <th className="py-3 px-4">Uraian Masalah</th>
                  <th className="py-3 px-4">Tindakan Pembersihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFindings.map((f, idx) => (
                  <tr key={`${f.sumber_berkas}-${f.pengenal_baris}-${f.kategori}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {f.sumber_berkas}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {f.pengenal_baris}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {f.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      {f.masalah}
                    </td>
                    <td className="py-3 px-4 text-teal-900 font-medium max-w-sm">
                      {f.tindakan}
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
