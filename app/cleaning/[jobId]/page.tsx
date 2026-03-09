'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { getCleaningJobById, startJob, completeJob } from '@/services/cleaningService';
import { JOB_STATUS_CONFIG, JOB_TYPE_CONFIG } from '@/types/cleaning';
import type { CleaningJob, CleaningChecklistItem } from '@/types/cleaning';
import ChecklistPanel from './components/ChecklistPanel';
import CompletionModal from './components/CompletionModal';

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Job not found.</p>
        <Link href="/cleaning" className="mt-4 inline-block text-sm font-semibold text-[#0B5858] hover:underline">← Back to My Jobs</Link>
      </div>
    );
  }

  const sc = JOB_STATUS_CONFIG[job.status];
  const tc = JOB_TYPE_CONFIG[job.jobType];
  const checkedCount = job.checklistItems?.filter((i) => i.isChecked).length ?? 0;
  const totalCount = job.checklistItems?.length ?? 0;

  const scheduledDT = new Date(`${job.scheduledDate}T${job.scheduledTime}`);
  const timeLabel = scheduledDT.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateLabel = scheduledDT.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

  const canStart = job.status === 'scheduled';
  const canComplete = job.status === 'in_progress';
  const isDone = job.status === 'completed' || job.status === 'verified';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-28">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold bg-[#0B5858] text-white border border-[#0B5858] animate-fade-in-up max-w-sm text-center">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Back */}
      <Link href="/cleaning" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0B5858] transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        My Jobs
      </Link>

      {/* Job header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${tc.bgColor} ${tc.color}`}>
            {tc.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.classes}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Property + unit */}
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">{job.propertyName}</h1>
        {job.unitName && <p className="text-sm text-gray-500 mb-4">{job.unitName}</p>}

        {/* Time + duration */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
            <p className="text-sm font-bold text-gray-900">{dateLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Time</p>
            <p className="text-sm font-bold text-gray-900">{timeLabel}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Est. Duration</p>
            <p className="text-sm font-bold text-gray-900">
              {job.estimatedDuration < 60 ? `${job.estimatedDuration}m` : `${Math.floor(job.estimatedDuration / 60)}h${job.estimatedDuration % 60 > 0 ? ` ${job.estimatedDuration % 60}m` : ''}`}
            </p>
          </div>
        </div>

        {/* Actual duration (if completed) */}
        {job.actualDuration && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Actual Duration</p>
            <p className="text-sm font-bold text-[#0B5858]">
              {job.actualDuration < 60 ? `${job.actualDuration}m` : `${Math.floor(job.actualDuration / 60)}h${job.actualDuration % 60 > 0 ? ` ${job.actualDuration % 60}m` : ''}`}
            </p>
          </div>
        )}
      </div>

      {/* Admin instructions */}
      {job.notes && (
        <div className="bg-[#0B5858]/5 rounded-xl p-4 border border-[#0B5858]/10">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-4 h-4 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-bold text-[#0B5858] uppercase tracking-wide">Admin Instructions</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{job.notes}</p>
        </div>
      )}

      {/* Completion notes (after done) */}
      {isDone && job.completionNotes && (
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Your Completion Notes</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{job.completionNotes}</p>
        </div>
      )}

      {/* Completion photos */}
      {isDone && job.photoUrls && job.photoUrls.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Completion Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {job.photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      {job.checklistItems && job.checklistItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cleaning Checklist</p>
          <ChecklistPanel
            items={job.checklistItems}
            editable={canComplete}
            onToggle={handleToggleItem}
          />
        </div>
      )}

      {/* Sticky action bar */}
      {(canStart || canComplete) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 shadow-lg z-40">
          <div className="max-w-lg mx-auto">
            {canStart && (
              <button
                type="button"
                onClick={handleStart}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d7a7a] transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-[#0B5858]/20"
              >
                {actionLoading ? 'Starting…' : '▶ Start Job'}
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                onClick={() => setShowCompletion(true)}
                className="w-full py-4 rounded-2xl text-sm font-bold text-[#0B5858] bg-[#FACC15] hover:bg-[#eab308] transition-colors cursor-pointer shadow-md shadow-[#FACC15]/30"
              >
                ✓ Mark as Done
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
