'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Filter, 
  MapPin, 
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { fetchAssets } from '@/lib/api';
import { Asset, AssetType, ConditionType } from '@/types';

export default function AssetListPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [filterKondisi, setFilterKondisi] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchAssets({
          jenis: filterJenis || undefined,
          kondisi: filterKondisi || undefined,
        });
        setAssets(res.data);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat data bangunan');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterJenis, filterKondisi]);

  // Client-side text filter for search query
  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchCode = a.kode_aset.toLowerCase().includes(q);
    const matchNom = a.nomenklatur ? a.nomenklatur.toLowerCase().includes(q) : false;
    const matchSal = a.nama_saluran ? a.nama_saluran.toLowerCase().includes(q) : false;
    return matchCode || matchNom || matchSal;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-teal-600" size={24} />
            Daftar Bangunan Irigasi
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Data inventaris bangunan irigasi DI Kali Wening beserta kondisi terkini dan status pemeliharaan.
          </p>
        </div>
        <div className="text-xs bg-slate-200/80 font-semibold px-3 py-1.5 rounded-lg text-slate-700">
          Total: {filteredAssets.length} Bangunan
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode aset, nomenklatur, atau nama saluran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Jenis */}
        <div className="w-full md:w-56">
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">Semua Jenis Bangunan</option>
            <option value="bendung">Bendung</option>
            <option value="bangunan_bagi">Bangunan Bagi</option>
            <option value="bangunan_sadap">Bangunan Sadap</option>
            <option value="bangunan_bagi_sadap">Bangunan Bagi-Sadap</option>
            <option value="bangunan_pelengkap">Bangunan Pelengkap</option>
          </select>
        </div>

        {/* Filter Kondisi */}
        <div className="w-full md:w-48">
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700"
          >
            <option value="">Semua Kondisi</option>
            <option value="baik">Baik</option>
            <option value="rusak_ringan">Rusak Ringan</option>
            <option value="rusak_sedang">Rusak Sedang</option>
            <option value="rusak_berat">Rusak Berat</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="animate-spin text-teal-600" size={30} />
            <span className="text-xs">Memuat daftar bangunan...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Tidak ada bangunan yang sesuai dengan kriteria filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Kode Aset</th>
                  <th className="py-3 px-4">Nomenklatur</th>
                  <th className="py-3 px-4">Jenis Bangunan</th>
                  <th className="py-3 px-4">Nama Saluran</th>
                  <th className="py-3 px-4">Kondisi Terkini</th>
                  <th className="py-3 px-4">Tanggal Kondisi</th>
                  <th className="py-3 px-4">Tanda Kualitas</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.map((asset) => (
                  <tr key={asset.kode_aset} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <Link 
                        href={`/aset/${asset.kode_aset}`}
                        className="text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {asset.kode_aset}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {asset.nomenklatur || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {asset.jenis.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {asset.nama_saluran || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        asset.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                        asset.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        asset.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {asset.kondisi.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {asset.tgl_kondisi || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {asset.tanda && asset.tanda.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {asset.tanda.map((t) => (
                            <span key={t} className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[10px]">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {asset.lon !== null && asset.lat !== null && (
                          <Link
                            href={`/peta?aset=${asset.kode_aset}`}
                            title="Tampilkan di peta"
                            className="p-1 text-slate-500 hover:text-teal-600 rounded hover:bg-slate-100"
                          >
                            <MapPin size={15} />
                          </Link>
                        )}
                        <Link
                          href={`/aset/${asset.kode_aset}`}
                          className="flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1 rounded"
                        >
                          Detail <ArrowRight size={12} />
                        </Link>
                      </div>
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
