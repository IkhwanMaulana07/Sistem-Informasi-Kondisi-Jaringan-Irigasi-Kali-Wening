import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Sistem Informasi Kondisi Jaringan Irigasi — DI Kali Wening',
  description: 'Sistem informasi terpadu inventaris aset, penelusuran kerusakan, analisis dampak hilir, dan prioritas pemeliharaan DI Kali Wening.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="bg-slate-50 min-h-screen text-slate-900 flex flex-col md:flex-row antialiased">
        <Navbar />
        <main className="flex-1 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
