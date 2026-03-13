'use client';

import React from 'react';
import Link from 'next/link';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';

interface Props {
  jobs: CleaningJob[];
  filteredCount: number;
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

const COLUMNS = ['Property / Unit', 'Type', 'Scheduled', 'Cleaner', 'Duration', 'Status', 'Actions'];

export default function JobsTable({ jobs, filteredCount, onVerify, onCancel, onAssign }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {COLUMNS.map((h) => (
            <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {filteredCount === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
              No jobs match your filters.
            </td>
          </tr>
        ) : (
          jobs.map((job) => {
            const sc = JOB_STATUS_CONFIG[job.status];
            const tc = JOB_TYPE_CONFIG[job.jobType];
            const canVerify = job.status === 'completed';
            const canCancel = job.status === 'scheduled' || job.status === 'in_progress';
            const canAssign = job.status === 'scheduled';

            return (
              <tr key={job.id} className={`hover:bg-gray-50/80 transition-colors ${job.status === 'cancelled' ? 'opacity-50' : ''}`}>
                <td className="px-5 py-4">
                  <p className="font-bold text-gray-900">{job.propertyName}</p>
                  {job.unitName && <p className="text-xs text-gray-500 mt-0.5">{job.unitName}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap" style={tc.chipStyle}>
                    {tc.label}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <p className="font-medium text-gray-900">{fmtDate(job.scheduledDate)}</p>
                  <p className="text-xs text-gray-500">{fmtTime(job.scheduledTime)}</p>
                </td>
                <td className="px-5 py-4">
                  {job.assignedCleanerName ? (
                    <p className="text-gray-600 whitespace-nowrap">{job.assignedCleanerName.split(' ')[0]}</p>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                  {durationLabel(job.estimatedDuration)}
                  {job.actualDuration && (
                    <p className="text-[11px] text-gray-400">Actual: {durationLabel(job.actualDuration)}</p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap" style={sc.chipStyle}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                    {sc.label}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 flex-nowrap">
                    <Link
                      href={`/cleaning/${job.id}`}
                      className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View
                    </Link>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => onAssign(job)}
                        className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Assign
                      </button>
                    )}
                    {canVerify && (
                      <button
                        type="button"
                        onClick={() => onVerify(job.id)}
                        className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Verify
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(job.id)}
                        className="inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
