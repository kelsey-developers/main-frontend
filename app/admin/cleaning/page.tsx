'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getCleaningJobs, getCleaners, verifyJob, cancelCleaningJob, assignCleaner } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG } from '@/types/cleaning';
import type { CleaningJob, Cleaner } from '@/types/cleaning';
import JobsTable from './components/JobsTable';
import ScheduleJobModal from './components/ScheduleJobModal';

const TODAY = new Date().toISOString().split('T')[0];

/** Summary stat card - design system aligned */
function SummaryCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2" style={{ fontFamily: 'Poppins' }}>{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${color ?? 'text-gray-900'}`} style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'Poppins' }}>{sub}</p>}
    </div>
  );
}

type StatusFilter = '' | 'scheduled' | 'in_progress' | 'completed' | 'verified' | 'cancelled';

export default function AdminCleaningPage() {
  const [jobs, setJobs] = useState<CleaningJob[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
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
  const filtered = jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false;
    if (dateFilter && j.scheduledDate !== dateFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.propertyName.toLowerCase().includes(q) || j.unitName?.toLowerCase().includes(q) || j.assignedCleanerName?.toLowerCase().includes(q);
    }
    return true;
  });

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border animate-fade-in-up ${toast.type === 'success' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-red-600 text-white border-red-600'}`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header - breadcrumb + title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'Poppins' }}>Admin · Cleaning Management</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Cleaning Management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/cleaning/schedule" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-sm" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </Link>
          <Link href="/admin/cleaning/cleaners" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-sm" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cleaners
          </Link>
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer shadow-sm shadow-[#0B5858]/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Job
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Scheduled Today" value={scheduledToday} sub="not yet started" color="text-blue-600" />
        <SummaryCard label="In Progress" value={inProgressToday} sub="currently active" color="text-[#0B5858]" />
        <SummaryCard label="Completed Today" value={completedToday} sub="today's done" color="text-emerald-600" />
        <SummaryCard label="Pending Verification" value={pendingVerification} sub="awaiting admin check" color={pendingVerification > 0 ? 'text-[#FACC15] text-shadow' : 'text-gray-900'} />
      </div>

      {/* Quick links to reports */}
      <Link href="/admin/cleaning/reports" className="flex items-center justify-between bg-[#0B5858]/5 rounded-xl px-4 py-3 border border-[#0B5858]/10 hover:bg-[#0B5858]/10 transition-colors cursor-pointer group">
        <span className="text-sm font-semibold text-[#0B5858]">View Cleaning Reports & Analytics</span>
        <svg className="w-4 h-4 text-[#0B5858] group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>

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
              placeholder="Search property, unit, cleaner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Date filter */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] text-gray-700 cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {(['', 'scheduled', 'in_progress', 'completed', 'verified', 'cancelled'] as StatusFilter[]).map((s) => {
              const label = s === '' ? 'All' : JOB_STATUS_CONFIG[s].label;
              const count = s === '' ? jobs.length : jobs.filter((j) => j.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${statusFilter === s ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCSV}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Jobs table */}
      <JobsTable
        jobs={filtered}
        onVerify={handleVerify}
        onCancel={handleCancel}
        onAssign={handleAssign}
      />

      {showSchedule && (
        <ScheduleJobModal
          onClose={() => setShowSchedule(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
