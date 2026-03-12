'use client';

import React from 'react';
import Link from 'next/link';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob } from '@/types/cleaning';

interface Props {
  job: CleaningJob;
}

/** Format HH:MM to "11:00 AM" */
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Schedule range: departure (scheduledTime) to due-by (dueByTime or start + estimatedDuration) */
function scheduleRange(job: CleaningJob): string {
  const [h, m] = job.scheduledTime.split(':').map(Number);
  const start = fmtTime(job.scheduledTime);
  if (job.dueByTime) {
    const end = fmtTime(job.dueByTime);
    return `${start} – ${end}`;
  }
  const endMins = h * 60 + m + (job.estimatedDuration ?? 0);
  const eh = Math.floor(endMins / 60) % 24;
  const em = endMins % 60;
  const end = fmtTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
  return `${start} – ${end}`;
}

/**
 * Property-management Job Card — flex column + mt-auto on action so buttons share a baseline across the row.
 * - Content block flex-1; action area mt-auto shrink-0 for consistent bottom alignment in grid.
 */
export default function JobCard({ job }: Props) {
  const sc = JOB_STATUS_CONFIG[job.status];
  const tc = JOB_TYPE_CONFIG[job.jobType];

  const checkedCount = job.checklistItems?.filter((c) => c.isChecked).length ?? 0;
  const totalCount = job.checklistItems?.length ?? 0;
  const checklistPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const canStart = job.status === 'scheduled';
  const inProgress = job.status === 'in_progress';
  const isCompleted = job.status === 'completed' || job.status === 'verified';
  const ctaLabel = canStart ? 'Start Job' : inProgress ? 'Mark Done' : 'View Job';
  const ctaAccent = inProgress;
  const isEmergency = job.jobType === 'emergency';
  const hasNotes = Boolean(job.notes?.trim());
  const showChecklist = inProgress && totalCount > 0;
  const checklistComplete = totalCount > 0 && checkedCount >= totalCount;
  /** Top bar: full (100%) when completed; otherwise in-progress checklist % or 0 */
  const progressPct = isCompleted ? 100 : showChecklist ? checklistPct : 0;
  const showProgressBar = isCompleted || showChecklist;

  return (
    <Link
      href={`/cleaning/${job.id}`}
      className="flex flex-col h-full min-h-[220px] sm:min-h-[260px] w-full min-w-0 bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 active:scale-[0.99] hover:shadow-md hover:border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5858]/30 focus-visible:ring-offset-2"
      style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
    >
      {/* Full-bleed progress: 3px; fully filled when completed, checklist % when in progress, 0 when scheduled */}
      <div
        className="h-[3px] w-full min-w-0 shrink-0 bg-gray-200 rounded-none"
        role="progressbar"
        aria-hidden={!showProgressBar}
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-[#0B5858] transition-all duration-300 rounded-r-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Content block: flex-1 so it fills space; action area will sit at bottom via mt-auto */}
      <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-4 lg:p-5">
        {/* Status pills only (no data in pills) */}
        <div className="flex items-center gap-2 mb-2 flex-wrap shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={tc.chipStyle}>
            {tc.label}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={sc.chipStyle}>
            {sc.label}
          </span>
        </div>

        {/* Job Identity block: 4px between Property, Unit, Time — one cohesive block */}
        <div className="flex flex-col gap-1 shrink-0 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight tracking-tight break-words">
            {job.propertyName}
          </h2>
          {job.unitName && (
            <p className="text-sm font-normal text-gray-500 leading-snug break-words">
              {job.unitName}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0 flex-wrap">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{scheduleRange(job)}</span>
          </div>
        </div>

        {/* Section break: 20px mobile, 24px sm+; Admin Notes — left accent; min-height for alignment */}
        <div className="mt-5 sm:mt-6 pl-3 border-l-[3px] border-[#0B5858]/30 shrink-0 min-h-[44px] sm:min-h-[48px] flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Admin Notes</p>
          {hasNotes ? (
            <p className="text-xs text-gray-700 leading-snug line-clamp-2">{job.notes}</p>
          ) : (
            <p className="text-xs text-gray-300 italic">No notes provided</p>
          )}
        </div>
      </div>

      {/* Action area: mt-auto forces same baseline across row; 48px min-height for touch target */}
      <div className="mt-auto shrink-0 p-4 sm:p-4 lg:p-5 pt-5 sm:pt-6">
        {showChecklist && (
          <p className="text-xs font-normal text-gray-500 mb-2">
            {checkedCount}/{totalCount} completed
          </p>
        )}
        <span
          className={`
            flex items-center justify-center gap-2 w-full min-h-[48px] py-3.5 px-4 rounded-xl text-sm font-semibold touch-manipulation
            transition-all select-none
            ${ctaAccent ? 'bg-[#FACC15] active:bg-[#eab308] text-gray-900' : 'bg-[#0B5858] active:bg-[#094848] text-white'}
            ${isEmergency ? 'ring-2 ring-red-200 ring-offset-2 ring-offset-white' : checklistComplete && inProgress ? 'ring-2 ring-[#0B5858]/40 ring-offset-2 ring-offset-white' : ''}
          `}
        >
          {canStart && (
            <>
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              {ctaLabel}
            </>
          )}
          {inProgress && (
            <>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {ctaLabel}
            </>
          )}
          {(job.status === 'completed' || job.status === 'verified') && ctaLabel}
        </span>
      </div>
    </Link>
  );
}
