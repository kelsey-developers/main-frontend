'use client';

import React from 'react';
import Link from 'next/link';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';

interface Props {
  job: CleaningJob;
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

export default function JobCard({ job }: Props) {
  const sc = JOB_STATUS_CONFIG[job.status];
  const tc = JOB_TYPE_CONFIG[job.jobType];

  const checkedCount = job.checklistItems?.filter((c) => c.isChecked).length ?? 0;
  const totalCount = job.checklistItems?.length ?? 0;
  const checklistPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const canStart = job.status === 'scheduled';
  const inProgress = job.status === 'in_progress';

  return (
    <Link
      href={`/cleaning/${job.id}`}
      className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0B5858]/20 transition-all"
    >
      {/* Top: job type badge + status */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tc.bgColor} ${tc.color}`}>
              {tc.label}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.classes}`}>
              <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-snug">
            {job.propertyName}
            {job.unitName && <span className="text-gray-500 font-normal"> · {job.unitName}</span>}
          </h3>
        </div>
      </div>

      {/* Time + duration */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-gray-700">{fmtTime(job.scheduledTime)}</span>
          <span>· Est. {durationLabel(job.estimatedDuration)}</span>
        </div>
        {job.assignedCleanerName && (
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#6366F1]/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-[#6366F1]">
                {job.assignedCleanerName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            </div>
            <span className="text-gray-500 text-[11px]">{job.assignedCleanerName.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {/* Admin notes snippet */}
      {job.notes && (
        <div className="mx-4 mb-3 bg-[#0B5858]/5 rounded-lg px-3 py-2 border border-[#0B5858]/10">
          <p className="text-[10px] font-bold text-[#0B5858] mb-0.5">Admin Notes</p>
          <p className="text-xs text-gray-600 leading-snug line-clamp-2">{job.notes}</p>
        </div>
      )}

      {/* Checklist progress (only for in-progress) */}
      {inProgress && totalCount > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
            <span>Checklist progress</span>
            <span className="font-bold text-gray-700">{checkedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0B5858] rounded-full transition-all" style={{ width: `${checklistPct}%` }} />
          </div>
        </div>
      )}

      {/* CTA footer */}
      <div className={`flex items-center justify-end px-4 py-3 border-t border-gray-50 rounded-b-2xl ${job.jobType === 'emergency' ? 'bg-red-50' : ''}`}>
        {canStart && (
          <span className="text-xs font-bold text-[#0B5858] flex items-center gap-1">
            Start Job
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
        {inProgress && (
          <span className="text-xs font-bold text-[#FACC15] flex items-center gap-1">
            Mark Done
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
        {(job.status === 'completed' || job.status === 'verified') && (
          <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
            View Details
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </Link>
  );
}
