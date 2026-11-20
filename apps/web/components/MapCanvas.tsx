'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON, 
  Marker, 
  Popup, 
  useMap,
  ScaleControl
} from 'react-leaflet';
import L from 'leaflet';
import { 
  fetchMapCanals, 
  fetchMapAssets, 
  fetchMapPlots, 
  fetchAssetImpact 
} from '@/lib/api';
import { AssetImpact } from '@/types';
import { 
  Search, 
  Layers, 
  X, 
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import Link from 'next/link';

// Center of DI Kali Wening / Yogyakarta coordinates
const DEFAULT_CENTER: [number, number] = [-7.65, 110.42];
const DEFAULT_ZOOM = 13;

interface MapCanvasProps {
  initialAssetCode?: string | null;
}

// Controller to fly and zoom IN to selected asset
function MapPanController({ 
  targetCoords,
  trigger
}: { 
  targetCoords: [number, number] | null;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!targetCoords) return;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
        // Always zoom IN close-up to the selected building structure (zoom level 16)
        map.flyTo(targetCoords, 16, { animate: true, duration: 1.2 });
      } catch {
        map.setView(targetCoords, 16);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [targetCoords, trigger, map]);

  return null;
}

export default function MapCanvas({ initialAssetCode }: MapCanvasProps) {
  const [canalsGeoJson, setCanalsGeoJson] = useState<any>(null);
  const [assetsGeoJson, setAssetsGeoJson] = useState<any>(null);
  const [plotsGeoJson, setPlotsGeoJson] = useState<any>(null);

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedImpact, setSelectedImpact] = useState<AssetImpact | null>(null);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);
  const [flyTrigger, setFlyTrigger] = useState<number>(0);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Layer Toggles matching mockup
  const [showCanals, setShowCanals] = useState<boolean>(true);
  const [showAssets, setShowAssets] = useState<boolean>(true);
  const [showPlots, setShowPlots] = useState<boolean>(true);
  const [tileMode, setTileMode] = useState<'satellite' | 'street'>('satellite');

  useEffect(() => {
    async function loadGIS() {
      try {
        const [c, a, p] = await Promise.all([
          fetchMapCanals(),
          fetchMapAssets(),
          fetchMapPlots(),
        ]);
        setCanalsGeoJson(c);
        setAssetsGeoJson(a);
        setPlotsGeoJson(p);

        // Auto-select initialAssetCode if provided
        if (initialAssetCode && a?.features) {
          const q = String(initialAssetCode).trim().toLowerCase();
          const match = a.features.find((f: any) => 
            String(f.properties?.kode_aset || '').trim().toLowerCase() === q
          );
          if (match) {
            handleSelectAsset(match);
          }
        }
      } catch (err) {
        console.error('Failed to load GIS GeoJSON layers', err);
      }
    }
    loadGIS();
  }, [initialAssetCode]);

  // Secondary effect to ensure auto-zoom if initialAssetCode changes
  useEffect(() => {
    if (initialAssetCode && assetsGeoJson?.features) {
      const q = String(initialAssetCode).trim().toLowerCase();
      const match = assetsGeoJson.features.find((f: any) => 
        String(f.properties?.kode_aset || '').trim().toLowerCase() === q
      );
      if (match) {
        handleSelectAsset(match);
      }
    }
  }, [initialAssetCode, assetsGeoJson]);

  const handleSelectAsset = async (feat: any) => {
    const props = feat.properties;
    setSelectedAsset(props);
    setSearchQuery(props.kode_aset || '');

    if (feat.geometry?.coordinates) {
      const [lon, lat] = feat.geometry.coordinates;
      setPanTarget([lat, lon]);
      setFlyTrigger((t) => t + 1);
    }

    try {
      const imp = await fetchAssetImpact(props.kode_aset);
      setSelectedImpact(imp);
    } catch {
      setSelectedImpact(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !assetsGeoJson?.features) return;
    const q = searchQuery.toLowerCase().trim();
    const match = assetsGeoJson.features.find((f: any) => {
      const code = String(f.properties?.kode_aset || '').toLowerCase();
      const nom = String(f.properties?.nomenklatur || '').toLowerCase();
      const name = String(f.properties?.nama_saluran || '').toLowerCase();
      return code.includes(q) || nom.includes(q) || name.includes(q);
    });
    if (match) {
      handleSelectAsset(match);
    }
  };

  // Canal styling per condition
  const getCanalStyle = (feature: any) => {
    const cond = feature?.properties?.kondisi;
    let color = '#16a34a'; // baik (green)
    if (cond === 'rusak_ringan') color = '#eab308'; // yellow
    else if (cond === 'rusak_sedang') color = '#f97316'; // orange
    else if (cond === 'rusak_berat') color = '#ef4444'; // red

    return {
      color,
      weight: 3.5,
      opacity: 0.95,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    };
  };

  // Plot styling
  const getPlotStyle = (feature: any) => {
    const code = feature?.properties?.kode_petak;
    const isImpacted = selectedImpact?.petak?.some((p) => p.kode_petak === code);

    if (isImpacted) {
      return {
        fillColor: '#ef4444',
        fillOpacity: 0.65,
        color: '#b91c1c',
        weight: 2.5,
      };
    }

    return {
      fillColor: '#4ade80',
      fillOpacity: 0.35,
      color: '#15803d',
      weight: 1.2,
    };
  };

  // Custom Building Marker HTML with animated beacon & pointer when selected
  const createAssetIcon = (cond: string, isSelected: boolean = false, kode_aset: string = '') => {
    let color = '#16a34a';
    if (cond === 'rusak_ringan') color = '#eab308';
    else if (cond === 'rusak_sedang') color = '#f97316';
    else if (cond === 'rusak_berat') color = '#ef4444';

    if (isSelected) {
      return L.divIcon({
        className: 'selected-asset-marker',
        html: `
          <div style="position: relative; width: 0; height: 0; display: flex; align-items: center; justify-content: center;">
            <!-- Outer Pulsing Radar Beacon Waves -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 54px;
              height: 54px;
              border-radius: 50%;
              background-color: ${color};
              opacity: 0.35;
              transform: translate(-50%, -50%);
              animation: markerBeaconPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none;
            "></div>
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background-color: ${color};
              opacity: 0.55;
              transform: translate(-50%, -50%);
              animation: markerBeaconPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              pointer-events: none;
            "></div>
            <!-- Center Pin -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 20px;
              height: 20px;
              background-color: ${color};
              border: 3.5px solid #ffffff;
              border-radius: 50%;
              transform: translate(-50%, -50%);
              box-shadow: 0 0 14px rgba(0,0,0,0.65), 0 0 0 3px ${color};
              z-index: 100;
            "></div>
            <!-- Pointer Callout Badge -->
            <div style="
              position: absolute;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #0f172a;
              color: #ffffff;
              font-family: inherit;
              font-weight: 800;
              font-size: 11px;
              padding: 4px 10px;
              border-radius: 6px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              border: 1px solid rgba(255,255,255,0.25);
              pointer-events: none;
              z-index: 101;
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <span style="color: #4ade80;">📍</span>
              <span>${kode_aset}</span>
              <span style="font-size: 9px; font-weight: normal; opacity: 0.8; background: #334155; padding: 1px 5px; border-radius: 3px;">Terpilih</span>
              <div style="
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 5px solid #0f172a;
              "></div>
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    }

    return L.divIcon({
      className: 'custom-asset-marker',
      html: `
        <div style="
          width: 13px;
          height: 13px;
          background-color: ${color};
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [13, 13],
      iconAnchor: [6.5, 6.5],
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col min-h-[calc(100vh-1rem)]">
      {/* Top Header Bar matching Mockup */}
      <div className="p-4 px-6 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 z-10 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Peta Jaringan Irigasi
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Visualisasi jaringan saluran, bangunan irigasi, dan petak tersier
          </p>
        </div>

        {/* Search Bar matching top-right of mockup */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari lokasi atau kode aset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </form>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full z-0 min-h-[550px]"
          zoomControl={true}
        >
          <ScaleControl position="bottomleft" imperial={false} />
          <MapPanController targetCoords={panTarget} trigger={flyTrigger} />

          {/* Base Tiles (Satellite or Street) */}
          {tileMode === 'satellite' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          {/* Tertiary Plots Layer */}
          {showPlots && plotsGeoJson && (
            <GeoJSON
              key={`plots-${selectedImpact ? selectedImpact.kode_aset + '-' + selectedImpact.jumlah_petak : 'default'}`}
              data={plotsGeoJson}
              style={getPlotStyle}
              onEachFeature={(feat, layer) => {
                const p = feat.properties;
                layer.bindTooltip(`
                  <div style="font-family: inherit; font-size: 11px;">
                    <strong>Petak: ${p.kode_petak}</strong><br/>
                    Luas: ${p.luas_ha} ha<br/>
                    Sadap: ${p.nomenklatur_sadap || '-'}
                  </div>
                `);
              }}
            />
          )}

          {/* Canals Layer */}
          {showCanals && canalsGeoJson && (
            <GeoJSON
              data={canalsGeoJson}
              style={getCanalStyle}
              onEachFeature={(feat, layer) => {
                const c = feat.properties;
                layer.bindTooltip(`
                  <div style="font-family: inherit; font-size: 11px;">
                    <strong>Saluran: ${c.nama_saluran}</strong><br/>
                    Tingkat: ${c.tingkat} | Kondisi: ${c.kondisi}<br/>
                    Panjang: ${(c.length_m / 1000).toFixed(2)} km
                  </div>
                `);
              }}
            />
          )}

          {/* Assets Markers */}
          {showAssets &&
            assetsGeoJson?.features?.map((feat: any, idx: number) => {
              const coords = feat.geometry?.coordinates;
              if (!coords || coords.length < 2) return null;
              const [lon, lat] = coords;
              const props = feat.properties;
              const isSelected = selectedAsset?.kode_aset === props.kode_aset;

              return (
                <Marker
                  key={`asset-${props.kode_aset || idx}-${isSelected ? 'selected' : 'normal'}`}
                  position={[lat, lon]}
                  icon={createAssetIcon(props.kondisi, isSelected, props.kode_aset)}
                  zIndexOffset={isSelected ? 1000 : 1}
                  eventHandlers={{
                    click: () => handleSelectAsset(feat),
                  }}
                />
              );
            })}
        </MapContainer>

        {/* Global Keyframes for Marker Pulsing Radar Beacon */}
        <style jsx global>{`
          @keyframes markerBeaconPing {
            0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.9; }
            100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
          }
          @keyframes markerBeaconPulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.75; }
            50% { transform: translate(-50%, -50%) scale(1.45); opacity: 0.25; }
          }
        `}</style>

        {/* Selected Asset Popup matching mockup */}
        {selectedAsset && (
          <div className="absolute left-6 top-6 z-20 w-72 bg-white rounded-xl shadow-lg border border-slate-200/90 p-4 transition-all">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-[14px] leading-tight">
                  {selectedAsset.kode_aset}
                </h3>
                <p className="text-[11px] text-slate-500 capitalize">
                  {selectedAsset.jenis?.replace(/_/g, ' ') || 'Bangunan'}
                </p>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kondisi</span>
                <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold capitalize ${
                  selectedAsset.kondisi === 'rusak_berat' ? 'bg-red-50 text-red-700 border border-red-200' :
                  selectedAsset.kondisi === 'rusak_sedang' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                  selectedAsset.kondisi === 'rusak_ringan' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {selectedAsset.kondisi?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Luas Terdampak :</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedImpact?.luas_terdampak_ha !== undefined
                    ? `${selectedImpact.luas_terdampak_ha.toFixed(2).replace('.', ',')} ha`
                    : '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Jumlah Petak :</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedImpact?.jumlah_petak !== undefined ? selectedImpact.jumlah_petak : '-'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/aset/${selectedAsset.kode_aset}`}
                className="text-[11.5px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 group"
              >
                Lihat Detail <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        )}

        {/* Floating Layer Control & Legend on Top Right (Exact 100% Match to Mockup) */}
        <div className="absolute right-4 top-4 z-20 w-48 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200/90 p-3.5 text-xs select-none">
          {/* Layer Peta */}
          <h4 className="font-bold text-slate-900 text-[11.5px] mb-2 tracking-tight">
            Layer Peta
          </h4>
          <div className="space-y-1.5 pb-3 border-b border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
              <input
                type="checkbox"
                checked={showCanals}
                onChange={(e) => setShowCanals(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>Saluran Irigasi</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
              <input
                type="checkbox"
                checked={showAssets}
                onChange={(e) => setShowAssets(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>Bangunan Irigasi</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 text-[11px]">
              <input
                type="checkbox"
                checked={showPlots}
                onChange={(e) => setShowPlots(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>Petak Tersier</span>
            </label>
          </div>

          {/* Kondisi Bangunan Legend */}
          <h4 className="font-bold text-slate-900 text-[11.5px] mt-2.5 mb-1.5 tracking-tight">
            Kondisi Bangunan
          </h4>
          <div className="space-y-1 pb-2.5 border-b border-slate-100 text-[10.5px]">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] flex-shrink-0" />
              <span>Baik</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] flex-shrink-0" />
              <span>Rusak Ringan</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] flex-shrink-0" />
              <span>Rusak Sedang</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] flex-shrink-0" />
              <span>Rusak Berat</span>
            </div>
          </div>

          {/* Kondisi Saluran Legend */}
          <h4 className="font-bold text-slate-900 text-[11.5px] mt-2.5 mb-1.5 tracking-tight">
            Kondisi Saluran
          </h4>
          <div className="space-y-1 text-[10.5px]">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 h-1 rounded-full bg-[#16a34a] flex-shrink-0" />
              <span>Baik</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 h-1 rounded-full bg-[#eab308] flex-shrink-0" />
              <span>Rusak Ringan</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 h-1 rounded-full bg-[#f97316] flex-shrink-0" />
              <span>Rusak Sedang</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-4 h-1 rounded-full bg-[#ef4444] flex-shrink-0" />
              <span>Rusak Berat</span>
            </div>
          </div>

          {/* Base Tile Toggle */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
            <span>Peta Satelit</span>
            <button
              onClick={() => setTileMode(tileMode === 'satellite' ? 'street' : 'satellite')}
              className="text-emerald-700 font-semibold hover:underline"
            >
              {tileMode === 'satellite' ? 'Jalan' : 'Satelit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
