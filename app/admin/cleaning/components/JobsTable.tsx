'use client';

import React from 'react';
import Link from 'next/link';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';

interface Props {
  jobs: CleaningJob[];
  onVerify: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onAssign: (job: CleaningJob) => void;
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function durationLabel(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function JobsTable({ jobs, onVerify, onCancel, onAssign }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#0B5858]/5 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-[#0B5858]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-600 mb-1" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>No jobs found</p>
        <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>Try adjusting your filters or schedule a new job.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['Property / Unit', 'Type', 'Scheduled', 'Cleaner', 'Duration', 'Status', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap first:pl-5 last:pr-5" style={{ fontFamily: 'Poppins' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {jobs.map((job) => {
            const sc = JOB_STATUS_CONFIG[job.status];
            const tc = JOB_TYPE_CONFIG[job.jobType];
            const canVerify = job.status === 'completed';
            const canCancel = job.status === 'scheduled' || job.status === 'in_progress';
            const canAssign = job.status === 'scheduled';

            return (
              <tr key={job.id} className={`hover:bg-gray-50/50 transition-colors ${job.status === 'cancelled' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 pl-5">
                  <p className="font-bold text-gray-900 text-sm">{job.propertyName}</p>
                  {job.unitName && <p className="text-xs text-gray-400">{job.unitName}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap chip-shadow" style={tc.chipStyle}>
                    {tc.label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-700">{fmtDate(job.scheduledDate)}</p>
                  <p className="text-xs text-gray-400">{fmtTime(job.scheduledTime)}</p>
                </td>
                <td className="px-4 py-3">
                  {job.assignedCleanerName ? (
                    <p className="text-sm text-gray-700 whitespace-nowrap">{job.assignedCleanerName.split(' ')[0]}</p>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {durationLabel(job.estimatedDuration)}
                  {job.actualDuration && (
                    <p className="text-[11px] text-gray-400">Actual: {durationLabel(job.actualDuration)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap chip-shadow" style={sc.chipStyle}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </td>
                <td className="px-4 py-3 pr-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/cleaning/${job.id}`}
                      className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View
                    </Link>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => onAssign(job)}
                        className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-[#0B5858] bg-[#0B5858]/10 hover:bg-[#0B5858]/15 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Assign
                      </button>
                    )}
                    {canVerify && (
                      <button
                        type="button"
                        onClick={() => onVerify(job.id)}
                        className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Verify
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(job.id)}
                        className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
