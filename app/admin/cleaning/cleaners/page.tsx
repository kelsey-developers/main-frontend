'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getCleaners } from '@/services/cleaningService';
import { CLEANER_STATUS_CONFIG } from '@/types/cleaning';
import type { Cleaner } from '@/types/cleaning';
import AddCleanerModal from './components/AddCleanerModal';

/** Dropdown — same format as admin/cleaning, admin/commissions: rounded-2xl, shadow, click-outside close */
function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-[#FACC15]' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] font-bold text-gray-500">{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
    </div>
  );
}

/** Cleaner card — design-system hierarchy: rounded-3xl, section labels (uppercase), chips, stats grid */
function CleanerCard({ cleaner }: { cleaner: Cleaner }) {
  const sc = CLEANER_STATUS_CONFIG[cleaner.status];
  const initials = cleaner.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Link
      href={`/admin/cleaning/cleaners/${cleaner.id}`}
      className="block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0B5858]/15 transition-all p-6 flex flex-col gap-0"
    >
      {/* Avatar centered on top */}
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B5858] to-[#073A3A] flex items-center justify-center shadow-sm">
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Poppins' }}>{initials}</span>
        </div>
      </div>
      {/* Identity: name (primary), email + phone (secondary), status chip */}
      <div className="text-center mt-4 min-w-0 px-1">
        <h3 className="text-base font-bold text-gray-900 tracking-tight break-words leading-snug">{cleaner.name}</h3>
        <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-center gap-1.5 break-all">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="break-all">{cleaner.email}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="truncate">{cleaner.phone}</span>
        </p>
        <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-medium chip-shadow" style={sc.chipStyle}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {/* Stats — centered two-column grid */}
      <div className="border-t border-gray-100 pt-4 mt-4 text-center">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jobs Done</p>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{cleaner.totalJobsCompleted}</p>
          </div>
          <div className="text-center flex flex-col items-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rating</p>
            <StarRating rating={cleaner.averageRating} />
          </div>
        </div>
      </div>

      {/* Assigned Properties — centered */}
      {cleaner.assignedProperties.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-4 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Properties</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {cleaner.assignedProperties.slice(0, 3).map((p) => (
              <span key={p} className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100 border border-gray-100">
                {p.replace('prop-00', 'P')}
              </span>
            ))}
            {cleaner.assignedProperties.length > 3 && (
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100">
                +{cleaner.assignedProperties.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'busy', label: 'Busy' },
  { key: 'off_duty', label: 'Off Duty' },
  { key: 'inactive', label: 'Inactive' },
] as const;

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getCleaners().then((c) => {
      setCleaners(c);
      setLoading(false);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreated = (cleaner: Cleaner) => {
    setCleaners((prev) => [cleaner, ...prev]);
    setShowAdd(false);
    showToast(`${cleaner.name} added successfully.`);
  };

  const filtered = cleaners.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold bg-[#0B5858] text-white border border-[#0B5858] animate-fade-in-up">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/admin/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors mb-1" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cleaning Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Cleaner Directory</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20 shrink-0"
          style={{ fontFamily: 'Poppins', fontWeight: 600 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cleaner
        </button>
      </div>

      {/* Availability summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATUS_FILTERS.slice(1).map(({ key, label }) => {
          const count = cleaners.filter((c) => c.status === key).length;
          const sc = CLEANER_STATUS_CONFIG[key as keyof typeof CLEANER_STATUS_CONFIG];
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search and filter — same layout and design as admin/cleaning, admin/commissions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={STATUS_FILTERS.map(({ key, label }) => ({
              value: key,
              label: key === '' ? 'All Status' : label,
            }))}
            className="min-w-[140px]"
          />
        </div>
      </div>

      {/* Cleaner cards grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">No cleaners found</h3>
          <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => <CleanerCard key={c.id} cleaner={c} />)}
        </div>
      )}

      {showAdd && <AddCleanerModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </div>
  );
}
