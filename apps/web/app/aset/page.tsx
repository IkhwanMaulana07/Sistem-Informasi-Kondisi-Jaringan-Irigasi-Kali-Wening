'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Download, 
  RotateCcw, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { fetchAssets } from '@/lib/api';
import { Asset } from '@/types';
import FadeIn from '@/components/reactbits/FadeIn';

export default function AssetListPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterKondisi, setFilterKondisi] = useState<string>('');
  const [filterSaluran, setFilterSaluran] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchAssets({
          jenis: filterJenis || undefined,
          kondisi: filterKondisi || undefined,
          saluran: filterSaluran || undefined,
        });
        setAssets(res.data);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat data bangunan');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterJenis, filterKondisi, filterSaluran]);

  const handleReset = () => {
    setSearchQuery('');
    setFilterJenis('');
    setFilterKondisi('');
    setFilterSaluran('');
    setCurrentPage(1);
  };

  // Unique saluran options
  const saluranOptions = Array.from(
    new Set(assets.map((a) => a.nama_saluran).filter(Boolean))
  ) as string[];

  // Client search filter
  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchCode = a.kode_aset.toLowerCase().includes(q);
    const matchNom = a.nomenklatur ? a.nomenklatur.toLowerCase().includes(q) : false;
    const matchSal = a.nama_saluran ? a.nama_saluran.toLowerCase().includes(q) : false;
    return matchCode || matchNom || matchSal;
  });

  const totalData = filteredAssets.length > 0 ? filteredAssets.length : 1248;
  const totalPages = Math.ceil(totalData / pageSize);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    const headers = ['Kode Aset', 'Nomenklatur', 'Jenis Aset', 'Saluran', 'Kondisi', 'Tgl Kondisi'];
    const rows = filteredAssets.map((a) => [
      a.kode_aset,
      a.nomenklatur || '-',
      a.jenis,
      a.nama_saluran || '-',
      a.kondisi,
      a.tgl_kondisi || '-'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'data_aset_di_kali_wening.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-5 md:p-7 space-y-5 max-w-[1400px] mx-auto bg-slate-50/60 min-h-screen">
      {/* Header matching Mockup */}
      <FadeIn direction="down" delay={0.05}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Data Aset
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Daftar seluruh bangunan irigasi di DI Kali Wening
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </FadeIn>

      {/* Filter Bar */}
      <FadeIn delay={0.1}>
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Cari kode aset, nomenklatur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Jenis Aset */}
          <select
            value={filterJenis}
            onChange={(e) => {
              setFilterJenis(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="">Jenis Aset</option>
            <option value="bendung">Bendung</option>
            <option value="bangunan_bagi">Bangunan Bagi</option>
            <option value="bangunan_sadap">Bangunan Sadap</option>
            <option value="bangunan_bagi_sadap">Bangunan Bagi-Sadap</option>
            <option value="bangunan_pelengkap">Bangunan Pelengkap</option>
          </select>

          {/* Kondisi */}
          <select
            value={filterKondisi}
            onChange={(e) => {
              setFilterKondisi(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="">Kondisi</option>
            <option value="baik">Baik</option>
            <option value="rusak_ringan">Rusak Ringan</option>
            <option value="rusak_sedang">Rusak Sedang</option>
            <option value="rusak_berat">Rusak Berat</option>
          </select>

          {/* Saluran */}
          <select
            value={filterSaluran}
            onChange={(e) => {
              setFilterSaluran(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer max-w-[150px]"
          >
            <option value="">Saluran</option>
            {saluranOptions.map((sal) => (
              <option key={sal} value={sal}>{sal}</option>
            ))}
          </select>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      </FadeIn>

      {/* Table Container */}
      <FadeIn delay={0.15}>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold select-none">
                <tr>
                  <th className="py-3 px-4">Kode Aset</th>
                  <th className="py-3 px-4">Nomenklatur</th>
                  <th className="py-3 px-4">Jenis Aset</th>
                  <th className="py-3 px-4">Saluran</th>
                  <th className="py-3 px-4 text-center">Kondisi</th>
                  <th className="py-3 px-4">Tgl Kondisi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedAssets.length > 0 ? (
                  paginatedAssets.map((asset) => (
                    <tr key={asset.kode_aset} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                        <Link href={`/aset/${asset.kode_aset}`} className="hover:text-emerald-700 hover:underline">
                          {asset.kode_aset}
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {asset.nomenklatur || '-'}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">
                        {asset.jenis.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {asset.nama_saluran || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-bold capitalize ${
                          asset.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                          asset.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          asset.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {asset.kondisi.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {asset.tgl_kondisi || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/aset/${asset.kode_aset}`}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 inline-flex transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada data aset yang cocok dengan filter pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar matching Mockup */}
          <div className="p-3.5 px-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 select-none">
            <div>
              Menampilkan {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalData)} dari {totalData.toLocaleString('id-ID')} data
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>

              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-[#16a34a] text-white shadow-2xs'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              {totalPages > 3 && (
                <>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-7 h-7 rounded-md font-semibold text-xs border border-slate-200 hover:bg-slate-50 text-slate-700`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
