'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { User, Clock, Key } from 'lucide-react';
import { getCleaningJobById, startJob, completeJob } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob, CleaningChecklistItem } from '@/types/cleaning';
import ChecklistPanel from './components/ChecklistPanel';
import CompletionModal from './components/CompletionModal';

/** Green icon style for logistics row (brand teal) */
const LOGISTICS_ICON_CLASS = 'w-4 h-4 text-[#0B5858] shrink-0';

interface Props {
  params: Promise<{ jobId: string }>;
}

export default function CleaningJobDetailPage({ params }: Props) {
  const { jobId } = use(params);
  const [job, setJob] = useState<CleaningJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [entryCodeVisible, setEntryCodeVisible] = useState(false);
  const [progressPulse, setProgressPulse] = useState(false);
  const prevCheckedCountRef = useRef<number>(0);

  useEffect(() => {
    getCleaningJobById(jobId).then((j) => {
      setJob(j);
      setLoading(false);
    });
  }, [jobId]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStart = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await startJob(job.id);
      setJob((j) => j ? { ...j, status: 'in_progress' } : j);
      showToastMsg('Job started! Check off items as you go.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItem = useCallback((itemId: string) => {
    setJob((prev) => {
      if (!prev) return prev;
      const now = new Date().toISOString();
      return {
        ...prev,
        checklistItems: prev.checklistItems?.map((item) =>
          item.id === itemId
            ? { ...item, isChecked: !item.isChecked, checkedAt: !item.isChecked ? now : undefined }
            : item
        ),
      };
    });
  }, []);

  /** Derived before any early return so hook order is stable; safe when job is null */
  const checkedCount = job?.checklistItems?.filter((i) => i.isChecked).length ?? 0;
  const totalCount = job?.checklistItems?.length ?? 0;
  const checklistComplete = totalCount > 0 && checkedCount >= totalCount;

  /** Trigger pulse on progress bar when completion count increases */
  useEffect(() => {
    if (checkedCount > prevCheckedCountRef.current && totalCount > 0) {
      setProgressPulse(true);
      prevCheckedCountRef.current = checkedCount;
      const t = setTimeout(() => setProgressPulse(false), 700);
      return () => clearTimeout(t);
    }
    prevCheckedCountRef.current = checkedCount;
  }, [checkedCount, totalCount]);

  const handleComplete = async (notes: string, photoUrls: string[]) => {
    if (!job) return;
    await completeJob(job.id, {
      completionNotes: notes,
      photoUrls,
      checklistItems: job.checklistItems ?? [],
    });
    setJob((j) => j ? { ...j, status: 'completed', completionNotes: notes, photoUrls } : j);
    setShowCompletion(false);
    showToastMsg('Job marked as complete! Admin will verify shortly.');
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" aria-label="Loading" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-gray-500" style={{ fontFamily: 'Poppins' }}>Job not found.</p>
        <Link href="/cleaning" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B5858] hover:underline" style={{ fontFamily: 'Poppins' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Jobs
        </Link>
      </div>
    );
  }

  const sc = JOB_STATUS_CONFIG[job.status];
  const tc = JOB_TYPE_CONFIG[job.jobType];

  /** Schedule window: departure (scheduledTime) to due-by (dueByTime or start + estimatedDuration) */
  const scheduleWindow = (() => {
    const [h, m] = job.scheduledTime.split(':').map(Number);
    const start = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    if (job.dueByTime) {
      const [eh, em] = job.dueByTime.split(':').map(Number);
      const end = `${eh % 12 || 12}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`;
      return `${start} – ${end}`;
    }
    const endMins = h * 60 + m + (job.estimatedDuration ?? 0);
    const eh = Math.floor(endMins / 60) % 24;
    const em = endMins % 60;
    const end = `${eh % 12 || 12}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`;
    return `${start} – ${end}`;
  })();

  const guestLabel = job.guestName && job.guestCount != null
    ? `${job.guestName} • ${job.guestCount} Guest${job.guestCount !== 1 ? 's' : ''}`
    : '—';
  const entryCodeValue = job.entryCode ?? '—';
  const displayEntryCode = entryCodeVisible ? entryCodeValue : (entryCodeValue !== '—' ? '••••' : '—');

  const canStart = job.status === 'scheduled';
  const canComplete = job.status === 'in_progress';
  const isDone = job.status === 'completed' || job.status === 'verified';

  /** No stacking context on container. Responsive safe-area padding so sticky footer never occludes checklist (pb-32 → sm:pb-40 → lg:pb-48). */
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-32 sm:pb-40 lg:pb-48 space-y-6 sm:space-y-8 overflow-visible">
      {/* Toast — white bg after submit completion (no green) */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold bg-white text-gray-900 border border-gray-200 animate-fade-in-up max-w-sm text-center" style={{ fontFamily: 'Poppins' }}>
          <svg className="w-4 h-4 shrink-0 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Back - design system link with icon */}
      <Link href="/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors" style={{ fontFamily: 'Poppins' }}>
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        My Jobs
      </Link>

      {/* Logistics card: one padded block (p-4 sm:p-5); chips, title, grid, then Admin Notes with left accent */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Poppins', ...tc.chipStyle }}>
              {tc.label}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Poppins', ...sc.chipStyle }}>
              {sc.label}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{job.propertyName}</h1>
          {job.unitName && <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{job.unitName}</p>}

          {/* 3-column grid: green icons (Lucide) + text */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-center">
            <div className="flex items-center gap-2 min-w-0">
              <User className={LOGISTICS_ICON_CLASS} aria-hidden />
              <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: 'Poppins', fontSize: '14px' }}>{guestLabel}</p>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Clock className={LOGISTICS_ICON_CLASS} aria-hidden />
              <p className="text-sm font-bold text-gray-900 truncate" style={{ fontFamily: 'Poppins', fontSize: '14px' }}>{scheduleWindow}</p>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Key className={LOGISTICS_ICON_CLASS} aria-hidden />
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-bold text-[#0B5858] truncate tabular-nums" style={{ fontFamily: 'Poppins', fontSize: '14px' }}>{displayEntryCode}</p>
                {entryCodeValue !== '—' && (
                  <button
                    type="button"
                    onClick={() => setEntryCodeVisible((v) => !v)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 shrink-0"
                    aria-label={entryCodeVisible ? 'Hide entry code' : 'Show entry code'}
                  >
                    {entryCodeVisible ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Admin Notes: green left accent; same padding flow as above (no extra box padding) */}
          <div className="mt-6 pl-3 border-l-[3px] border-[#0B5858]/30 min-h-[44px] flex flex-col justify-center">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'Poppins' }}>Admin Notes</p>
            {job.notes?.trim() ? (
              <p className="text-xs text-gray-700 leading-snug" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{job.notes}</p>
            ) : (
              <p className="text-xs text-gray-300 italic" style={{ fontFamily: 'Poppins' }}>No notes provided</p>
            )}
          </div>
        </div>
      </div>

      {/* Completed job: single white card for notes + photos; typography matches design system */}
      {isDone && (job.completionNotes || (job.photoUrls && job.photoUrls.length > 0)) && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 space-y-5">
            {job.completionNotes && (
              <div>
                <p className="text-base font-bold text-gray-900 mb-1.5" style={{ fontFamily: 'Poppins' }}>Completion notes</p>
                <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{job.completionNotes}</p>
              </div>
            )}
            {job.photoUrls && job.photoUrls.length > 0 && (
              <div className={job.completionNotes ? 'pt-1' : ''}>
                <p className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>Completion photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {job.photoUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky progress card: solid teal with subtle frost (gradient sheen + glass edge); not transparent */}
      {job.checklistItems && job.checklistItems.length > 0 && (
        <div
          className="sticky top-20 z-30 isolate w-full min-w-0 p-3 sm:p-4 lg:p-5 rounded-2xl border border-white/10 overflow-visible"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 35%, transparent 60%), #0B5858',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:gap-y-2 mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-bold text-white min-w-0" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Cleaning Checklist</h2>
            <span key={`${checkedCount}-${totalCount}`} className="text-[11px] sm:text-xs text-white/80 shrink-0 tabular-nums animate-fade-in-up" style={{ fontFamily: 'Poppins' }}>{checkedCount} of {totalCount} completed</span>
          </div>
          {/* Progress bar: gliding width; pulse/glow when count increases */}
          <div className="w-full min-h-[6px] h-2 sm:h-1.5 rounded-full overflow-hidden bg-white/20">
            <div
              className={`h-full rounded-full bg-[#FACC15] min-w-0 ${progressPulse ? 'animate-progress-pulse' : ''}`}
              style={{
                width: totalCount ? `${Math.round((checkedCount / totalCount) * 100)}%` : '0%',
                transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'inset 0 0 12px rgba(250, 204, 21, 0.4)',
              }}
            />
          </div>
        </div>
      )}

      {/* Checklist cards: separate block so progress card’s sticky parent is page root */}
      {job.checklistItems && job.checklistItems.length > 0 && (
        <div className="relative z-10 pb-8">
          <ChecklistPanel
            items={job.checklistItems}
            editable={canComplete}
            onToggle={handleToggleItem}
            hideProgress
            totalCount={totalCount}
            checkedCount={checkedCount}
          />
        </div>
      )}

      {/* Sticky footer: z-40; strong top-facing shadow so it’s clearly visible above the bar */}
      {(canStart || canComplete) && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40"
          style={{
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div className="max-w-3xl mx-auto">
            {canStart && (
              <button
                type="button"
                onClick={handleStart}
                disabled={actionLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              >
                {actionLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" aria-hidden />
                ) : (
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                {actionLoading ? 'Starting…' : 'Start Job'}
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                onClick={() => checklistComplete && setShowCompletion(true)}
                disabled={!checklistComplete}
                className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-500 ease-in-out ${
                  checklistComplete
                    ? 'text-gray-900 bg-[#FACC15] hover:bg-[#eab308] cursor-pointer shadow-sm'
                    : 'text-gray-500 bg-gray-200 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark as Done
              </button>
            )}
          </div>
        </div>
      )}

      {showCompletion && (
        <CompletionModal
          checkedCount={checkedCount}
          totalCount={totalCount}
          checklistItems={job.checklistItems ?? []}
          onClose={() => setShowCompletion(false)}
          onSubmit={handleComplete}
        />
      )}
    </div>
  );
}
