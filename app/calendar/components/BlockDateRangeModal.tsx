'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { listUnitsForManage } from '@/lib/api/units';
import type { Listing } from '@/types/listing';

type BlockedDateRange = { id: string; start_date: string; end_date: string; reason?: string; unit_ids?: string[] };

interface BlockDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onSave: (range: Omit<BlockedDateRange, 'id'>) => void;
}

/**
 * Modal for blocking a date range (e.g. drag-selected on calendar).
 * Pre-fills start/end from the selection; user can edit, add reason, and select which units to block.
 */
const BlockDateRangeModal: React.FC<BlockDateRangeModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onSave,
}) => {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [reason, setReason] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [units, setUnits] = useState<Listing[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const fetchUnits = useCallback(async (search: string) => {
    if (!search.trim()) {
      setUnits([]);
      setHasSearched(false);
      return;
    }
    setUnitsLoading(true);
    setHasSearched(true);
    try {
      const data = await listUnitsForManage({ search: search.trim() });
      setUnits(data);
    } catch {
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalStart(startDate);
      setLocalEnd(endDate);
      setReason('');
      setUnitSearch('');
      setSelectedUnitIds(new Set());
      setUnits([]);
      setHasSearched(false);
    }
  }, [isOpen, startDate, endDate]);

  useEffect(() => {
    if (!isOpen) return;
    const trimmed = unitSearch.trim();
    if (!trimmed) {
      setUnits([]);
      setHasSearched(false);
      return;
    }
    const t = setTimeout(() => fetchUnits(trimmed), 350);
    return () => clearTimeout(t);
  }, [isOpen, unitSearch, fetchUnits]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllUnits = () => {
    setSelectedUnitIds(new Set(units.map((u) => u.id)));
  };

  const clearUnits = () => {
    setSelectedUnitIds(new Set());
  };

  const handleSave = () => {
    if (!localStart || !localEnd) return;
    const [s, e] = [localStart, localEnd].sort();
    const unitIds = selectedUnitIds.size > 0 ? Array.from(selectedUnitIds) : undefined;
    onSave({
      start_date: s,
      end_date: e,
      reason: reason.trim() || undefined,
      unit_ids: unitIds,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
      onClick={onClose}
      style={{ overflow: 'visible', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        <div className="p-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
            Block dates
          </h2>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>
            These dates will be unavailable for bookings. Select units or leave empty for all units.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Start date
                </label>
                <input
                  type="date"
                  value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  End date
                </label>
                <input
                  type="date"
                  value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Private event"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                style={{ fontFamily: 'var(--font-poppins)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'var(--font-poppins)' }}>
                Units to block
              </label>
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search unit name to select..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>
              {!unitSearch.trim() ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 px-4 text-center">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Type above to search and select units
                  </p>
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Leave empty to block all units
                  </p>
                </div>
              ) : unitsLoading ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-10 px-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-[#0B5858]/30 border-t-[#0B5858] rounded-full animate-spin mb-2" />
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>Searching units...</p>
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 py-8 px-4 text-center">
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>No units found</p>
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>Try a different search term</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={selectAllUnits}
                      className="text-xs font-semibold text-[#0B5858] hover:underline"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={clearUnits}
                      className="text-xs font-medium text-gray-500 hover:underline"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-1">
                    {units.map((u) => {
                      const isSelected = selectedUnitIds.has(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleUnit(u.id)}
                          className={`flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left ${
                            isSelected
                              ? 'border-[#0B5858] ring-2 ring-[#0B5858]/20 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="aspect-[4/3] bg-gray-100 relative">
                            {u.main_image_url ? (
                              <img
                                src={u.main_image_url}
                                alt={u.title || 'Unit'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0B5858] flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="p-2 min-h-0">
                            <p className="text-xs font-semibold text-gray-900 truncate leading-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {u.title || 'Unit'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                {selectedUnitIds.size === 0 ? 'All units will be blocked' : `${selectedUnitIds.size} unit(s) selected`}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all cursor-pointer"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!localStart || !localEnd}
              className="flex-1 px-4 py-2.5 bg-[#0B5858] text-white rounded-lg font-medium hover:bg-[#094b4b] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Block dates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockDateRangeModal;
