'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mockDamagePenalty } from '../../lib/mockData';
import type { DamagePenalty } from '../../types';
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

const CARD_WIDTH_PX = 288; // w-72 = 18rem

function DamagePenaltyDetailSkeleton() {
  return (
    <div className="pb-8 animate-pulse" style={{ fontFamily: 'Poppins' }}>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-9 w-72 bg-gray-200 rounded-lg mb-2" />
            <div className="h-5 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
            </div>
            <div className="w-full sm:w-44 h-24 bg-gray-100 rounded-lg" />
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white h-24 bg-gray-50" />
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="h-5 w-48 bg-gray-200 rounded mb-3" />
            <div className="grid grid-cols-3 gap-3">
              <div className="aspect-video bg-gray-200 rounded-lg" />
              <div className="aspect-video bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
            <div className="h-8 w-28 bg-gray-200 rounded mt-4" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4 bg-white h-24 bg-gray-50" />
          <div className="border border-gray-200 rounded-lg p-4 bg-white h-28 bg-gray-50" />
        </div>
      </div>
    </div>
  );
}

export default function DamagePenaltyDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const parsed = id ? parseDamageSlug(id) : null;
  const [isLoading, setIsLoading] = useState(true);
  const [incident, setIncident] = useState<DamagePenalty | null>(null);
  const proofScrollRef = useRef<HTMLDivElement>(null);
  const [showImageModal, setshowImageModal] = useState(false);
  const [currentProofIndex, setCurrentProofIndex] = useState(0);
  const [isProofTransitioning, setIsProofTransitioning] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted && parsed) {
        const found = mockDamagePenalty.find((m) => m.bookingId === parsed.bookingId && m.unit === parsed.unit) ?? null;
        setIncident(found);
      }
      if (mounted) setIsLoading(false);
    }, 350);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [id, parsed]);

  const proofUrls = incident?.proofUrls ?? [];
  const openProofModal = useCallback((index: number) => {
    setCurrentProofIndex(index);
    setshowImageModal(true);
  }, []);
  
  const closeProofModal = useCallback(() => setshowImageModal(false), []);
  const nextProof = useCallback(() => {
    if (proofUrls.length <= 1 || isProofTransitioning) return;
    setIsProofTransitioning(true);
    setTimeout(() => {
      setCurrentProofIndex((prev) => (prev + 1) % proofUrls.length);
      setIsProofTransitioning(false);
    }, 150);
  }, [proofUrls.length, isProofTransitioning]);
  const prevProof = useCallback(() => {
    if (proofUrls.length <= 1 || isProofTransitioning) return;
    setIsProofTransitioning(true);
    setTimeout(() => {
      setCurrentProofIndex((prev) => (prev - 1 + proofUrls.length) % proofUrls.length);
      setIsProofTransitioning(false);
    }, 150);
  }, [proofUrls.length, isProofTransitioning]);

  const scrollProof = useCallback((direction: 'left' | 'right') => {
    const el = proofScrollRef.current;
    if (!el) return;
    const delta = direction === 'left' ? -CARD_WIDTH_PX : CARD_WIDTH_PX;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return <DamagePenaltyDetailSkeleton />;
  }

  if (!id || !incident) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: 'Poppins' }}>
        <p className="text-gray-600 mb-4">Damage incident not found.</p>
        <Link
          href="/sales-report/finance/damage-penalty"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 w-fit"
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
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700 self-start sm:self-auto shrink-0"
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
              <p className="text-sm text-gray-600 mt-0.5">
                {incident.unitAddress || incident.location || incident.description || '—'}
              </p>
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
            <h5 className="text-sm font-semibold text-gray-800 mb-2">Reason of damage/loss</h5>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {incident.reasonOfDamage || incident.description || '—'}
            </p>
          </div>

          {/* Items (lost or broken) */}
          {incident.items && incident.items.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="text-sm font-semibold text-gray-800 mb-3">Items</h5>
              <ul className="space-y-2">
                {incident.items.map((entry, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-800">{entry.item}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        entry.type === 'loss'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.type === 'loss' ? 'Lost' : 'Broken'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Proof of damage (pictures) */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">Proof of damage/loss</h5>
            {incident.proofUrls && incident.proofUrls.length > 0 ? (
              incident.proofUrls.length > 2 ? (
                <div className="relative">
                  <div
                    ref={proofScrollRef}
                    className="proof-gallery-scroll overflow-x-auto rounded-lg snap-x snap-mandatory flex gap-3 -mx-1 px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {incident.proofUrls.map((url, i) => (
                      <div
                        key={i}
                        role="button"
                        tabIndex={0}
                        onClick={() => openProofModal(i)}
                        onKeyDown={(e) => e.key === 'Enter' && openProofModal(i)}
                        className="relative flex-shrink-0 w-64 sm:w-72 aspect-video rounded-lg overflow-hidden snap-start cursor-pointer"
                      >
                        <img
                          src={url}
                          alt={`Proof of damage ${i + 1}`}
                          className="w-full h-42 object-cover rounded-lg hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs">
                          Photo {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollProof('left')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all"
                    aria-label="Previous photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollProof('right')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-lg transition-all"
                    aria-label="Next photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {incident.proofUrls.map((url, i) => (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => openProofModal(i)}
                      onKeyDown={(e) => e.key === 'Enter' && openProofModal(i)}
                      className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-[#0B5858]/40 transition-shadow"
                    >
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
              )
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

      {/* Proof image lightbox (same as unit page) */}
      {showImageModal && proofUrls.length > 0 && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000]">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              type="button"
              onClick={closeProofModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {proofUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevProof}
                  disabled={isProofTransitioning}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 p-2 rounded-full hover:bg-white/10 ${isProofTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                  aria-label="Previous photo"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={nextProof}
                  disabled={isProofTransitioning}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 p-2 rounded-full hover:bg-white/10 ${isProofTransitioning ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                  aria-label="Next photo"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              </>
            )}

            <div className="absolute inset-0 flex items-center justify-center p-0">
              <img
                src={proofUrls[currentProofIndex]}
                alt={`Proof of damage ${currentProofIndex + 1}`}
                className={`w-full h-full transition-all duration-300 ease-in-out ${isProofTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                style={{ objectFit: 'contain', width: '70%', height: '80%' }}
              />
            </div>

            {proofUrls.length > 1 && (
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full transition-all duration-300 ${isProofTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                {currentProofIndex + 1} / {proofUrls.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
