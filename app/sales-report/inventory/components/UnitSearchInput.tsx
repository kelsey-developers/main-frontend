'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { WarehouseUnitAllocationSummary } from '../lib/inventoryData';

interface UnitSearchInputProps {
  unitAllocations: WarehouseUnitAllocationSummary[];
  value: 'all' | string;
  onChange: (value: 'all' | string) => void;
  placeholder?: string;
  className?: string;
}

export default function UnitSearchInput({
  unitAllocations,
  value,
  onChange,
  placeholder = 'Search units...',
  className = '',
}: UnitSearchInputProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUnit = value !== 'all' ? unitAllocations.find((u) => u.unitId === value) : null;

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unitAllocations;
    return unitAllocations.filter(
      (u) =>
        u.unitName.toLowerCase().includes(q) ||
        (u.unitId && u.unitId.toLowerCase().includes(q))
    );
  }, [unitAllocations, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedUnit ? selectedUnit.unitName : '')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (selectedUnit && !query) setQuery(selectedUnit.unitName);
          }}
          placeholder={placeholder}
          className="w-full min-w-[200px] pl-9 pr-4 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] text-gray-900 placeholder-gray-400 bg-white focus:border-[#0B5858] focus:ring-2 focus:ring-[#cce8e8] outline-none transition-all"
          style={{ fontFamily: 'Poppins' }}
        />
        {value !== 'all' && !open && (
          <button
            type="button"
            onClick={() => {
              onChange('all');
              setQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {open && unitAllocations.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange('all');
              setQuery('');
              setOpen(false);
            }}
            className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
              value === 'all'
                ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold border-gray-50'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-50'
            }`}
            style={{ fontFamily: 'Poppins' }}
          >
            {value === 'all' ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#05807e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className="w-3 inline-block" />
            )}
            All units
          </button>
          {suggestions.map((unit) => (
            <button
              key={unit.unitId}
              type="button"
              onClick={() => {
                onChange(unit.unitId);
                setQuery('');
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                value === unit.unitId
                  ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              {value === unit.unitId ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#05807e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="w-3 inline-block" />
              )}
              {unit.unitName}
            </button>
          ))}
          {suggestions.length === 0 && query.trim() && (
            <div className="px-3.5 py-4 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
              No units match &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
