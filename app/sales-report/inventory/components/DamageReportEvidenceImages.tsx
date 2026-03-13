'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  listDamageIncidentAttachments,
  getDamageAttachmentContentUrl,
  type DamageAttachment,
} from '@/lib/api/damageIncidents';

type LoadState =
  | { status: 'loading' }
  | { status: 'notPresent' }
  | { status: 'loadFailed' }
  | { status: 'loaded'; objectUrl: string };

export default function DamageReportEvidenceImages({
  incidentId,
  onPreview,
}: {
  incidentId: string;
  onPreview: (path: string, label: string) => void;
}) {
  const [attachments, setAttachments] = useState<DamageAttachment[] | null>(null);
  /** Per-attachment load state; object URLs must be revoked on unmount */
  const [loadStates, setLoadStates] = useState<Record<string, LoadState>>({});

  const setStateFor = useCallback((id: string, state: LoadState) => {
    setLoadStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAttachments = async () => {
      try {
        const list = await listDamageIncidentAttachments(incidentId);
        if (cancelled) return;
        setAttachments(list);
        setLoadStates({});

        for (const att of list) {
          const url = getDamageAttachmentContentUrl(att.id);
          setStateFor(att.id, { status: 'loading' });
          try {
            const res = await fetch(url, { credentials: 'include', redirect: 'follow' });
            if (cancelled) return;
            if (res.status === 404) {
              setStateFor(att.id, { status: 'notPresent' });
              continue;
            }
            if (!res.ok) {
              setStateFor(att.id, { status: 'loadFailed' });
              continue;
            }
            const blob = await res.blob();
            if (cancelled) return;
            if (!blob.size) {
              setStateFor(att.id, { status: 'notPresent' });
              continue;
            }
            const objectUrl = URL.createObjectURL(blob);
            setStateFor(att.id, { status: 'loaded', objectUrl });
          } catch {
            if (!cancelled) setStateFor(att.id, { status: 'loadFailed' });
          }
        }
      } catch {
        if (!cancelled) setAttachments([]);
      }
    };
    void fetchAttachments();
    return () => {
      cancelled = true;
      setLoadStates((prev) => {
        Object.values(prev).forEach((s) => {
          if (s.status === 'loaded') URL.revokeObjectURL(s.objectUrl);
        });
        return {};
      });
    };
  }, [incidentId, setStateFor]);

  if (attachments === null || attachments.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-[#e5e7eb] bg-[#f8fbfb]">
        <div className="text-[10px] font-bold tracking-wider uppercase text-[#9ca3af]">
          Submitted images ({attachments.length})
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          Preview below — click any image to enlarge
        </div>
      </div>
      <div className="p-4 space-y-4">
        {attachments.map((att, i) => {
          const label = att.filename ?? `Evidence ${i + 1}`;
          const state = loadStates[att.id] ?? { status: 'loading' as const };
          const loaded = state.status === 'loaded' ? state : null;

          const canPreview = loaded != null;

          const inner = (
            <>
              <div className="relative w-full min-h-[160px] max-h-[320px] flex items-center justify-center bg-gray-50">
                {state.status === 'loading' && (
                  <div className="py-8 text-[12px] text-gray-400">Loading…</div>
                )}
                {state.status === 'notPresent' && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-gray-500">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[12px] font-medium">Image was not present in submission</span>
                  </div>
                )}
                {state.status === 'loadFailed' && (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-amber-700/90">
                    <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-[12px] font-medium">Failed to load image</span>
                  </div>
                )}
                {loaded && (
                  <img
                    src={loaded.objectUrl}
                    alt={label}
                    className="max-h-[320px] w-full object-contain"
                    onError={() => setStateFor(att.id, { status: 'loadFailed' })}
                  />
                )}
              </div>
              <div className="px-3 py-2 text-[11px] text-gray-600 font-medium truncate" title={label}>
                {label}
              </div>
            </>
          );

          if (canPreview) {
            return (
              <button
                type="button"
                key={att.id}
                onClick={() => onPreview(loaded!.objectUrl, label)}
                className="w-full block text-left rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#05807e]/40"
              >
                {inner}
              </button>
            );
          }

          return (
            <div
              key={att.id}
              className="w-full rounded-lg overflow-hidden border border-[#e5e7eb] bg-[#f9fafb]"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
