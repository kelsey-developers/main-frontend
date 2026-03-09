'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { CleaningTask } from './types';
import { mockCleaningTasksToday } from './lib/mockData';

function HousekeepingDashboardSkeleton() {
  return (
    <div style={{ fontFamily: 'Poppins' }} className="animate-pulse">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-9 w-72 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="mb-4">
        <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="h-12 bg-gray-200" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3">
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

const TASK_TYPE_LABELS: Record<CleaningTask['taskType'], string> = {
  turnover: 'Turnover',
  inspection: 'Inspection',
  deep_clean: 'Deep clean',
  restock: 'Restock',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format 24h time (e.g. "14:00") as 12h with AM/PM (e.g. "2:00 PM") */
function formatTime12h(timeStr: string | undefined): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const hour = typeof h === 'number' && !Number.isNaN(h) ? h % 24 : 0;
  const min = typeof m === 'number' && !Number.isNaN(m) ? m : 0;
  const date = new Date(2000, 0, 1, hour, min);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Parse "HH:mm" to minutes since midnight for sorting; missing time = end of day (last) */
function parseTimeToMinutes(timeStr: string | undefined): number {
  if (!timeStr) return 24 * 60;
  const [h, m] = timeStr.split(':').map(Number);
  const hour = typeof h === 'number' && !Number.isNaN(h) ? h % 24 : 0;
  const min = typeof m === 'number' && !Number.isNaN(m) ? m : 0;
  return hour * 60 + min;
}

type TableFilter = 'all' | 'completed';

export default function HousekeepingDashboardPage() {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTasks(mockCleaningTasksToday);
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const totalCount = tasks.length;
  const doneCount = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const pendingCount = totalCount - doneCount;

  const markAsDone = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
  };

  const markAsPending = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: false } : t)));
  };

  const pendingTasks = useMemo(
    () =>
      [...tasks.filter((t) => !t.done)].sort(
        (a, b) => parseTimeToMinutes(a.dueBy) - parseTimeToMinutes(b.dueBy)
      ),
    [tasks]
  );
  const completedTasks = useMemo(
    () =>
      [...tasks.filter((t) => t.done)].sort(
        (a, b) => parseTimeToMinutes(a.dueBy) - parseTimeToMinutes(b.dueBy)
      ),
    [tasks]
  );
  const todayLabel = tasks[0] ? formatDate(tasks[0].date) : formatDate(new Date().toISOString().slice(0, 10));

  if (isLoading) {
    return <HousekeepingDashboardSkeleton />;
  }

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Housekeeping Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Your cleaning schedule for today, mark units as done when finished.
          </p>
        </div>
        <Link
          href="/housekeeping/report"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[#0B5858] hover:bg-[#0a4a4a] transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Report
        </Link>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="relative bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] rounded-xl shadow-lg p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Units today</p>
                <p className="text-2xl font-bold text-white">{totalCount}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative bg-amber-500 rounded-xl shadow-lg p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/90 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative bg-gray-600 rounded-xl shadow-lg p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-white">{doneCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Units to clean - date heading */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Units table</h2>
          <p className="text-sm text-gray-600">As of {todayLabel}</p>
        </div>
        {/* Filter switch: All | Completed */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setTableFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tableFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTableFilter('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tableFilter === 'completed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Table / list of units */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] rounded-t-xl">
              <tr>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-center text-white text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                  Due by
                </th>
                <th className="px-4 py-3 text-right text-xs text-center font-semibold text-white uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tableFilter === 'all' && pendingTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {task.bookingId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm text-gray-900">{task.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                    {task.unitType ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                    {task.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                    {formatTime12h(task.dueBy)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => markAsDone(task.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[#0B5858] text-[#0B5858] hover:bg-[#0B5858] hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark as done
                    </button>
                  </td>
                </tr>
              ))}
              {(tableFilter === 'all' || tableFilter === 'completed') && completedTasks.map((task) => (
                <tr key={task.id} className="bg-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {task.bookingId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-500">{task.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                    {task.unitType ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                    {task.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-200 text-gray-600">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                    {formatTime12h(task.dueBy)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0B5858]/10 text-[#0B5858]">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                    <button
                      type="button"
                      onClick={() => markAsPending(task.id)}
                      className="ml-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Undo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {((tableFilter === 'all' && tasks.length === 0) || (tableFilter === 'completed' && completedTasks.length === 0)) && (
          <div className="px-4 py-12 text-center text-gray-500">
            <p>
              {tableFilter === 'completed'
                ? 'No completed units yet.'
                : 'No cleaning tasks scheduled for today.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
