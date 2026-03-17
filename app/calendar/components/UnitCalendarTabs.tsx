'use client';

import React from 'react';

export type CalendarUnit = {
  id: string;
  title: string;
  imageUrl?: string;
  basePrice?: number;
  occupancyPct?: number;
  blockedDays?: number;
  hasPricing?: boolean;
};

interface UnitCalendarTabsProps {
  units: CalendarUnit[];
  activeUnitId: string | null;
  onSelect: (id: string | null) => void;
  globalBlockedCount?: number;
  globalPricingCount?: number;
}

const UnitCalendarTabs: React.FC<UnitCalendarTabsProps> = ({
  units,
  activeUnitId,
  onSelect,
  globalBlockedCount = 0,
  globalPricingCount = 0,
}) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2">
      {/* All Units tab */}
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
          activeUnitId === null
            ? 'bg-[#0B5858] text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        All Units
      </button>

      <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

      {units.map((unit) => {
        const isActive = activeUnitId === unit.id;
        return (
          <button
            key={unit.id}
            onClick={() => onSelect(unit.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-[#0B5858] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            <span className="truncate max-w-[120px]">{unit.title}</span>
          </button>
        );
      })}
    </div>
  );
};

export default UnitCalendarTabs;
