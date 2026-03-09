'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getCleanerById, getCleanerJobs } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG, CLEANER_STATUS_CONFIG } from '@/types/cleaning';
import type { Cleaner, CleaningJob } from '@/types/cleaning';

interface Props {
  params: Promise<{ id: string }>;
}

type Tab = 'history' | 'performance' | 'properties';

const MOCK_PROPERTIES = [
  { id: 'prop-001', name: 'Villa Rosa' },
  { id: 'prop-002', name: 'Casa Blanca' },
  { id: 'prop-003', name: 'Bayside Suites' },
];

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={`${s} ${n <= Math.round(rating) ? 'text-[#FACC15]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className={`ml-1 font-bold text-gray-700 ${size === 'lg' ? 'text-sm' : 'text-[10px]'}`}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
    </div>
  );
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function durationLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// Job History Tab
function JobHistoryTab({ jobs }: { jobs: CleaningJob[] }) {
  const [statusFilter, setStatusFilter] = useState('');
  const statuses = ['scheduled', 'in_progress', 'completed', 'verified', 'cancelled'] as const;
  const filtered = statusFilter ? jobs.filter((j) => j.status === statusFilter) : jobs;

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${!statusFilter ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
        >
          All ({jobs.length})
        </button>
        {statuses.map((s) => {
          const count = jobs.filter((j) => j.status === s).length;
          if (count === 0) return null;
          const sc = JOB_STATUS_CONFIG[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${statusFilter === s ? sc.classes : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              {sc.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Jobs table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">No jobs match this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Property / Unit</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Duration</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered
                .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
                .map((job) => {
                  const sc = JOB_STATUS_CONFIG[job.status];
                  const tc = JOB_TYPE_CONFIG[job.jobType];
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm">{job.propertyName}</p>
                        {job.unitName && <p className="text-xs text-gray-400">{job.unitName}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${tc.bgColor} ${tc.color}`}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{new Date(job.scheduledDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[11px] text-gray-400">{fmtTime(job.scheduledTime)}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-700">{job.actualDuration ? durationLabel(job.actualDuration) : durationLabel(job.estimatedDuration)}</p>
                        {job.actualDuration && <p className="text-[10px] text-gray-400">actual</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.classes}`}>
                          <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Performance Tab
function PerformanceTab({ cleaner, jobs }: { cleaner: Cleaner; jobs: CleaningJob[] }) {
  const completed = jobs.filter((j) => j.status === 'completed' || j.status === 'verified');
  const cancelled = jobs.filter((j) => j.status === 'cancelled');
  const completionRate = jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : 0;
  const avgActualDuration = completed.filter((j) => j.actualDuration).length > 0
    ? Math.round(completed.filter((j) => j.actualDuration).reduce((sum, j) => sum + (j.actualDuration ?? 0), 0) / completed.filter((j) => j.actualDuration).length)
    : null;
  const avgEstDuration = completed.length > 0
    ? Math.round(completed.reduce((sum, j) => sum + j.estimatedDuration, 0) / completed.length)
    : null;

  // Last 6 months job count
  const monthCounts: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const count = jobs.filter((j) => j.scheduledDate.startsWith(prefix)).length;
    monthCounts.push({
      month: d.toLocaleDateString('en-PH', { month: 'short' }),
      count,
    });
  }
  const maxCount = Math.max(...monthCounts.map((m) => m.count), 1);

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Jobs</p>
          <p className="text-3xl font-bold text-gray-900">{cleaner.totalJobsCompleted}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Completion Rate</p>
          <p className="text-3xl font-bold text-emerald-600">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Avg Rating</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-3xl font-bold text-[#FACC15]">{cleaner.averageRating > 0 ? cleaner.averageRating.toFixed(1) : '—'}</p>
            {cleaner.averageRating > 0 && <p className="text-sm text-gray-400">/ 5</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cancelled</p>
          <p className="text-3xl font-bold text-red-500">{cancelled.length}</p>
        </div>
      </div>

      {/* Duration efficiency */}
      {avgActualDuration !== null && avgEstDuration !== null && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Duration Efficiency</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Avg Estimated</p>
              <p className="text-xl font-bold text-gray-700">{durationLabel(avgEstDuration)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Avg Actual</p>
              <p className={`text-xl font-bold ${avgActualDuration <= avgEstDuration ? 'text-emerald-600' : 'text-red-500'}`}>
                {durationLabel(avgActualDuration)}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {avgActualDuration < avgEstDuration
              ? `✓ On average ${durationLabel(avgEstDuration - avgActualDuration)} faster than estimated`
              : avgActualDuration > avgEstDuration
              ? `⚠ On average ${durationLabel(avgActualDuration - avgEstDuration)} slower than estimated`
              : '✓ Exactly on time on average'}
          </div>
        </div>
      )}

      {/* Monthly bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jobs Last 6 Months</p>
        <div className="flex items-end gap-2 h-24">
          {monthCounts.map(({ month, count }) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-gray-600">{count > 0 ? count : ''}</span>
              <div
                className="w-full bg-[#0B5858] rounded-t-md transition-all"
                style={{ height: `${(count / maxCount) * 64}px`, minHeight: count > 0 ? '4px' : '0' }}
              />
              <span className="text-[10px] text-gray-400">{month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Job type breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Jobs by Type</p>
        <div className="space-y-2">
          {(['checkout', 'checkin_prep', 'routine', 'adhoc', 'deep_clean', 'inspection', 'emergency'] as const).map((type) => {
            const count = jobs.filter((j) => j.jobType === type).length;
            if (count === 0) return null;
            const tc = JOB_TYPE_CONFIG[type];
            const pct = jobs.length > 0 ? Math.round((count / jobs.length) * 100) : 0;
            return (
              <div key={type} className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border w-28 justify-center ${tc.bgColor} ${tc.color}`}>
                  {tc.label}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0B5858] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Assigned Properties Tab
function PropertiesTab({ cleaner }: { cleaner: Cleaner }) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Assigned Properties</p>
        {MOCK_PROPERTIES.length === 0 ? (
          <p className="text-sm text-gray-400">No properties available.</p>
        ) : (
          <div className="space-y-3">
            {MOCK_PROPERTIES.map((p) => {
              const assigned = cleaner.assignedProperties.includes(p.id);
              return (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${assigned ? 'bg-[#0B5858]/5 border-[#0B5858]/20' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${assigned ? 'bg-[#0B5858]/10' : 'bg-gray-200'}`}>
                      <svg className={`w-4 h-4 ${assigned ? 'text-[#0B5858]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <span className={`text-sm font-semibold ${assigned ? 'text-[#0B5858]' : 'text-gray-600'}`}>{p.name}</span>
                  </div>
                  {assigned ? (
                    <span className="text-[10px] font-bold text-[#0B5858] bg-[#0B5858]/10 px-2 py-0.5 rounded-full">Assigned</span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not Assigned</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 text-center">Contact admin to modify property assignments.</p>
    </div>
  );
}

export default function CleanerDetailPage({ params }: Props) {
  const { id } = use(params);
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [jobs, setJobs] = useState<CleaningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('history');

  useEffect(() => {
    Promise.all([
      getCleanerById(id),
      getCleanerJobs(id),
    ]).then(([c, j]) => {
      setCleaner(c);
      setJobs(j);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (!cleaner) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Cleaner not found.</p>
        <Link href="/admin/cleaning/cleaners" className="mt-4 inline-block text-sm font-semibold text-[#0B5858] hover:underline">← Back to Cleaners</Link>
      </div>
    );
  }

  const sc = CLEANER_STATUS_CONFIG[cleaner.status];
  const initials = cleaner.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'verified');
  const pendingJobs = jobs.filter((j) => j.status === 'scheduled' || j.status === 'in_progress');

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'history', label: 'Job History', count: jobs.length },
    { key: 'performance', label: 'Performance' },
    { key: 'properties', label: 'Properties', count: cleaner.assignedProperties.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Breadcrumb */}
      <div>
        <Link href="/admin/cleaning/cleaners" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cleaner Directory
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900">{cleaner.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.classes}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {cleaner.email}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {cleaner.phone}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Joined {new Date(cleaner.joinedAt).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="mt-2">
              <StarRating rating={cleaner.averageRating} size="lg" />
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 sm:gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{cleaner.totalJobsCompleted}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{completedJobs.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Done</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{pendingJobs.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === key ? 'bg-[#0B5858] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
            {count !== undefined && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold ${activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'history' && <JobHistoryTab jobs={jobs} />}
      {activeTab === 'performance' && <PerformanceTab cleaner={cleaner} jobs={jobs} />}
      {activeTab === 'properties' && <PropertiesTab cleaner={cleaner} />}
    </div>
  );
}
