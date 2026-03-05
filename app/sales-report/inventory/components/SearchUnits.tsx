'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { InventoryUnit } from '../types';

interface SearchUnitsProps {
  units: InventoryUnit[];
}

const SearchUnits: React.FC<SearchUnitsProps> = ({ units }) => {
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');

  const locations = useMemo(() => {
    const set = new Set(units.map((u) => u.location).filter(Boolean));
    return Array.from(set).sort();
  }, [units]);

  const unitTypes = useMemo(() => {
    const set = new Set(units.map((u) => u.type).filter(Boolean));
    return Array.from(set).sort();
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.location && u.location.toLowerCase().includes(search.toLowerCase()));
      const matchLocation = !filterLocation || u.location === filterLocation;
      const matchType = !filterType || u.type === filterType;
      return matchSearch && matchLocation && matchType;
    });
  }, [units, search, filterLocation, filterType]);

  return (
    <div className="flex flex-col h-full max-h-[420px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>
          Search Units
        </h3>
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none"
          style={{ fontFamily: 'Poppins' }}
          suppressHydrationWarning
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {locations.length > 0 && (
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none"
              style={{ fontFamily: 'Poppins' }}
              suppressHydrationWarning
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          )}
          {unitTypes.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none"
              style={{ fontFamily: 'Poppins' }}
              suppressHydrationWarning
            >
              <option value="">All types</option>
              {unitTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 scrollbar-no-arrows"
      >
        {filteredUnits.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6" style={{ fontFamily: 'Poppins' }}>
            No units match
          </p>
        ) : (
          filteredUnits.map((unit) => (
            <Link
              key={unit.id}
              href={`/sales-report/inventory/units/${unit.id}`}
              className="flex-shrink-0 flex gap-3 p-2 rounded-lg border border-gray-100 bg-gray-50/80 hover:border-[#0B5858]/30 hover:bg-teal-50/30 transition-colors cursor-pointer block"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                <img
                  src={unit.imageUrl || '/heroimage.png'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: 'Poppins' }}>
                    {unit.name}
                  </p>
                  {unit.type && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 flex-shrink-0" style={{ fontFamily: 'Poppins' }}>
                      {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                    </span>
                  )}
                </div>
                {unit.location && (
                  <p className="text-xs text-gray-600 truncate mt-0.5" style={{ fontFamily: 'Poppins' }}>
                    {unit.location}
                  </p>
                )}
                {unit.itemCount != null && (
                  <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                    {unit.itemCount} items assigned
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchUnits;
