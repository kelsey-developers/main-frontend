'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCleaningJobs } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';
import CleaningCalendar from './components/CleaningCalendar';
import ScheduleJobModal from '../components/ScheduleJobModal';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function CleaningSchedulePage() {
  const [jobs, setJobs] = useState<CleaningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayJobs, setSelectedDayJobs] = useState<CleaningJob[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    getCleaningJobs().then((j) => {
      setJobs(j);
      setLoading(false);
    });
  }, []);

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const handleDayClick = (date: string, dayJobs: CleaningJob[]) => {
    setSelectedDate(date);
    setSelectedDayJobs(dayJobs);
  };

  const handleAddJob = (date: string) => {
    setScheduleDate(date);
    setShowSchedule(true);
  };

  const handleJobCreated = (job: CleaningJob) => {
    setJobs((prev) => [job, ...prev]);
    setShowSchedule(false);
    if (selectedDate && job.scheduledDate === selectedDate) {
      setSelectedDayJobs((prev) => [job, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  // Filter jobs for current month display
  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthJobs = jobs.filter((j) => j.scheduledDate.startsWith(monthStr));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors mb-1" style={{ fontFamily: 'Poppins' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cleaning Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Cleaning Calendar</h1>
        </div>
        <button
          type="button"
          onClick={() => { setScheduleDate(''); setShowSchedule(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d9488] transition-colors cursor-pointer shadow-sm shrink-0"
          style={{ fontFamily: 'Poppins', fontWeight: 600 }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Job
        </button>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Calendar main */}
        <div className="flex-1 space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-base font-bold text-gray-900">
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              <span className="ml-2 text-sm font-normal text-gray-400">({monthJobs.length} jobs)</span>
            </h2>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {(['scheduled', 'in_progress', 'completed', 'verified', 'cancelled'] as const).map((s) => {
              const sc = JOB_STATUS_CONFIG[s];
              return (
                <span key={s} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium chip-shadow" style={sc.chipStyle}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
              );
            })}
          </div>

          <CleaningCalendar
            jobs={monthJobs}
            currentMonth={currentMonth}
            onDayClick={handleDayClick}
            onAddJob={handleAddJob}
          />
        </div>

        {/* Day detail panel */}
        <div className="lg:w-72 shrink-0">
          {selectedDate && selectedDayJobs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <button type="button" onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedDayJobs
                  .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                  .map((job) => {
                    const sc = JOB_STATUS_CONFIG[job.status];
                    const tc = JOB_TYPE_CONFIG[job.jobType];
                    return (
                      <Link
                        key={job.id}
                        href={`/cleaning/${job.id}`}
                        className="block bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-[#0B5858]/20 hover:bg-[#0B5858]/3 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium chip-shadow" style={tc.chipStyle}>{tc.label}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium chip-shadow" style={sc.chipStyle}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">{job.propertyName}{job.unitName ? ` · ${job.unitName}` : ''}</p>
                        <p className="text-[11px] text-gray-500">{fmtTime(job.scheduledTime)} · {job.assignedCleanerName?.split(' ')[0] ?? 'Unassigned'}</p>
                      </Link>
                    );
                  })}
              </div>
              <button
                type="button"
                onClick={() => handleAddJob(selectedDate)}
                className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-[#0B5858] border border-[#0B5858]/20 bg-[#0B5858]/5 hover:bg-[#0B5858]/10 transition-colors cursor-pointer"
              >
                + Add Job for this Day
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center sticky top-24">
              <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-gray-400">Click on a day to see its jobs</p>
            </div>
          )}
        </div>
      </div>

      {showSchedule && (
        <ScheduleJobModal
          prefillDate={scheduleDate || undefined}
          onClose={() => setShowSchedule(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
}
