'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
  });
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    click: (e: any) => {
      const { lat, lng } = e.latlng;
      onSelect(lat, lng);
    }
  });
  return null;
}

// Typing shims to avoid react-leaflet/React 19 prop type mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedMapContainer = MapContainer as unknown as React.FC<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedTileLayer = TileLayer as unknown as React.FC<any>;

interface NewListingFormMapProps {
  center: [number, number];
  zoom: number;
  selectedPosition: [number, number] | null;
  onPositionSelect: (lat: number, lng: number) => void;
}

export default function NewListingFormMap({ center, zoom, selectedPosition, onPositionSelect }: NewListingFormMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden relative z-0 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500 text-sm" style={{ fontFamily: 'Poppins' }}>Loading map…</span>
      </div>
    );
  }

  return (
    <div className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden relative z-0">
      <style>{`
        .leaflet-control-zoom a { background-color: white !important; color: #0B5858 !important; border: 1px solid #e5e7eb !important; width: 40px !important; height: 40px !important; line-height: 40px !important; font-size: 24px !important; font-weight: bold !important; text-decoration: none !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important; }
        .leaflet-control-zoom a:hover { background-color: #f9fafb !important; color: #0B5858 !important; border-color: #0B5858 !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; }
        .leaflet-control-zoom-in { border-bottom: 1px solid #e5e7eb !important; }
      `}</style>
      <TypedMapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TypedTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onPositionSelect} />
        {selectedPosition && <Marker position={selectedPosition} />}
      </TypedMapContainer>
    </div>
  );
}
