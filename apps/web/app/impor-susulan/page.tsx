'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Loader2, 
  Check, 
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { triggerSupplementalImport } from '@/lib/api';
import { SupplementalImportResult } from '@/types';
import AnimatedNumber from '@/components/reactbits/AnimatedNumber';
import FadeIn from '@/components/reactbits/FadeIn';

interface ImportHistoryItem {
  id: string;
  tanggal: string;
  file: string;
  ditambah: number;
  diubah: number;
  dibatalkan: number;
  tidak_berubah: number;
  status: 'Berhasil' | 'Gagal';
}

export default function SupplementalImportPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('20 Jan 2026, 10:24');
  
  // Results initialized with reference numbers
  const [result, setResult] = useState<SupplementalImportResult>({
    ditambah: 28,
    diubah: 12,
    dibatalkan: 5,
    tidak_berubah: 1204,
  });

  const [history, setHistory] = useState<ImportHistoryItem[]>([
    {
      id: '1',
      tanggal: '20 Jan 2026, 10:24',
      file: 'laporan_susulan.xlsx',
      ditambah: 28,
      diubah: 12,
      dibatalkan: 5,
      tidak_berubah: 1204,
      status: 'Berhasil',
    },
    {
      id: '2',
      tanggal: '15 Jan 2026, 15:17',
      file: 'laporan_susulan.xlsx',
      ditambah: 0,
      diubah: 0,
      dibatalkan: 0,
      tidak_berubah: 1245,
      status: 'Berhasil',
    },
  ]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRunImport = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const res = await triggerSupplementalImport();
      setResult(res);
      const nowStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastSyncTime(nowStr);

      const newHistoryItem: ImportHistoryItem = {
        id: Date.now().toString(),
        tanggal: nowStr,
        file: 'laporan_susulan.xlsx',
        ditambah: res.ditambah,
        diubah: res.diubah,
        dibatalkan: res.dibatalkan,
        tidak_berubah: res.tidak_berubah,
        status: 'Berhasil',
      };

      setHistory((prev) => [newHistoryItem, ...prev]);
      setNotification({
        type: 'success',
        message: `Impor data susulan berhasil diproses secara atomik dan idempotent.`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Gagal memproses berkas laporan_susulan.xlsx',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatThousand = (val: number) => {
    return val.toLocaleString('id-ID');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Matching Mockup 100% */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
            Impor Data Susulan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Memproses laporan penelusuran susulan (laporan_susulan.xlsx)
          </p>
        </div>

        {/* Timestamp on right with checkmark */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
          <Check size={14} className="text-[#16a34a] stroke-[3]" />
          <span>{lastSyncTime}</span>
        </div>
      </div>

      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 shadow-2xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </motion.div>
      )}

      {/* Top Section: Two Cards Matching Mockup 100% */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: File Details & Run Import Button */}
        <FadeIn delay={0.1} className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs h-full flex flex-col justify-between">
            <div className="flex items-start gap-4">
              {/* Excel Green Document Icon */}
              <div className="w-14 h-14 rounded-xl bg-[#107c41] flex items-center justify-center text-white shadow-xs flex-shrink-0">
                <span className="font-sans font-black text-2xl tracking-tighter">X</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  laporan_susulan.xlsx
                </h3>
                <span className="inline-block mt-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Siap diproses
                </span>
                <p className="text-xs text-slate-400 mt-1.5">
                  Ukuran: 2.4 MB
                </p>
              </div>
            </div>

            {/* Jalankan Impor Button */}
            <div className="mt-6 pt-2">
              <button
                onClick={handleRunImport}
                disabled={loading}
                className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:bg-slate-300 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />
                    <span>Memproses Data Susulan...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-white" />
                    <span>Jalankan Impor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </FadeIn>

        {/* Right Card: Hasil Impor Terakhir (4 Colored Badges in a Row) */}
        <FadeIn delay={0.15} className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs h-full flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Hasil Impor Terakhir
            </h3>

            {/* 4 Colored Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Badge 1: Ditambah (Green) */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                  <span>+</span> Ditambah
                </span>
                <div className="text-2xl font-black text-emerald-800 font-mono mt-2">
                  <AnimatedNumber value={result.ditambah} />
                </div>
              </div>

              {/* Badge 2: Diubah (Sky Blue) */}
              <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] font-bold text-sky-700 flex items-center justify-center gap-1">
                  <span>✏</span> Diubah
                </span>
                <div className="text-2xl font-black text-sky-800 font-mono mt-2">
                  <AnimatedNumber value={result.diubah} />
                </div>
              </div>

              {/* Badge 3: Dibatalkan (Rose/Red) */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 text-center">
                <span className="text-[11px] font-bold text-rose-700 flex items-center justify-center gap-1">
                  <span>✕</span> Dibatalkan
                </span>
                <div className="text-2xl font-black text-rose-800 font-mono mt-2">
                  <AnimatedNumber value={result.dibatalkan} />
                </div>
              </div>

              {/* Badge 4: Tidak Berubah (Slate/Gray) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 text-center">
                <span className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1">
                  <span>=</span> Tidak Berubah
                </span>
                <div className="text-2xl font-black text-slate-800 font-mono mt-2">
                  <AnimatedNumber value={result.tidak_berubah} formatComma={false} />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4">
              Pembaruan status otomatis memicu rekalkulasi kondisi terkini dan pembaruan prioritas penanganan.
            </p>
          </div>
        </FadeIn>
      </div>

      {/* Bottom Card: Riwayat Impor Table Matching Mockup 100% */}
      <FadeIn delay={0.2}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-[#f8fafc]">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Riwayat Impor
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8fafc] text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Tanggal Proses</th>
                  <th className="py-3 px-5">File</th>
                  <th className="py-3 px-4 text-center">Ditambah</th>
                  <th className="py-3 px-4 text-center">Diubah</th>
                  <th className="py-3 px-4 text-center">Dibatalkan</th>
                  <th className="py-3 px-4 text-center">Tidak Berubah</th>
                  <th className="py-3 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-sans text-slate-700 font-medium">{row.tanggal}</td>
                    <td className="py-3 px-5 text-slate-900 font-medium">{row.file}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">{row.ditambah}</td>
                    <td className="py-3 px-4 text-center font-bold text-sky-700">{row.diubah}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-700">{row.dibatalkan}</td>
                    <td className="py-3 px-4 text-center text-slate-800">{formatThousand(row.tidak_berubah)}</td>
                    <td className="py-3 px-5 text-center font-sans">
                      <span className="bg-[#16a34a] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md inline-block shadow-2xs">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
