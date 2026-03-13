'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { InventoryUnit } from '../types';

interface SearchUnitsProps {
  units: InventoryUnit[];
  /** When true, unit links include ?from=allocations for back navigation */
  fromAllocations?: boolean;
}

const SearchUnits: React.FC<SearchUnitsProps> = ({ units, fromAllocations }) => {
  const unitHref = (id: string) =>
    fromAllocations ? `/sales-report/inventory/units/${id}?from=allocations` : `/sales-report/inventory/units/${id}`;
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [mobileLocationDropdownOpen, setMobileLocationDropdownOpen] = useState(false);
  const [mobileTypeDropdownOpen, setMobileTypeDropdownOpen] = useState(false);

  // Handle SSR - portal needs document.body
  useEffect(() => {
    setMounted(true);
  }, []);

  const locations = useMemo(() => {
    const set = new Set(units.map((u) => u.location).filter((loc): loc is string => Boolean(loc)));
    return Array.from(set).sort();
  }, [units]);

  const unitTypes = useMemo(() => {
    const set = new Set(units.map((u) => u.type).filter((type): type is string => Boolean(type)));
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

  // Body scroll lock for mobile modal
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Close dropdowns when modal closes
      setMobileLocationDropdownOpen(false);
      setMobileTypeDropdownOpen(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isModalOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isModalOpen]);

  const activeFiltersCount = [search, filterLocation, filterType].filter(Boolean).length;

  return (
    <>
      {/* Mobile: Clickable card button */}
      <div className="md:hidden">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full rounded-xl border border-gray-200 bg-white shadow-sm p-4 text-left hover:border-[#0B5858]/30 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
                <svg className="w-5 h-5 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Units
              </h3>
              <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied` : 'Tap to search and filter'}
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* Desktop: Original card view */}
      <div className="hidden md:flex flex-col max-h-[50vh] md:h-full md:max-h-[420px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>
            Search Units
          </h3>
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13px] text-gray-900 placeholder-gray-400 bg-white focus:border-[#0B5858] focus:ring-2 focus:ring-[#cce8e8] outline-none transition-all"
            style={{ fontFamily: 'Poppins' }}
            suppressHydrationWarning
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Location Filter Dropdown */}
            {locations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setLocationDropdownOpen(!locationDropdownOpen);
                    setTypeDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 w-full px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white text-[13px] outline-none transition-all ${
                    locationDropdownOpen
                      ? 'border-[#0B5858] ring-2 ring-[#cce8e8]'
                      : 'border-gray-200'
                  } ${filterLocation ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  <span className="truncate">{filterLocation || 'All locations'}</span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 11 11"
                    fill="none"
                    className={`flex-shrink-0 transition-transform ${locationDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    <path
                      d="M1.5 3.5l4 4 4-4"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {locationDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLocationDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-1.5 bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 w-full max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilterLocation('');
                          setLocationDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                          !filterLocation
                            ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold border-gray-50'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-50'
                        }`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {!filterLocation ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="#05807e"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="w-3 inline-block" />
                        )}
                        All locations
                      </button>
                      {locations.map((loc, i) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setFilterLocation(loc);
                            setLocationDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                            i < locations.length - 1 ? 'border-gray-50' : 'border-transparent'
                          } ${
                            filterLocation === loc
                              ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {filterLocation === loc ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="#05807e"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 inline-block" />
                          )}
                          {loc}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Type Filter Dropdown */}
            {unitTypes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setTypeDropdownOpen(!typeDropdownOpen);
                    setLocationDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 w-full px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white text-[13px] outline-none transition-all ${
                    typeDropdownOpen
                      ? 'border-[#0B5858] ring-2 ring-[#cce8e8]'
                      : 'border-gray-200'
                  } ${filterType ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  <span className="truncate">{filterType ? filterType.charAt(0).toUpperCase() + filterType.slice(1) : 'All types'}</span>
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 11 11"
                    fill="none"
                    className={`flex-shrink-0 transition-transform ${typeDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                  >
                    <path
                      d="M1.5 3.5l4 4 4-4"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {typeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-1.5 bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 w-full max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilterType('');
                          setTypeDropdownOpen(false);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                          !filterType
                            ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold border-gray-50'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-50'
                        }`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {!filterType ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="#05807e"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="w-3 inline-block" />
                        )}
                        All types
                      </button>
                      {unitTypes.map((type, i) => (
                        <button
                          key={type}
                          onClick={() => {
                            setFilterType(type);
                            setTypeDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                            i < unitTypes.length - 1 ? 'border-gray-50' : 'border-transparent'
                          } ${
                            filterType === type
                              ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {filterType === type ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="#05807e"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 inline-block" />
                          )}
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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

      {/* Mobile: Full-screen modal (rendered via portal to document.body) */}
      {mounted && isModalOpen && createPortal(
        <>
          <style>{`
            @keyframes modalSlideUp {
              from {
                opacity: 0;
                transform: translateY(100%);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes modalFadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            .modal-slide-up {
              animation: modalSlideUp 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .modal-fade-in {
              animation: modalFadeIn 300ms ease-out forwards;
            }
            .modal-fade-in-delayed {
              opacity: 0;
              animation: modalFadeIn 300ms ease-out 200ms forwards;
            }
          `}</style>
          <div className="md:hidden fixed inset-0 z-[10000] bg-white flex flex-col modal-slide-up">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#0b5858] to-[#05807e] px-4 py-4 shadow-lg">
              <div className="flex items-center justify-between mb-4 modal-fade-in">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>
                  Search Units
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close search"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

            <div className="modal-fade-in-delayed">
            {/* Search input */}
            <div className="relative">
              <svg
                width="14"
                height="14"
                fill="none"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/95 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 text-base"
                style={{ fontFamily: 'Poppins' }}
                autoFocus
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {/* Location Filter Dropdown */}
              {locations.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setMobileLocationDropdownOpen(!mobileLocationDropdownOpen);
                      setMobileTypeDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 w-full px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white/95 text-[13px] outline-none transition-all ${
                      mobileLocationDropdownOpen
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/20'
                    } ${filterLocation ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <span className="truncate">{filterLocation || 'All locations'}</span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 11 11"
                      fill="none"
                      className={`flex-shrink-0 transition-transform ${mobileLocationDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                    >
                      <path
                        d="M1.5 3.5l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {mobileLocationDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[10001]" onClick={() => setMobileLocationDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-hidden z-[10002] w-full max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setFilterLocation('');
                            setMobileLocationDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                            !filterLocation
                              ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold border-gray-50'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-50'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {!filterLocation ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="#05807e"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 inline-block" />
                          )}
                          All locations
                        </button>
                        {locations.map((loc, i) => (
                          <button
                            key={loc}
                            onClick={() => {
                              setFilterLocation(loc);
                              setMobileLocationDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                              i < locations.length - 1 ? 'border-gray-50' : 'border-transparent'
                            } ${
                              filterLocation === loc
                                ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {filterLocation === loc ? (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="#05807e"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <span className="w-3 inline-block" />
                            )}
                            {loc}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Type Filter Dropdown */}
              {unitTypes.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setMobileTypeDropdownOpen(!mobileTypeDropdownOpen);
                      setMobileLocationDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 w-full px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white/95 text-[13px] outline-none transition-all ${
                      mobileTypeDropdownOpen
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/20'
                    } ${filterType ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <span className="truncate">{filterType ? filterType.charAt(0).toUpperCase() + filterType.slice(1) : 'All types'}</span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 11 11"
                      fill="none"
                      className={`flex-shrink-0 transition-transform ${mobileTypeDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                    >
                      <path
                        d="M1.5 3.5l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {mobileTypeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[10001]" onClick={() => setMobileTypeDropdownOpen(false)} />
                      <div className="absolute top-full left-0 mt-1.5 bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-hidden z-[10002] w-full max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setFilterType('');
                            setMobileTypeDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                            !filterType
                              ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold border-gray-50'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-50'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {!filterType ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="#05807e"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="w-3 inline-block" />
                          )}
                          All types
                        </button>
                        {unitTypes.map((type, i) => (
                          <button
                            key={type}
                            onClick={() => {
                              setFilterType(type);
                              setMobileTypeDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                              i < unitTypes.length - 1 ? 'border-gray-50' : 'border-transparent'
                            } ${
                              filterType === type
                                ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {filterType === type ? (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="#05807e"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <span className="w-3 inline-block" />
                            )}
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterLocation('');
                  setFilterType('');
                }}
                className="mt-3 text-sm text-white/90 hover:text-white underline"
                style={{ fontFamily: 'Poppins' }}
              >
                Clear all filters
              </button>
            )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>
                {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 text-base" style={{ fontFamily: 'Poppins' }}>
                  No units match your search
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUnits.map((unit) => (
                  <Link
                    key={unit.id}
                    href={unitHref(unit.id)}
                    onClick={() => setIsModalOpen(false)}
                    className="flex gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#0B5858]/40 hover:shadow-md transition-all"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      <img
                        src={unit.imageUrl || '/heroimage.png'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-semibold text-gray-900 truncate" style={{ fontFamily: 'Poppins' }}>
                          {unit.name}
                        </p>
                        {unit.type && (
                          <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 flex-shrink-0" style={{ fontFamily: 'Poppins' }}>
                            {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                          </span>
                        )}
                      </div>
                      {unit.location && (
                        <p className="text-sm text-gray-600 truncate mt-1 flex items-center gap-1" style={{ fontFamily: 'Poppins' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {unit.location}
                        </p>
                      )}
                      {unit.itemCount != null && (
                        <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                          {unit.itemCount} items assigned
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 self-center" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        </>,
        document.body
      )}
    </>
  );
};

export default SearchUnits;
