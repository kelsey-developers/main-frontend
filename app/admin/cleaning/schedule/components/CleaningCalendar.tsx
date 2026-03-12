'use client';

import React, { useMemo, useState } from 'react';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';

interface Props {
  jobs: CleaningJob[];
  currentMonth: Date;
  onDayClick: (date: string, jobs: CleaningJob[]) => void;
  onAddJob: (date: string) => void;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CleaningCalendar({ jobs, currentMonth, onDayClick, onAddJob }: Props) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Build calendar grid
  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { days: daysInMonth, startOffset: firstDay };
  }, [year, month]);

  // Group jobs by date string
  const jobsByDate = useMemo(() => {
    const map = new Map<string, CleaningJob[]>();
    for (const job of jobs) {
      const key = job.scheduledDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return map;
  }, [jobs]);

  const today = new Date().toISOString().split('T')[0];

  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }),
  ];

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* DOW header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DOW.map((d) => (
          <div key={d} className="py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-gray-50 last:border-r-0" />;
          }
          const dayJobs = jobsByDate.get(date) ?? [];
          const isToday = date === today;
          const isPast = date < today;

          // Get up to 3 job status dots to show
          const displayJobs = dayJobs.slice(0, 3);
          const overflow = dayJobs.length - 3;

          return (
            <div
              key={date}
              className={`min-h-[80px] border-b border-r border-gray-50 last:border-r-0 p-1.5 cursor-pointer transition-colors group relative ${isToday ? 'bg-[#0B5858]/5' : 'hover:bg-gray-50/80'}`}
              onClick={() => dayJobs.length > 0 ? onDayClick(date, dayJobs) : undefined}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#0B5858] text-white' : isPast ? 'text-gray-300' : 'text-gray-700'}`}>
                  {parseInt(date.split('-')[2])}
                </span>
                {/* Add job button on hover */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddJob(date); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-[#0B5858] hover:bg-[#094848] text-white flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Job pills */}
              <div className="space-y-0.5">
                {displayJobs.map((job) => {
                  const sc = JOB_STATUS_CONFIG[job.status];
                  const tc = JOB_TYPE_CONFIG[job.jobType];
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate"
                      style={{ backgroundColor: `${sc.bg}20`, color: sc.bg }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: sc.bg }} />
                      <span className="truncate">{job.propertyName}{job.unitName ? ` · ${job.unitName}` : ''}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <p className="text-[9px] text-gray-400 font-medium pl-1">+{overflow} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
