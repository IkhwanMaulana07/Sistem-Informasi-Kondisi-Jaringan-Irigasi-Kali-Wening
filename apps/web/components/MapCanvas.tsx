'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  GeoJSON, 
  Marker, 
  Popup, 
  useMap 
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
  Building2, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  X, 
  ArrowRight,
  Info
} from 'lucide-react';
import Link from 'next/link';

// Center of DI Kali Wening / Yogyakarta coordinates
const DEFAULT_CENTER: [number, number] = [-7.65, 110.42];
const DEFAULT_ZOOM = 13;

interface MapCanvasProps {
  initialAssetCode?: string | null;
}

// Controller component to zoom/pan to an asset
function MapPanController({ targetCoords }: { targetCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 16, { duration: 1.2 });
    }
  }, [targetCoords, map]);
  return null;
}

export default function MapCanvas({ initialAssetCode }: MapCanvasProps) {
  const [canalsGeoJson, setCanalsGeoJson] = useState<any>(null);
  const [assetsGeoJson, setAssetsGeoJson] = useState<any>(null);
  const [plotsGeoJson, setPlotsGeoJson] = useState<any>(null);

  // Layer toggles
  const [showCanals, setShowCanals] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showPlots, setShowPlots] = useState(true);

  // Selected asset & impact state
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [impactData, setImpactData] = useState<AssetImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState<boolean>(false);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    async function loadLayers() {
      try {
        const [canals, assets, plots] = await Promise.all([
          fetchMapCanals().catch(() => null),
          fetchMapAssets().catch(() => null),
          fetchMapPlots().catch(() => null),
        ]);
        setCanalsGeoJson(canals);
        setAssetsGeoJson(assets);
        setPlotsGeoJson(plots);

        if (initialAssetCode && assets?.features) {
          const target = assets.features.find(
            (f: any) => f.properties.kode_aset === initialAssetCode
          );
          if (target && target.geometry?.coordinates) {
            setSelectedAsset(target.properties);
            const [lon, lat] = target.geometry.coordinates;
            setPanTarget([lat, lon]);
            // Automatically fetch impact
            fetchImpact(initialAssetCode);
          }
        }
      } catch (e) {
        console.error('Failed to load map layers', e);
      }
    }
    loadLayers();
  }, [initialAssetCode]);

  async function fetchImpact(kode_aset: string) {
    try {
      setLoadingImpact(true);
      const impact = await fetchAssetImpact(kode_aset);
      setImpactData(impact);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImpact(false);
    }
  }

  function handleAssetClick(props: any, coords: [number, number]) {
    setSelectedAsset(props);
    setPanTarget(coords);
    fetchImpact(props.kode_aset);
  }

  function clearSelection() {
    setSelectedAsset(null);
    setImpactData(null);
  }

  // Styling for canal lines
  function getCanalStyle(feature: any) {
    const cond = feature.properties.kondisi;
    const level = feature.properties.tingkat;
    
    let color = '#16a34a'; // baik
    if (cond === 'rusak_ringan') color = '#d97706';
    else if (cond === 'rusak_sedang') color = '#ea580c';
    else if (cond === 'rusak_berat') color = '#dc2626';

    const weight = level === 'primer' ? 4 : 2.5;
    return {
      color,
      weight,
      opacity: 0.9,
    };
  }

  // Styling for tertiary plots
  const affectedPlotCodes = new Set(impactData?.petak.map(p => p.kode_petak) || []);

  function getPlotStyle(feature: any) {
    const isAffected = affectedPlotCodes.has(feature.properties.kode_petak);
    if (isAffected) {
      return {
        fillColor: '#ea580c',
        weight: 2,
        opacity: 1,
        color: '#9a3412',
        dashArray: '',
        fillOpacity: 0.65,
      };
    }
    return {
      fillColor: '#94a3b8',
      weight: 1,
      opacity: 0.8,
      color: '#64748b',
      dashArray: '3',
      fillOpacity: 0.2,
    };
  }

  // Custom marker icon based on type and condition
  function createAssetIcon(jenis: string, kondisi: string, isSelected: boolean) {
    let bg = '#16a34a';
    if (kondisi === 'rusak_ringan') bg = '#d97706';
    else if (kondisi === 'rusak_sedang') bg = '#ea580c';
    else if (kondisi === 'rusak_berat') bg = '#dc2626';

    const size = isSelected ? 22 : 16;
    const border = isSelected ? '3px solid #0f172a' : '2px solid white';

    return L.divIcon({
      className: 'custom-asset-marker',
      html: `<div style="
        background-color: ${bg};
        width: ${size}px;
        height: ${size}px;
        border-radius: ${jenis === 'bendung' ? '2px' : '9999px'};
        border: ${border};
        box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      {/* Map Canvas */}
      <div className="flex-1 h-full relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapPanController targetCoords={panTarget} />

          {/* Tertiary Plots Layer */}
          {showPlots && plotsGeoJson && (
            <GeoJSON
              key={`plots-${impactData?.kode_aset || 'none'}`}
              data={plotsGeoJson}
              style={getPlotStyle}
              onEachFeature={(feature, layer) => {
                const props = feature.properties;
                const isAff = affectedPlotCodes.has(props.kode_petak);
                layer.bindTooltip(`
                  <div class="text-xs">
                    <strong>Petak: ${props.kode_petak}</strong><br/>
                    Nama: ${props.nama_petak || '-'}<br/>
                    Luas: ${props.luas_ha} ha<br/>
                    Sadap: ${props.nomenklatur_sadap || '-'}<br/>
                    ${isAff ? '<span class="text-orange-600 font-bold">TERDAMPAK</span>' : ''}
                  </div>
                `);
              }}
            />
          )}

          {/* Canals Layer */}
          {showCanals && canalsGeoJson && (
            <GeoJSON
              key="canals-layer"
              data={canalsGeoJson}
              style={getCanalStyle}
              onEachFeature={(feature, layer) => {
                const props = feature.properties;
                layer.bindTooltip(`
                  <div class="text-xs">
                    <strong>${props.nama_saluran || props.id_ruas}</strong><br/>
                    Tingkat: ${props.tingkat}<br/>
                    Kondisi: ${props.kondisi}<br/>
                    Panjang: ${props.panjang_km} km
                  </div>
                `);
              }}
            />
          )}

          {/* Asset Markers */}
          {showAssets && assetsGeoJson?.features?.map((feat: any) => {
            const coords = feat.geometry?.coordinates;
            if (!coords || coords.length < 2) return null;
            const [lon, lat] = coords;
            const props = feat.properties;
            const isSelected = selectedAsset?.kode_aset === props.kode_aset;

            return (
              <Marker
                key={props.kode_aset}
                position={[lat, lon]}
                icon={createAssetIcon(props.jenis, props.kondisi, isSelected)}
                eventHandlers={{
                  click: () => handleAssetClick(props, [lat, lon]),
                }}
              />
            );
          })}
        </MapContainer>

        {/* Layer Controls & Legend Floating Panel */}
        <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-md border border-slate-200 text-xs w-64 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-teal-600" />
              Kontrol Lapisan
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input 
                type="checkbox" 
                checked={showCanals} 
                onChange={(e) => setShowCanals(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500" 
              />
              <span>Ruas Saluran</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input 
                type="checkbox" 
                checked={showAssets} 
                onChange={(e) => setShowAssets(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500" 
              />
              <span>Bangunan Irigasi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input 
                type="checkbox" 
                checked={showPlots} 
                onChange={(e) => setShowPlots(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500" 
              />
              <span>Petak Tersier</span>
            </label>
          </div>

          {/* Legend */}
          <div className="border-t border-slate-100 pt-2 space-y-2">
            <p className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider">Kondisi</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Baik</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> Rusak Ringan</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span> Rusak Sedang</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Rusak Berat</span>
            </div>
            {impactData && (
              <div className="pt-1 text-[11px] flex items-center gap-1.5 text-orange-700 font-semibold">
                <span className="w-3 h-3 bg-orange-500/70 border border-orange-700 rounded-sm"></span>
                Petak Terdampak ({impactData.jumlah_petak} petak)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Detail & Downstream Impact Slide-out Panel */}
      {selectedAsset && (
        <div className="w-full md:w-96 bg-white border-l border-slate-200 shadow-xl p-5 overflow-y-auto flex flex-col justify-between z-[500]">
          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded uppercase">
                  {selectedAsset.jenis.replace(/_/g, ' ')}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {selectedAsset.kode_aset}
                </h2>
                {selectedAsset.nomenklatur && (
                  <p className="text-xs font-semibold text-slate-600">
                    Nomenklatur: {selectedAsset.nomenklatur}
                  </p>
                )}
              </div>
              <button 
                onClick={clearSelection}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 py-3 text-xs border-b border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Saluran</span>
                <span className="font-medium text-slate-800">{selectedAsset.nama_saluran || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kondisi Terkini</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedAsset.kondisi === 'rusak_berat' ? 'bg-red-100 text-red-800' :
                  selectedAsset.kondisi === 'rusak_sedang' ? 'bg-orange-100 text-orange-800' :
                  selectedAsset.kondisi === 'rusak_ringan' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedAsset.kondisi.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Kondisi</span>
                <span className="font-medium text-slate-800">{selectedAsset.tgl_kondisi || '-'}</span>
              </div>
              {selectedAsset.tanda && selectedAsset.tanda.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Tanda Kualitas:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAsset.tanda.map((t: string) => (
                      <span key={t} className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Downstream Impact Section */}
            <div className="py-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <AlertTriangle size={14} className="text-orange-600" />
                Dampak Kerusakan Hilir
              </h3>

              {loadingImpact ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Menghitung aliran hilir dan petak terdampak...
                </div>
              ) : impactData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-orange-700 uppercase font-medium">Petak Terdampak</span>
                      <p className="text-xl font-bold text-orange-950 mt-0.5">{impactData.jumlah_petak}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-orange-700 uppercase font-medium">Luas Terdampak</span>
                      <p className="text-xl font-bold text-orange-950 mt-0.5">{impactData.luas_terdampak_ha.toFixed(2)} ha</p>
                    </div>
                  </div>

                  {impactData.petak.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-slate-600 mb-1">Daftar Petak Terdampak:</p>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-[11px]">
                        {impactData.petak.map((p) => (
                          <div key={p.kode_petak} className="px-2.5 py-1.5 flex justify-between">
                            <span className="font-mono font-medium text-slate-700">{p.kode_petak}</span>
                            <span className="text-slate-500">{p.luas_ha} ha</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {impactData.jumlah_petak === 0 && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded">
                      Bangunan ini tidak memiliki petak tersier di hilirnya, atau bertanda jauh dari saluran.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href={`/aset/${selectedAsset.kode_aset}`}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-lg transition"
            >
              <span>Buka Detail Lengkap</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
