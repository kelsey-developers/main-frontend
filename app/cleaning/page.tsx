'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getCleaningJobs, getCleanerJobs } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';
import JobCard from './components/JobCard';

/** Mock logged-in cleaner — swap with real auth */
const CLEANER_ID = 'cleaner-001';
const TODAY = new Date().toISOString().split('T')[0];

type Tab = 'today' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: "Today's Jobs" },
  { key: 'all', label: 'All Jobs' },
];

const ALL_STATUSES = ['scheduled', 'in_progress', 'completed', 'verified', 'cancelled'] as const;

/**
 * Status filter dropdown — same pattern as agent commissions/payouts CustomDropdown.
 * Used on the same row as tab headers when "All Jobs" is active.
 */
function StatusFilterDropdown({
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
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 pl-3 pr-2.5 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm min-w-[140px]"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full right-0 mt-2 w-full min-w-[160px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setTimeout(() => setIsOpen(false), 150);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value
                  ? 'bg-[#0B5858]/10 text-[#0B5858]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Stat card matching agent hub design: white card, label uppercase, value bold; mobile-friendly 2-col */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow relative overflow-hidden min-w-0">
      <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 sm:mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub != null && sub !== '' && (
        <p className="text-[11px] sm:text-xs font-medium text-gray-400 mt-1 sm:mt-2 line-clamp-1">{sub}</p>
      )}
    </div>
  );
}

export default function CleaningHubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [todayJobs, setTodayJobs] = useState<CleaningJob[]>([]);
  const [allJobs, setAllJobs] = useState<CleaningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  /** Refs for indicator — same mechanism as Rewards Hub: refs on label spans, measure text width */
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const updateIndicator = useCallback(() => {
    const container = tabContainerRef.current;
    const activeIndex = activeTab === 'today' ? 0 : 1;
    const labelEl = tabLabelRefs.current[activeIndex];
    if (!container || !labelEl) return;
    const cRect = container.getBoundingClientRect();
    const elRect = labelEl.getBoundingClientRect();
    setIndicatorStyle({
      left: elRect.left - cRect.left,
      width: elRect.width,
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const onResize = () => updateIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updateIndicator]);

  useEffect(() => {
    Promise.all([
      getCleaningJobs({ cleanerId: CLEANER_ID, dateFrom: TODAY, dateTo: TODAY }),
      getCleanerJobs(CLEANER_ID),
    ]).then(([today, all]) => {
      setTodayJobs(today);
      setAllJobs(all);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent"
          aria-label="Loading"
        />
      </div>
    );
  }

  const filteredAll = statusFilter
    ? allJobs.filter((j) => j.status === statusFilter)
    : allJobs;
  const inProgressCount = todayJobs.filter((j) => j.status === 'in_progress').length;
  const completedTodayCount = todayJobs.filter(
    (j) => j.status === 'completed' || j.status === 'verified'
  ).length;
  const completedTotalCount = allJobs.filter(
    (j) => j.status === 'completed' || j.status === 'verified'
  ).length;

  return (
    <div className="py-8 space-y-6 animate-fade-in-up">
      {/* Page title — no header with name/profile; agent-style minimal title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cleaning Hub</h1>
      </div>

      {/* 4 stats cards — 2 columns on mobile, 2 sm, 4 lg; tighter gap on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          label="Today's Jobs"
          value={todayJobs.length}
          sub={`${todayJobs.length === 0 ? 'No' : todayJobs.length} scheduled`}
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          sub={inProgressCount > 0 ? 'Active now' : 'None'}
        />
        <StatCard
          label="Done Today"
          value={completedTodayCount}
          sub="Completed or verified"
        />
        <StatCard
          label="Total Completed"
          value={completedTotalCount}
          sub="All time"
        />
      </div>

      {/* Tabs (left) + Filter (right): same mechanism as Rewards Hub — inline-flex gap, refs on labels, left+width indicator */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div ref={tabContainerRef} className="relative inline-flex gap-8 -mb-px pb-[1px] w-full max-w-md">
          {TABS.map(({ key, label }, index) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="px-0 pt-2.5 pb-2.5 text-left text-base sm:text-lg font-semibold transition-colors duration-200 cursor-pointer text-gray-500 hover:text-gray-900 whitespace-nowrap"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <span
                ref={(el) => {
                  tabLabelRefs.current[index] = el;
                }}
                className={`inline-block ${activeTab === key ? 'text-[#0B5858]' : ''}`}
              >
                {label}
              </span>
            </button>
          ))}
          {/* Grey baseline: Rewards-style gradient fade; z-0 */}
          <div
            className="pointer-events-none absolute -bottom-px left-0 h-px w-[95%] z-0"
            style={{
              background: 'linear-gradient(to right, rgba(209,213,219,1) 0%, rgba(209,213,219,0.7) 60%, rgba(209,213,219,0.25) 85%, transparent 100%)',
            }}
            aria-hidden
          />
          {/* Teal indicator: left + width from getBoundingClientRect (same as Rewards Hub); z-10 above baseline */}
          <div
            className="absolute -bottom-px left-0 h-1 bg-[#0B5858] transition-all duration-300 ease-out z-10"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            aria-hidden
          />
        </div>
        {/* Filter: below tabs on mobile; right-aligned; same row on desktop */}
        {activeTab === 'all' && (
          <div className="flex justify-end sm:mb-0.5">
            <StatusFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: `All (${allJobs.length})` },
                ...ALL_STATUSES.filter((s) => allJobs.filter((j) => j.status === s).length > 0).map(
                  (s) => ({
                    value: s,
                    label: `${JOB_STATUS_CONFIG[s].label} (${allJobs.filter((j) => j.status === s).length})`,
                  })
                ),
              ]}
            />
          </div>
        )}
      </div>

      {/* Today's Jobs — no duplicate title */}
      {activeTab === 'today' && (
        <section>
          {todayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg
                className="w-10 h-10 text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="text-sm font-semibold text-gray-600 mb-0.5">
                No jobs scheduled today
              </h3>
              <p className="text-xs text-gray-500">
                Check All Jobs for upcoming assignments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {todayJobs
                .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                .map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
            </div>
          )}
        </section>
      )}

      {/* All Jobs — no duplicate title; filter is in dropdown on tab row */}
      {activeTab === 'all' && (
        <section>
          {filteredAll.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No jobs match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredAll
                .sort(
                  (a, b) =>
                    b.scheduledDate.localeCompare(a.scheduledDate) ||
                    a.scheduledTime.localeCompare(b.scheduledTime)
                )
                .map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
