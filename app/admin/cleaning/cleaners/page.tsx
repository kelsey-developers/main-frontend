'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCleaners } from '@/services/cleaningService';
import { CLEANER_STATUS_CONFIG } from '@/types/cleaning';
import type { Cleaner } from '@/types/cleaning';
import AddCleanerModal from './components/AddCleanerModal';

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

function CleanerCard({ cleaner }: { cleaner: Cleaner }) {
  const sc = CLEANER_STATUS_CONFIG[cleaner.status];
  const initials = cleaner.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Link
      href={`/admin/cleaning/cleaners/${cleaner.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0B5858]/20 transition-all p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">{cleaner.name}</h3>
          <p className="text-xs text-gray-500 truncate">{cleaner.email}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Jobs Done</p>
          <p className="text-lg font-bold text-gray-900">{cleaner.totalJobsCompleted}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Rating</p>
          <StarRating rating={cleaner.averageRating} />
        </div>
      </div>

      {/* Assigned Properties */}
      {cleaner.assignedProperties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cleaner.assignedProperties.slice(0, 3).map((p) => (
            <span key={p} className="px-2 py-0.5 bg-[#0B5858]/5 text-[#0B5858] rounded-md text-[10px] font-semibold border border-[#0B5858]/10">
              {p.replace('prop-00', 'P')}
            </span>
          ))}
          {cleaner.assignedProperties.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-semibold">
              +{cleaner.assignedProperties.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Phone */}
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {cleaner.phone}
      </p>
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors mb-1">
            <Link href="/admin/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Cleaning Management
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cleaner Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{cleaners.length} cleaners registered</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
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

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ key, label }) => {
              const count = key === '' ? cleaners.length : cleaners.filter((c) => c.status === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${statusFilter === key ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => <CleanerCard key={c.id} cleaner={c} />)}
        </div>
      )}

      {showAdd && <AddCleanerModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </div>
  );
}
