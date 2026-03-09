'use client';

import React, { useEffect, useState } from 'react';
import { getCleaningJobs, getCleanerById, getCleanerJobs } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG } from '@/types/cleaning';
import type { CleaningJob, Cleaner } from '@/types/cleaning';
import JobCard from './components/JobCard';
import CleanerProfile from './components/CleanerProfile';

// Mock logged-in cleaner — swap with real auth
const CLEANER_ID = 'cleaner-001';
const TODAY = new Date().toISOString().split('T')[0];

type Tab = 'today' | 'all' | 'profile';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: "Today's Jobs" },
  { key: 'all', label: 'All Jobs' },
  { key: 'profile', label: 'Profile' },
];

const DAY_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ALL_STATUSES = ['scheduled', 'in_progress', 'completed', 'verified', 'cancelled'] as const;

export default function CleaningHubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [todayJobs, setTodayJobs] = useState<CleaningJob[]>([]);
  const [allJobs, setAllJobs] = useState<CleaningJob[]>([]);
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = `${DAY_OF_WEEK[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  useEffect(() => {
    Promise.all([
      getCleaningJobs({ cleanerId: CLEANER_ID, dateFrom: TODAY, dateTo: TODAY }),
      getCleanerJobs(CLEANER_ID),
      getCleanerById(CLEANER_ID),
    ]).then(([today, all, c]) => {
      setTodayJobs(today);
      setAllJobs(all);
      setCleaner(c);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  const filteredAll = statusFilter ? allJobs.filter((j) => j.status === statusFilter) : allJobs;
  const activeJobs = todayJobs.filter((j) => j.status === 'scheduled' || j.status === 'in_progress');

  return (
    <div className="max-w-lg mx-auto px-4 pb-12">

      {/* Greeting header */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#0B5858] to-[#073A3A] px-5 pt-6 pb-8 mb-6 -mx-4 shadow-lg shadow-[#0B5858]/20">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-[#FACC15]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-white/60 text-xs font-medium">{dateLabel}</p>
          <h1 className="text-xl font-bold text-white mt-0.5">
            {greeting}, {cleaner?.name.split(' ')[0]} 👋
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
              {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} today
            </span>
            {todayJobs.some((j) => j.status === 'in_progress') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FACC15]/20 text-[#FACC15] text-xs font-bold">
                1 in progress
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5">
        {TABS.map(({ key, label }) => {
          const count = key === 'today' ? todayJobs.length : key === 'all' ? allJobs.length : undefined;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === key ? 'bg-white text-[#0B5858] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
              {count !== undefined && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${activeTab === key ? 'bg-[#0B5858] text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Today's Jobs */}
      {activeTab === 'today' && (
        <div className="space-y-3">
          {todayJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-700 mb-1">No jobs scheduled today</h3>
              <p className="text-sm text-gray-400">Check "All Jobs" for upcoming assignments.</p>
            </div>
          ) : (
            todayJobs
              .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
              .map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      )}

      {/* All Jobs */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${!statusFilter ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              All ({allJobs.length})
            </button>
            {ALL_STATUSES.map((s) => {
              const count = allJobs.filter((j) => j.status === s).length;
              if (count === 0) return null;
              const sc = JOB_STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${statusFilter === s ? `${sc.classes}` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {sc.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filteredAll.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No jobs match this filter.</p>
            ) : (
              filteredAll
                .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.scheduledTime.localeCompare(b.scheduledTime))
                .map((job) => <JobCard key={job.id} job={job} />)
            )}
          </div>
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && cleaner && (
        <CleanerProfile cleaner={cleaner} jobs={allJobs} />
      )}
    </div>
  );
}
