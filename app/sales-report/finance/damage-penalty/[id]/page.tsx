'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mockDamagePenalty } from '../../lib/mockData';
import { formatPHP, formatDateLong } from '../../lib/format';

const SLUG_SEP = '__';

function parseDamageSlug(slug: string): { bookingId: string; unit: string } | null {
  try {
    const decoded = decodeURIComponent(slug);
    const idx = decoded.indexOf(SLUG_SEP);
    if (idx === -1) return null;
    return {
      bookingId: decoded.slice(0, idx),
      unit: decoded.slice(idx + SLUG_SEP.length),
    };
  } catch {
    return null;
  }
}

export default function DamagePenaltyDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const parsed = id ? parseDamageSlug(id) : null;
  const incident = parsed
    ? mockDamagePenalty.find((m) => m.bookingId === parsed.bookingId && m.unit === parsed.unit)
    : null;

  if (!id || !incident) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: 'Poppins' }}>
        <p className="text-gray-600 mb-4">Damage incident not found.</p>
        <Link
          href="/sales-report/finance/damage-penalty"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
        >
          ← Back to Damage & penalty impact
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8" style={{ fontFamily: 'Poppins' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#0B5858' }}>
              Damage incident details
            </h1>
            <div className="flex items-center mt-2">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-500">
                {incident.bookingId} – {incident.unit}
              </span>
            </div>
          </div>
          <Link
            href="/sales-report/finance/damage-penalty"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Unit / Incident summary */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0B5858] uppercase tracking-wide">
                  Incident
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mt-1">
                {incident.unit}
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">{incident.description}</p>
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm">
                <div className="text-xs text-gray-500">Booking ID</div>
                <div className="font-semibold text-gray-800 mt-1 break-words" style={{ wordBreak: 'break-word' }}>
                  {incident.bookingId}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3">
                  <div className="text-xs text-gray-500">Reported at</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {/^\d{4}-\d{2}-\d{2}$/.test(String(incident.reportedAt)) ? formatDateLong(incident.reportedAt) : incident.reportedAt}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reason of damage */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h5 className="text-sm font-semibold text-gray-800 mb-2">Reason of damage</h5>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {incident.reasonOfDamage || incident.description || '—'}
            </p>
          </div>

          {/* Proof of damage (pictures) */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">Proof of damage</h5>
            {incident.proofUrls && incident.proofUrls.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incident.proofUrls.map((url, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={url}
                      alt={`Proof of damage ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
                      Photo {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 text-sm">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                No proof images attached
              </div>
            )}
          </div>

          {/* Damage summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-base font-semibold text-gray-800 mb-3">Damage summary</h4>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="flex justify-between">
                <span>Cost</span>
                <span>{formatPHP(incident.cost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Charged to guest</span>
                <span>{formatPHP(incident.chargedToGuest)}</span>
              </div>
              <div className="flex justify-between">
                <span>Absorbed</span>
                <span className="text-red-600">{formatPHP(incident.absorbed)}</span>
              </div>
              <div className="border-t border-gray-200 mt-4 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total loss</span>
                  <span className="font-bold text-lg">{formatPHP(incident.totalLoss)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Status panel */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h5 className="text-lg font-semibold text-gray-800 mb-2">Status</h5>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-md font-medium ${
                incident.status === 'Paid'
                  ? 'bg-green-100 text-green-800'
                  : incident.status === 'Pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {incident.status}
            </span>
          </div>

          {/* Who reported it */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h5 className="text-sm font-semibold text-gray-800 mb-2">Reported by</h5>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B5858]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-sm text-gray-700 min-w-0">
                <p className="font-medium text-gray-900 break-words" style={{ wordBreak: 'break-word' }}>
                  {incident.reportedBy || '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>Reporter</p>
                <div className="flex items-center gap-2 mt-2"    style={{ fontFamily: 'Poppins' }}>
                    <h5 className="text-sm" style={{ fontFamily: 'Poppins' }}>Reported at: </h5>
                    <div className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                    {/^\d{4}-\d{2}-\d{2}$/.test(String(incident.reportedAt)) ? formatDateLong(incident.reportedAt) : incident.reportedAt}
                    </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
