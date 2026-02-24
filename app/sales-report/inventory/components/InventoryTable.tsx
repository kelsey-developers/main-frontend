
'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ReplenishmentItem } from '../types';

interface ReplenishmentTableProps {
  items: ReplenishmentItem[];
}

type SortOption = 'default' | 'stock-low-high' | 'stock-high-low' | 'name-a-z';

const ReplenishmentTable: React.FC<ReplenishmentTableProps> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealScrollbar = useCallback(() => {
    setShowScrollbar(true);
    if (scrollbarTimeoutRef.current) clearTimeout(scrollbarTimeoutRef.current);
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
      scrollbarTimeoutRef.current = null;
    }, 1500);
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term)
        )
      : [...items];

    if (sortBy === 'default') return filtered;
    const sorted = [...filtered];
    if (sortBy === 'stock-low-high') {
      sorted.sort((a, b) => a.currentStock - b.currentStock);
    } else if (sortBy === 'stock-high-low') {
      sorted.sort((a, b) => b.currentStock - a.currentStock);
    } else if (sortBy === 'name-a-z') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    return sorted;
  }, [items, search, sortBy]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-10 pr-3 rounded-md border border-gray-300 placeholder-gray-500 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none"
            placeholder="Search"
            suppressHydrationWarning
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="py-2 pl-3 pr-8 rounded-md border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none"
          style={{ fontFamily: 'Poppins' }}
          suppressHydrationWarning
        >
          <option value="default">Sort by</option>
          <option value="stock-low-high">Low to high stock</option>
          <option value="stock-high-low">High to low stock</option>
          <option value="name-a-z">Alphabetical (A–Z)</option>
        </select>
      </div>
      {/* Max 7 visible rows; scrollbar shows on hover or while scrolling */}
      <div
        className="overflow-auto rounded-2xl shadow-xl max-h-[22rem] scrollbar-no-arrows"
        data-show-scrollbar={showScrollbar ? 'true' : undefined}
        onScroll={revealScrollbar}
        onWheel={revealScrollbar}
      >
        <table className="w-full text-left border-collapse" style={{ fontFamily: 'Poppins' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-300 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-300">Item</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-300">Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-300">Current stock</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-300">Min threshold</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-300">Shortfall</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center bg-white text-gray-500" style={{ fontFamily: 'Poppins' }}>
                  No current items in the table
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 bg-white hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.type === 'consumable' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">{item.currentStock}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-600">{item.shortfall}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReplenishmentTable;
