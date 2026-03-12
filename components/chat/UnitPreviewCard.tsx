'use client';

import Link from 'next/link';

export interface UnitPreview {
  id: string;
  title?: string;
  price?: number;
  city?: string;
  main_image_url?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
}

interface UnitPreviewCardProps {
  unit: UnitPreview;
  compact?: boolean;
}

export default function UnitPreviewCard({ unit, compact }: UnitPreviewCardProps) {
  const href = `/unit/${unit.id}`;
  const title = unit.title || 'Unit';
  const price = unit.price != null ? `₱${unit.price.toLocaleString()}/night` : '';
  const imgSrc = unit.main_image_url || '/avida.jpg';

  if (compact) {
    return (
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 hover:border-[#0B5858] hover:bg-gray-50 transition-colors w-full min-w-0"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-900 truncate">{title}</p>
          <p className="text-[10px] text-[#0B5858] font-semibold">{price}</p>
        </div>
        <span className="text-[10px] text-[#0B5858] shrink-0">View</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-[#0B5858] hover:shadow-sm transition-all w-full min-w-0 p-2"
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={title} className="w-full h-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-[10px] text-[#0B5858] font-semibold">{price}</p>
        {(unit.city || unit.bedrooms != null) && (
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {[unit.city, unit.bedrooms != null ? `${unit.bedrooms} bed` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <span className="text-[10px] font-medium text-[#0B5858]">View</span>
      </div>
    </Link>
  );
}
