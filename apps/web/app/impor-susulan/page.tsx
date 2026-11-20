'use client';

import React, { useState } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ShieldCheck,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { triggerSupplementalImport } from '@/lib/api';
import { SupplementalImportResult } from '@/types';

export default function SupplementalImportPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SupplementalImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setError(null);
    setLoading(true);
    try {
      const res = await triggerSupplementalImport();
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Gagal menjalankan proses impor susulan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UploadCloud className="text-teal-600" size={26} />
          Impor Data Penelusuran Susulan
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Memproses data penelusuran periode berikutnya dari berkas konfigurasi <span className="font-mono text-slate-700 font-semibold">laporan_susulan.xlsx</span>.
        </p>
      </div>

      {/* Info Card on Idempotency and Policies */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={16} />
          Ketentuan & Jaminan Idempotensi
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Proses impor susulan dirancang aman untuk dipanggil berulang kali. Setiap pemanggilan membandingkan data dengan isi basis data dalam transaksi atomik:
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <li className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <strong className="text-emerald-400 block mb-0.5">Laporan Baru:</strong>
            ID laporan yang belum ada akan ditambahkan dan dicocokkan ke aset terkait.
          </li>
          <li className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <strong className="text-sky-400 block mb-0.5">Laporan Diperbarui:</strong>
            ID laporan yang sudah ada akan diperbarui atribut dan kondisinya.
          </li>
          <li className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <strong className="text-amber-400 block mb-0.5">Laporan Dibatalkan:</strong>
            Status diubah menjadi batal, dan kondisi aset dihitung ulang tanpa laporan tersebut.
          </li>
          <li className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
            <strong className="text-slate-400 block mb-0.5">Kondisi & Prioritas:</strong>
            Kondisi terkini aset dan ranking prioritas langsung diperbarui otomatis.
          </li>
        </ul>
      </div>

      {/* Execution Action Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Jalankan Proses Impor Susulan</h3>
          <p className="text-xs text-slate-500 mt-1">
            Membaca dan memproses <span className="font-mono text-slate-700 font-semibold">laporan_susulan.xlsx</span> dari direktori data server.
          </p>
        </div>

        <button
          onClick={handleImport}
          disabled={loading}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 text-white text-xs font-bold px-6 py-3 rounded-lg shadow-sm transition"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>Memproses Impor...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>Mulai Impor Susulan</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 text-xs">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Proses Impor Gagal</h4>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result Counters */}
      {result && (
        <div className="bg-white p-6 rounded-xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Impor Susulan Berhasil Diproses</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Ditambah</span>
              <p className="text-3xl font-extrabold text-emerald-950 mt-1 font-mono">{result.ditambah}</p>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Laporan baru</span>
            </div>

            <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">Diubah</span>
              <p className="text-3xl font-extrabold text-sky-950 mt-1 font-mono">{result.diubah}</p>
              <span className="text-[10px] text-sky-600 mt-0.5 block">Pembaruan data</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Dibatalkan</span>
              <p className="text-3xl font-extrabold text-amber-950 mt-1 font-mono">{result.dibatalkan}</p>
              <span className="text-[10px] text-amber-600 mt-0.5 block">Status batal</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Tidak Berubah</span>
              <p className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">{result.tidak_berubah}</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Identik / idempoten</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
            <Link
              href="/prioritas"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5"
            >
              <span>Periksa Daftar Prioritas Baru</span>
              <ArrowRight size={14} />
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              href="/aset"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5"
            >
              <span>Periksa Kondisi Aset Terkini</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
