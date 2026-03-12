'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CleaningChecklistItem } from '@/types/cleaning';

interface Props {
  checkedCount: number;
  totalCount: number;
  checklistItems: CleaningChecklistItem[];
  onClose: () => void;
  onSubmit: (notes: string, photoUrls: string[]) => Promise<void>;
}

const MOCK_PHOTO_PLACEHOLDERS = [
  'https://placehold.co/400x300?text=Photo+1',
  'https://placehold.co/400x300?text=Photo+2',
  'https://placehold.co/400x300?text=Photo+3',
];

export default function CompletionModal({ checkedCount, totalCount, checklistItems, onClose, onSubmit }: Props) {
  const [notes, setNotes] = useState('');
  const [photoSlots, setPhotoSlots] = useState<(string | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const uncheckedCount = totalCount - checkedCount;

  const handlePhotoAdd = (idx: number) => {
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[idx] = MOCK_PHOTO_PLACEHOLDERS[idx];
      return next;
    });
  };

  const handlePhotoRemove = (idx: number) => {
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) { setError('Please add completion notes before submitting.'); return; }
    setSubmitting(true);
    const photoUrls = photoSlots.filter(Boolean) as string[];
    try {
      await onSubmit(notes, photoUrls);
    } catch {
      setError('Failed to submit. Please try again.');
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — plain white to match design system */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>Mark Job as Done</h2>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>Add your completion notes and photo proof</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer shrink-0" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">

          {/* Checklist card — same as job detail: teal bg, white text, yellow progress bar */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#0B5858] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Poppins' }}>
                Checklist: {checkedCount}/{totalCount} complete
              </p>
              <span className="text-xs text-white/80 tabular-nums shrink-0" style={{ fontFamily: 'Poppins' }}>{pct}%</span>
            </div>
            <div className="w-full h-2 sm:h-1.5 rounded-full overflow-hidden bg-white/20">
              <div className="h-full rounded-full bg-[#FACC15] transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, boxShadow: 'inset 0 0 12px rgba(250, 204, 21, 0.4)' }} />
            </div>
            {uncheckedCount > 0 && (
              <p className="text-[11px] text-white/70 mt-2" style={{ fontFamily: 'Poppins' }}>{uncheckedCount} item{uncheckedCount > 1 ? 's' : ''} unchecked — note any issues in your completion notes.</p>
            )}
          </div>

          {/* Completion notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors resize-none ${error ? 'border-red-300' : 'border-gray-200'}`}
              placeholder="Describe what was done, any issues found, things to report to admin…"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setError(''); }}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Photo proof slots (mock — no real upload in Phase 1) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Proof <span className="text-gray-400 font-normal">(optional — up to 3)</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {photoSlots.map((slot, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border-2 border-dashed border-gray-200 relative">
                  {slot ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slot} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center cursor-pointer"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePhotoAdd(idx)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#0B5858] hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-colors cursor-pointer"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] font-medium">Add</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Photo upload is simulated in preview mode.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer" style={{ fontFamily: 'Poppins' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#0d9488] transition-colors cursor-pointer disabled:opacity-50" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
              {submitting ? 'Submitting…' : 'Submit Completion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
