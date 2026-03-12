'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { getCleaningJobs, getCleaners, verifyJob, cancelCleaningJob, assignCleaner } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG } from '@/types/cleaning';
import type { CleaningJob, Cleaner } from '@/types/cleaning';
import JobsTable from './components/JobsTable';
import ScheduleJobModal from './components/ScheduleJobModal';

const TODAY = new Date().toISOString().split('T')[0];

/** Stat card — same as overview: rounded-3xl, no icon */
function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub != null && <p className="text-xs font-medium text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

type StatusFilter = '' | 'scheduled' | 'in_progress' | 'completed' | 'verified' | 'cancelled';

/** Dropdown — same format as admin/commissions: rounded-2xl, shadow, click-outside close */
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

export default function AdminCleaningPage() {
  const [jobs, setJobs] = useState<CleaningJob[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const [j, c] = await Promise.all([getCleaningJobs(), getCleaners()]);
    setJobs(j);
    setCleaners(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayJobs = jobs.filter((j) => j.scheduledDate === TODAY);
  const scheduledToday = todayJobs.filter((j) => j.status === 'scheduled').length;
  const inProgressToday = todayJobs.filter((j) => j.status === 'in_progress').length;
  const completedToday = todayJobs.filter((j) => j.status === 'completed').length;
  const pendingVerification = jobs.filter((j) => j.status === 'completed').length;

  const handleVerify = async (jobId: string) => {
    await verifyJob(jobId);
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'verified' } : j));
    showToast('success', 'Job verified successfully.');
  };

  const handleCancel = async (jobId: string) => {
    await cancelCleaningJob(jobId, 'Cancelled by admin');
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'cancelled' } : j));
    showToast('success', 'Job cancelled.');
  };

  const handleAssign = async (job: CleaningJob) => {
    const available = cleaners.filter((c) => c.status === 'available' || c.status === 'busy');
    if (available.length === 0) { showToast('error', 'No cleaners available.'); return; }
    const cleaner = available[0]; // auto-assign first available
    await assignCleaner(job.id, cleaner.id);
    setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, assignedCleanerId: cleaner.id, assignedCleanerName: cleaner.name } : j));
    showToast('success', `Assigned to ${cleaner.name}.`);
  };

  const handleJobCreated = (job: CleaningJob) => {
    setJobs((prev) => [job, ...prev]);
    setShowSchedule(false);
    showToast('success', 'Cleaning job scheduled successfully.');
  };

  // Filtered jobs for table
  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter && j.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return j.propertyName.toLowerCase().includes(q) || j.unitName?.toLowerCase().includes(q) || j.assignedCleanerName?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [jobs, statusFilter, search]);

  useEffect(() => setCurrentPage(1), [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const exportCSV = () => {
    const rows = [
      ['ID', 'Property', 'Unit', 'Type', 'Status', 'Date', 'Time', 'Duration', 'Cleaner', 'Requested By'],
      ...filtered.map((j) => [j.id, j.propertyName, j.unitName ?? '', j.jobType, j.status, j.scheduledDate, j.scheduledTime, String(j.estimatedDuration), j.assignedCleanerName ?? '', j.requestedBy]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cleaning-jobs-${TODAY}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast != null && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in-up ${toast.type === 'success' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-red-600 text-white border-red-600'}`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Page header — same pattern as admin overview: title left, actions right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cleaning Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule jobs, manage cleaners, and view reports.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end ml-auto">
          <Link
            href="/admin/cleaning/schedule"
            className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </Link>
          <Link
            href="/admin/cleaning/cleaners"
            className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cleaners
          </Link>
        </div>
      </div>

      {/* Summary cards — same as overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <StatCard label="Scheduled Today" value={scheduledToday} sub="not yet started" />
        <StatCard label="In Progress" value={inProgressToday} sub="currently active" />
        <StatCard label="Completed Today" value={completedToday} sub="today's done" />
        <StatCard label="Pending Verification" value={pendingVerification} sub="awaiting admin check" />
      </div>

      {/* Reports link and Schedule Job on same row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/admin/cleaning/reports"
          className="flex items-center gap-2 flex-1 min-w-0 rounded-xl pl-4 pr-4 py-3 border-l-4 border-l-[#0B5858] bg-gradient-to-r from-[#094848]/50 via-[#0B5858]/20 to-[#0B5858]/06 hover:from-[#094848]/60 hover:via-[#0B5858]/25 hover:to-[#0B5858]/10 transition-all cursor-pointer group"
        >
          <span className="text-sm font-semibold text-black">View Cleaning Reports & Analytics</span>
          <svg className="w-4 h-4 text-[#0B5858] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => setShowSchedule(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98] shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Job
        </button>
      </div>

      {/* Search, filters, export — same layout and design as admin/commissions */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search property, unit, cleaner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as StatusFilter)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'scheduled', label: JOB_STATUS_CONFIG.scheduled.label },
              { value: 'in_progress', label: JOB_STATUS_CONFIG.in_progress.label },
              { value: 'completed', label: JOB_STATUS_CONFIG.completed.label },
              { value: 'verified', label: JOB_STATUS_CONFIG.verified.label },
              { value: 'cancelled', label: JOB_STATUS_CONFIG.cancelled.label },
            ]}
            className="min-w-[140px]"
          />
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Table — same layout and design as admin/commissions: rounded-3xl, header style, pagination */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <JobsTable
            jobs={paginatedJobs}
            filteredCount={filtered.length}
            onVerify={handleVerify}
            onCancel={handleCancel}
            onAssign={handleAssign}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
          <p className="text-xs font-medium text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-gray-900">{filtered.length}</span> results
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                aria-label="Previous page"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3 && currentPage < totalPages - 1) {
                      pageNum = currentPage - 2 + i;
                    } else if (currentPage >= totalPages - 1) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 ${
                        isActive ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                aria-label="Next page"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {showSchedule && (
        <ScheduleJobModal
          onClose={() => setShowSchedule(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
