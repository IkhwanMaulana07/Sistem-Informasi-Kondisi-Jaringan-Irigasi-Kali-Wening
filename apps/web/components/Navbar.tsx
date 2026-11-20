'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map, 
  Building2, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  UploadCloud, 
  Activity, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { fetchHealth, fetchVersion } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/peta', label: 'Peta Jaringan', icon: Map },
  { href: '/aset', label: 'Data Bangunan', icon: Building2 },
  { href: '/prioritas', label: 'Prioritas Pemeliharaan', icon: AlertTriangle },
  { href: '/rekap-saluran', label: 'Rekap Saluran', icon: Layers },
  { href: '/kualitas-data', label: 'Kualitas Data', icon: CheckCircle2 },
  { href: '/impor-susulan', label: 'Impor Susulan', icon: UploadCloud },
];

export default function Navbar() {
  const pathname = usePathname();
  const [healthStatus, setHealthStatus] = useState<string>('memuat');
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
    interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col justify-between border-r border-slate-800 z-50">
      <div>
        {/* Header / Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-white text-lg shadow-md">
                KW
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">DI KALI WENING</h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Sistem Informasi Irigasi</p>
              </div>
            </div>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Activity size={12} className={healthStatus === 'siap' ? 'text-emerald-400 animate-pulse' : 'text-amber-400 animate-spin'} />
            Status API
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            healthStatus === 'siap' 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : 'bg-amber-950 text-amber-300 border border-amber-800'
          }`}>
            {healthStatus}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-sky-400" />
            Kontrak API
          </span>
          <span className="text-slate-300 font-mono text-[11px] font-medium bg-slate-800 px-1.5 py-0.5 rounded">
            v{version}
          </span>
        </div>
      </div>
    </aside>
  );
}
