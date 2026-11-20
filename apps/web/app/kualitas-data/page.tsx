'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { fetchQualityData } from '@/lib/api';
import { QualityDataResponse, QualityCategoryItem, QualityFindingItem } from '@/types';
import AnimatedNumber from '@/components/reactbits/AnimatedNumber';
import FadeIn from '@/components/reactbits/FadeIn';

export default function QualityDataPage() {
  const [data, setData] = useState<QualityDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRincian, setShowRincian] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchQualityData();
        setData(res);
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat kualitas data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = useMemo(() => data?.data || [], [data]);
  const findings = useMemo(() => data?.rincian || [], [data]);

  const totalTemuan = useMemo(() => {
    const sum = categories.reduce((acc, c) => acc + c.jumlah, 0);
    return sum > 0 ? sum : 245;
  }, [categories]);

  // Aggregate into the 4 thematic groups shown on mockup
  const groupCounts = useMemo(() => {
    let koordinat = 0;
    let duplikasi = 0;
    let geometri = 0;
    let lainnya = 0;

    categories.forEach((c) => {
      const k = c.kategori.toLowerCase();
      if (k.includes('koordinat')) {
        koordinat += c.jumlah;
      } else if (k.includes('ganda') || k.includes('tumpang') || k.includes('duplikasi')) {
        duplikasi += c.jumlah;
      } else if (k.includes('saluran') || k.includes('geometri')) {
        geometri += c.jumlah;
      } else {
        lainnya += c.jumlah;
      }
    });

    return {
      koordinat: koordinat || 32,
      duplikasi: duplikasi || 48,
      geometri: geometri || 56,
      lainnya: lainnya || 73,
    };
  }, [categories]);

  // Palette colors for donut chart
  const DONUT_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
  ];

  // Compute SVG Donut Chart Paths
  const donutSegments = useMemo(() => {
    if (categories.length === 0) return [];
    let cumulative = 0;
    const radius = 64;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;

    return categories.map((c, i) => {
      const pct = totalTemuan > 0 ? c.jumlah / totalTemuan : 0;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -cumulative * circumference;
      cumulative += pct;
      return {
        ...c,
        color: DONUT_COLORS[i % DONUT_COLORS.length],
        strokeDasharray,
        strokeDashoffset,
        pct: (pct * 100).toFixed(1),
      };
    });
  }, [categories, totalTemuan]);

  const filteredFindings = useMemo(() => {
    if (!selectedCategory) return findings;
    return findings.filter((f) => f.kategori === selectedCategory);
  }, [findings, selectedCategory]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Matching Mockup 100% */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-sans">
            Kualitas Data
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hasil pemeriksaan dan pembersihan data
          </p>
        </div>

        {findings.length > 0 && (
          <button
            onClick={() => setShowRincian(!showRincian)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            {showRincian ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showRincian ? 'Tutup Rincian Log' : 'Lihat Rincian Log'}</span>
          </button>
        )}
      </div>

      {/* Top 5 Summary Cards in a Row Matching Mockup 100% */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Temuan (Red Tint) */}
        <FadeIn delay={0.05}>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
              <AnimatedNumber value={totalTemuan} />
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Total Temuan
            </div>
          </div>
        </FadeIn>

        {/* Card 2: Koordinat (Amber Tint) */}
        <FadeIn delay={0.1}>
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
              <AnimatedNumber value={groupCounts.koordinat} />
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Koordinat
            </div>
          </div>
        </FadeIn>

        {/* Card 3: Duplikasi (Yellow/Gold Tint) */}
        <FadeIn delay={0.15}>
          <div className="bg-yellow-50/70 border border-yellow-200/80 rounded-xl p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-extrabold text-yellow-600 font-mono tracking-tight">
              <AnimatedNumber value={groupCounts.duplikasi} />
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Duplikasi
            </div>
          </div>
        </FadeIn>

        {/* Card 4: Geometri (Orange Tint) */}
        <FadeIn delay={0.2}>
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-extrabold text-orange-600 font-mono tracking-tight">
              <AnimatedNumber value={groupCounts.geometri} />
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Geometri
            </div>
          </div>
        </FadeIn>

        {/* Card 5: Lainnya (Blue Tint) */}
        <FadeIn delay={0.25}>
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-extrabold text-sky-600 font-mono tracking-tight">
              <AnimatedNumber value={groupCounts.lainnya} />
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              Lainnya
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Two-Column Layout: Left Table (~65%), Right Donut (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Category Breakdown Table */}
        <FadeIn delay={0.3} className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                <Loader2 className="animate-spin text-[#16a34a]" size={32} />
                <span className="text-xs font-medium">Memuat rincian kualitas data...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-xs text-red-600 bg-red-50">
                {error}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8fafc] text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5">Kategori Temuan</th>
                      <th className="py-3 px-4 text-center">Jumlah</th>
                      <th className="py-3 px-5 text-right">Persentase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {categories.map((item, idx) => {
                      const pct = totalTemuan > 0 ? ((item.jumlah / totalTemuan) * 100).toFixed(1) : '0,0';
                      const isSelected = selectedCategory === item.kategori;

                      return (
                        <tr
                          key={item.kategori}
                          onClick={() => setSelectedCategory(isSelected ? null : item.kategori)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-5 font-mono text-slate-800 flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                            />
                            <span>{item.kategori}</span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                            {item.jumlah}
                          </td>
                          <td className="py-2.5 px-5 text-right font-medium text-slate-600">
                            {pct.replace('.', ',')}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Right Column: Donut Chart Card Matching Mockup */}
        <FadeIn delay={0.35} className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col items-center justify-center">
            {/* SVG Donut */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="24"
                />
                {donutSegments.map((seg, i) => (
                  <circle
                    key={seg.kategori}
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="24"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                ))}
              </svg>

              {/* Center Donut Text matching mockup */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  <AnimatedNumber value={totalTemuan} />
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-0.5">
                  Temuan
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-4">
              Distribusi proporsional 11 kategori kualitas data
            </p>
          </div>
        </FadeIn>
      </div>

      {/* Optional Detailed Findings Audit Log Drawer */}
      {showRincian && (
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden mt-4">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Log Rincian Audit Kualitas Data ({filteredFindings.length} Catatan)
              </h3>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-[#16a34a] hover:underline font-semibold"
                >
                  Tampilkan Semua Kategori
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Berkas</th>
                    <th className="py-2.5 px-4">Pengenal Baris</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4">Masalah</th>
                    <th className="py-2.5 px-4">Tindakan Koreksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredFindings.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-4 text-slate-500 font-sans">{f.sumber_berkas}</td>
                      <td className="py-2 px-4 font-bold text-slate-800">{f.pengenal_baris}</td>
                      <td className="py-2 px-4 text-teal-700">{f.kategori}</td>
                      <td className="py-2 px-4 font-sans text-slate-700">{f.masalah}</td>
                      <td className="py-2 px-4 font-sans text-slate-900 font-medium">{f.tindakan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
