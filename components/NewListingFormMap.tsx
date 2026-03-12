'use client';

import React, { useEffect, useRef } from 'react';

interface NewListingFormMapProps {
  center: [number, number];
  zoom: number;
  selectedPosition: [number, number] | null;
  onPositionSelect: (lat: number, lng: number) => void;
}

export default function NewListingFormMap({
  center,
  zoom,
  selectedPosition,
  onPositionSelect,
}: NewListingFormMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Create map once on mount, destroy on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    // Import Leaflet dynamically (it requires window)
    import('leaflet').then((L) => {
      if (!containerRef.current) return;

      // If already initialized (Strict Mode double-invoke), skip
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((containerRef.current as any)._leaflet_id) return;

      // Fix default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        onPositionSelect(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when search result changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(center, mapRef.current.getZoom(), { animate: true, duration: 0.8 });
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add / move marker when selectedPosition changes
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      if (selectedPosition) {
        if (markerRef.current) {
          markerRef.current.setLatLng(selectedPosition);
        } else {
          markerRef.current = L.marker(selectedPosition).addTo(mapRef.current);
        }
      } else {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
      }
    });
  }, [selectedPosition]);

  return (
    <>
      <style>{`
        .leaflet-control-zoom a {
          background-color: white !important; color: #0B5858 !important;
          border: 1px solid #e5e7eb !important; width: 40px !important; height: 40px !important;
          line-height: 40px !important; font-size: 24px !important; font-weight: bold !important;
          text-decoration: none !important; display: flex !important;
          align-items: center !important; justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #f9fafb !important; color: #0B5858 !important;
          border-color: #0B5858 !important;
        }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; }
        .leaflet-control-zoom-in { border-bottom: 1px solid #e5e7eb !important; }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-96 border border-gray-200 rounded-lg overflow-hidden relative z-0"
      />
    </>
  );
}
