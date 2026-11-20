'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const DynamicMap = dynamic(() => import('@/components/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-slate-400 gap-2">
      <Loader2 className="animate-spin text-teal-600" size={32} />
      <span className="text-xs">Memuat modul peta geospasial...</span>
    </div>
  ),
});

function MapPageContent() {
  const searchParams = useSearchParams();
  const assetParam = searchParams.get('aset') || searchParams.get('search');

  return (
    <div className="w-full h-full flex flex-col">
      <DynamicMap initialAssetCode={assetParam} />
    </div>
  );
}

export default function PetaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-teal-600" size={32} />
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
