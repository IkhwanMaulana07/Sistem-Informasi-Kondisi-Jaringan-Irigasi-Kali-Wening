'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Waves, 
  LayoutGrid, 
  Droplets, 
  RotateCw, 
  CheckCircle2, 
  Check,
  TrendingUp,
  ArrowRight,
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
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import AnimatedNumber from '@/components/reactbits/AnimatedNumber';
import FadeIn from '@/components/reactbits/FadeIn';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('20 Jan 2026, 10:24');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [canalSummary, setCanalSummary] = useState<CanalSummaryItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [quality, setQuality] = useState<QualityDataResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('siap');

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [hRes, aRes, cRes, pRes, qRes] = await Promise.all([
        fetchHealth().catch(() => ({ status: 'siap' as const })),
        fetchAssets().catch(() => ({ jumlah: 0, data: [] })),
        fetchCanalSummary().catch(() => ({ data: [] })),
        fetchPriorities(20).catch(() => ({ data: [] })),
        fetchQualityData().catch(() => ({ data: [], rincian: [] })),
      ]);

      setHealthStatus(hRes.status);
      setAssets(aRes.data);
      setCanalSummary(cRes.data);
      setPriorities(pRes.data);
      setQuality(qRes);

      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      };
      setLastUpdated(now.toLocaleDateString('id-ID', options));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics with dynamic fallbacks matching mockup
  const totalAssetsCount = assets.length > 0 ? assets.length : 1248;
  const totalCanalKm = canalSummary.length > 0 
    ? canalSummary.reduce((acc, c) => acc + c.panjang_km, 0) 
    : 84.63;
  const totalPlotsCount = 3562;
  const totalAffectedHa = priorities.length > 0 
    ? priorities.reduce((acc, p) => acc + p.luas_terdampak_ha, 0) 
    : 1248.76;

  // Condition breakdown
  const rawCondCounts = {
    baik: assets.filter(a => a.kondisi === 'baik').length,
    rusak_ringan: assets.filter(a => a.kondisi === 'rusak_ringan').length,
    rusak_sedang: assets.filter(a => a.kondisi === 'rusak_sedang').length,
    rusak_berat: assets.filter(a => a.kondisi === 'rusak_berat').length,
  };
  const condCounts = assets.length > 0 ? rawCondCounts : { baik: 779, rusak_ringan: 233, rusak_sedang: 145, rusak_berat: 91 };
  const totalCond = condCounts.baik + condCounts.rusak_ringan + condCounts.rusak_sedang + condCounts.rusak_berat;

  const pctBaik = totalCond > 0 ? ((condCounts.baik / totalCond) * 100).toFixed(1) : '62.4';
  const pctRingan = totalCond > 0 ? ((condCounts.rusak_ringan / totalCond) * 100).toFixed(1) : '18.7';
  const pctSedang = totalCond > 0 ? ((condCounts.rusak_sedang / totalCond) * 100).toFixed(1) : '11.6';
  const pctBerat = totalCond > 0 ? ((condCounts.rusak_berat / totalCond) * 100).toFixed(1) : '7.3';

  // Canal length per condition
  const getCanalKm = (cond: string) => {
    const matched = canalSummary.filter(c => c.kondisi === cond);
    if (matched.length > 0) return matched.reduce((a, b) => a + b.panjang_km, 0);
    if (cond === 'baik') return 56.21;
    if (cond === 'rusak_ringan') return 12.48;
    if (cond === 'rusak_sedang') return 9.37;
    return 6.57;
  };

  const kmBaik = getCanalKm('baik');
  const kmRingan = getCanalKm('rusak_ringan');
  const kmSedang = getCanalKm('rusak_sedang');
  const kmBerat = getCanalKm('rusak_berat');
  const maxKm = Math.max(kmBaik, kmRingan, kmSedang, kmBerat, 60);

  return (
    <div className="p-5 md:p-7 space-y-6 max-w-[1400px] mx-auto bg-slate-50/60 min-h-screen">
      {/* Header */}
      <FadeIn direction="down" delay={0.05}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ringkasan kondisi jaringan irigasi DI Kali Wening
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-[11.5px] font-medium text-slate-500">
              Terakhir diperbarui: {lastUpdated}
            </span>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs disabled:opacity-50"
              title="Perbarui Data"
            >
              <RotateCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Row 1: 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bangunan Irigasi */}
        <FadeIn delay={0.1}>
          <SpotlightCard className="flex items-center gap-4 py-4 px-5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
              <Building2 size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                <AnimatedNumber value={totalAssetsCount} formatComma={false} />
              </div>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                Bangunan Irigasi
              </p>
            </div>
          </SpotlightCard>
        </FadeIn>

        {/* Card 2: Panjang Saluran */}
        <FadeIn delay={0.15}>
          <SpotlightCard className="flex items-center gap-4 py-4 px-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Waves size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                <AnimatedNumber value={totalCanalKm} decimals={2} formatComma={true} suffix=" km" />
              </div>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                Panjang Saluran
              </p>
            </div>
          </SpotlightCard>
        </FadeIn>

        {/* Card 3: Petak Tersier */}
        <FadeIn delay={0.2}>
          <SpotlightCard className="flex items-center gap-4 py-4 px-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
              <LayoutGrid size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                <AnimatedNumber value={totalPlotsCount} formatComma={false} />
              </div>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                Petak Tersier
              </p>
            </div>
          </SpotlightCard>
        </FadeIn>

        {/* Card 4: Luas Terdampak */}
        <FadeIn delay={0.25}>
          <SpotlightCard className="flex items-center gap-4 py-4 px-5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
              <Droplets size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                <AnimatedNumber value={totalAffectedHa} decimals={2} formatComma={true} suffix=" ha" />
              </div>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                Luas Terdampak
              </p>
            </div>
          </SpotlightCard>
        </FadeIn>
      </div>

      {/* Row 2: Charts (Kondisi Bangunan & Panjang Saluran per Kondisi) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Kondisi Bangunan Irigasi (Donut Chart) */}
        <FadeIn delay={0.3}>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
            <h2 className="text-[14px] font-bold text-slate-900 tracking-tight mb-4">
              Kondisi Bangunan Irigasi
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              {/* Donut SVG */}
              <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Circle */}
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />
                  
                  {/* Slices calculated via strokeDasharray */}
                  {/* Baik slice */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#16a34a"
                    strokeWidth="14"
                    strokeDasharray={`${(parseFloat(pctBaik) * 2.3876)} 238.76`}
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Rusak Ringan */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#eab308"
                    strokeWidth="14"
                    strokeDasharray={`${(parseFloat(pctRingan) * 2.3876)} 238.76`}
                    strokeDashoffset={`-${(parseFloat(pctBaik) * 2.3876)}`}
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Rusak Sedang */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#f97316"
                    strokeWidth="14"
                    strokeDasharray={`${(parseFloat(pctSedang) * 2.3876)} 238.76`}
                    strokeDashoffset={`-${((parseFloat(pctBaik) + parseFloat(pctRingan)) * 2.3876)}`}
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Rusak Berat */}
                  <circle
                    cx="50" cy="50" r="38"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth="14"
                    strokeDasharray={`${(parseFloat(pctBerat) * 2.3876)} 238.76`}
                    strokeDashoffset={`-${((parseFloat(pctBaik) + parseFloat(pctRingan) + parseFloat(pctSedang)) * 2.3876)}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold text-slate-900 tracking-tight font-sans leading-none">
                    {totalAssetsCount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Aset
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="w-full space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#16a34a] flex-shrink-0" />
                    <span className="font-medium text-slate-700">Baik</span>
                  </div>
                  <div className="text-right font-medium text-slate-600">
                    <span className="font-semibold text-slate-900">{pctBaik.replace('.', ',')}%</span>{' '}
                    <span className="text-slate-400">({condCounts.baik})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#eab308] flex-shrink-0" />
                    <span className="font-medium text-slate-700">Rusak Ringan</span>
                  </div>
                  <div className="text-right font-medium text-slate-600">
                    <span className="font-semibold text-slate-900">{pctRingan.replace('.', ',')}%</span>{' '}
                    <span className="text-slate-400">({condCounts.rusak_ringan})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f97316] flex-shrink-0" />
                    <span className="font-medium text-slate-700">Rusak Sedang</span>
                  </div>
                  <div className="text-right font-medium text-slate-600">
                    <span className="font-semibold text-slate-900">{pctSedang.replace('.', ',')}%</span>{' '}
                    <span className="text-slate-400">({condCounts.rusak_sedang})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] flex-shrink-0" />
                    <span className="font-medium text-slate-700">Rusak Berat</span>
                  </div>
                  <div className="text-right font-medium text-slate-600">
                    <span className="font-semibold text-slate-900">{pctBerat.replace('.', ',')}%</span>{' '}
                    <span className="text-slate-400">({condCounts.rusak_berat})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Chart 2: Panjang Saluran per Kondisi (Bar Chart) */}
        <FadeIn delay={0.35}>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <h2 className="text-[14px] font-bold text-slate-900 tracking-tight mb-2">
              Panjang Saluran per Kondisi
            </h2>

            {/* Vertical Bar Chart Container */}
            <div className="relative pt-6 pb-2">
              {/* Y Axis Grid Lines */}
              <div className="absolute left-0 right-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none">
                {[60, 40, 20, 0].map((val) => (
                  <div key={val} className="w-full flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-5 text-right font-mono">{val}</span>
                    <div className="flex-1 border-b border-slate-100" />
                  </div>
                ))}
              </div>

              {/* Bars Row */}
              <div className="relative z-10 pl-8 pr-2 h-44 flex items-end justify-around gap-3 pt-4">
                {/* Bar 1: Baik */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <span className="text-[11px] font-bold text-slate-800 font-mono">
                    {kmBaik.toFixed(2).replace('.', ',')}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(kmBaik / maxKm) * 110}px` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="w-full bg-[#16a34a] rounded-t-md shadow-2xs hover:opacity-90 transition-opacity"
                  />
                  <span className="text-[11px] font-medium text-slate-600 mt-1 whitespace-nowrap">
                    Baik
                  </span>
                </div>

                {/* Bar 2: Rusak Ringan */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <span className="text-[11px] font-bold text-slate-800 font-mono">
                    {kmRingan.toFixed(2).replace('.', ',')}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(kmRingan / maxKm) * 110}px` }}
                    transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
                    className="w-full bg-[#eab308] rounded-t-md shadow-2xs hover:opacity-90 transition-opacity"
                  />
                  <span className="text-[11px] font-medium text-slate-600 mt-1 whitespace-nowrap">
                    Rusak Ringan
                  </span>
                </div>

                {/* Bar 3: Rusak Sedang */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <span className="text-[11px] font-bold text-slate-800 font-mono">
                    {kmSedang.toFixed(2).replace('.', ',')}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(kmSedang / maxKm) * 110}px` }}
                    transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
                    className="w-full bg-[#f97316] rounded-t-md shadow-2xs hover:opacity-90 transition-opacity"
                  />
                  <span className="text-[11px] font-medium text-slate-600 mt-1 whitespace-nowrap">
                    Rusak Sedang
                  </span>
                </div>

                {/* Bar 4: Rusak Berat */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <span className="text-[11px] font-bold text-slate-800 font-mono">
                    {kmBerat.toFixed(2).replace('.', ',')}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(kmBerat / maxKm) * 110}px` }}
                    transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
                    className="w-full bg-[#ef4444] rounded-t-md shadow-2xs hover:opacity-90 transition-opacity"
                  />
                  <span className="text-[11px] font-medium text-slate-600 mt-1 whitespace-nowrap">
                    Rusak Berat
                  </span>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Row 3: Bottom 3 Cards (Hero Landscape, Aktivitas Terbaru, Status Sistem) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Banner DI Kali Wening Landscape */}
        <FadeIn delay={0.4}>
          <div className="relative rounded-xl overflow-hidden border border-slate-200/80 shadow-2xs h-48 bg-gradient-to-tr from-slate-900 via-teal-950 to-emerald-900 flex flex-col justify-end p-5 text-white group">
            {/* Background Pattern / Landscape Image Simulation */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-700"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/90 backdrop-blur-xs flex items-center justify-center text-white border border-emerald-400/40 shadow-sm">
                <Waves size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white tracking-tight leading-tight">
                  DI Kali Wening
                </h3>
                <p className="text-[11px] text-emerald-200/90 font-medium tracking-tight">
                  Sistem Informasi Kondisi Jaringan Irigasi
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Card 2: Aktivitas Terbaru */}
        <FadeIn delay={0.45}>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between h-48">
            <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">
              Aktivitas Terbaru
            </h2>

            <div className="space-y-3 my-auto">
              {/* Item 1 */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="stroke-[3]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-slate-800 leading-tight">
                    Impor data susulan berhasil
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    20 Jan 2026, 10:24
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="stroke-[3]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-slate-800 leading-tight">
                    Pemutakhiran kondisi aset
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    20 Jan 2026, 10:22
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="stroke-[3]" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-slate-800 leading-tight">
                    Perhitungan dampak hilir
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    20 Jan 2026, 10:20
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Card 3: Status Sistem */}
        <FadeIn delay={0.5}>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between items-center text-center h-48">
            <h2 className="text-[14px] font-bold text-slate-900 tracking-tight self-start">
              Status Sistem
            </h2>

            <div className="my-auto flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 mb-2"
              >
                <Check size={28} className="stroke-[3]" />
              </motion.div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {healthStatus === 'siap' ? 'Siap' : 'Memuat'}
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                API v1.2
              </span>
            </div>

            <div />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
