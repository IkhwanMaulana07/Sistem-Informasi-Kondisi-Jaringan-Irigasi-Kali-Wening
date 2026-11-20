'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Map, 
  Database, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  UploadCloud, 
  Waves,
  Activity, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { fetchHealth, fetchVersion } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/peta', label: 'Peta Jaringan', icon: Map },
  { href: '/aset', label: 'Data Aset', icon: Database },
  { href: '/prioritas', label: 'Prioritas Penanganan', icon: AlertTriangle },
  { href: '/rekap-saluran', label: 'Rekap Saluran', icon: FileText },
  { href: '/kualitas-data', label: 'Kualitas Data', icon: CheckCircle2 },
  { href: '/impor-susulan', label: 'Impor Data', icon: UploadCloud },
];

export default function Navbar() {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<string>('siap');
  const [version, setVersion] = useState<string>('1.2');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkStatus = async () => {
      try {
        const h = await fetchHealth();
        setHealthStatus(h.status);
      } catch (e) {
        setHealthStatus('memuat');
      }
      try {
        const v = await fetchVersion();
        setVersion(v.versi_kontrak);
      } catch (e) {}
    };

    checkStatus();
    interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-full md:w-60 bg-[#0d172a] text-white flex-shrink-0 flex flex-col justify-between border-r border-slate-800/80 z-50 select-none">
      <div>
        {/* Header / Logo */}
        <div className="p-4 px-5 border-b border-slate-800/60 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform">
              <Waves size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-[14px] text-white tracking-tight leading-tight">
                SI Irigasi
              </h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                DI Kali Wening
              </p>
            </div>
          </Link>
          <button 
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`p-3 space-y-1 ${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-[#16a34a] rounded-xl shadow-sm shadow-green-950/30"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={16} className={`relative z-10 ${isActive ? 'text-white stroke-[2.2]' : 'text-slate-400'}`} />
                <span className="relative z-10 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-3.5 px-4 border-t border-slate-800/60 bg-[#091120] text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Activity size={12} className={healthStatus === 'siap' ? 'text-emerald-400' : 'text-amber-400 animate-spin'} />
            Status API
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
            healthStatus === 'siap' 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
              : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
          }`}>
            {healthStatus}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-teal-400" />
            Kontrak
          </span>
          <span className="text-slate-300 font-mono text-[10px] font-medium bg-slate-800/80 px-1.5 py-0.5 rounded">
            v{version}
          </span>
        </div>
      </div>
    </aside>
  );
}
