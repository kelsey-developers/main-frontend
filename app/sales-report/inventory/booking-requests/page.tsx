'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllBookings } from '@/lib/api/bookings';
import type { AdditionalService } from '@/types/booking';
import SummaryCard from '../components/SummaryCard';
import {
  inventoryStockMovements,
  inventoryUnits,
  loadInventoryDataset,
} from '../lib/inventoryDataStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingRow = {
  id: string;
  reference_code?: string;
  listing_id?: string;
  check_in_date?: string;
  check_out_date?: string;
  status?: string;
  client?: { first_name?: string; last_name?: string; email?: string };
  listing?: { title?: string; location?: string };
  add_ons?: unknown;
  request_description?: string;
  notes?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString?: string) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatPHP = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toAddOns = (raw: unknown): AdditionalService[] => {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((a) => {
      const rec = a as Record<string, unknown>;
      return {
        id: String(rec.id ?? ''),
        name: String(rec.name ?? ''),
        quantity: Number(rec.quantity ?? 0),
        charge: Number(rec.charge ?? 0),
      };
    })
    .filter((a) => Boolean(a.id) && a.quantity > 0);
};

const getBookingReference = (b: BookingRow) => String(b.reference_code || b.id);

const hasAppliedMovements = (bookingRef: string, addOns: AdditionalService[]) => {
  if (!bookingRef || addOns.length === 0) return false;
  const required = new Set(addOns.map((a) => a.id));
  for (const m of inventoryStockMovements) {
    if (String(m.referenceType) !== 'BOOKING') continue;
    if (String(m.referenceId ?? '') !== bookingRef) continue;
    if (String(m.type) !== 'out') continue;
    required.delete(String(m.productId));
    if (required.size === 0) return true;
  }
  return false;
};

const resolveUnitName = (listingId?: string): string => {
  if (!listingId) return '—';
  const unit = inventoryUnits.find((u) => u.id === listingId);
  return unit?.name ?? listingId;
};

// ─── Component ────────────────────────────────────────────────────────────────

const GRID_COLS = '1fr 1.1fr 1.3fr 1.1fr 1fr 1fr';
const GRID_HEADERS = ['REFERENCE', 'DATES', 'GUEST', 'UNIT', 'ADD-ONS', 'ACTION'];

export default function InventoryBookingRequestsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        await loadInventoryDataset(true);

        // Pull both confirmed and completed bookings — confirmed are the primary target;
        // completed are included for late/retroactive processing.
        const [confirmed, completed] = await Promise.all([
          getAllBookings({ status: 'confirmed', limit: 200 }).catch(() => ({ data: [] as Record<string, unknown>[], pagination: { page: 1, limit: 200, total: 0, total_pages: 1 } })),
          getAllBookings({ status: 'completed', limit: 200 }).catch(() => ({ data: [] as Record<string, unknown>[], pagination: { page: 1, limit: 200, total: 0, total_pages: 1 } })),
        ]);

        const combined = [...(confirmed.data ?? []), ...(completed.data ?? [])];
        if (!cancelled) setRows(combined as unknown as BookingRow[]);
      } catch (e) {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : 'Failed to load booking requests.');
      } finally {
        if (!cancelled) {
          setRefreshTick((t) => t + 1);
          setIsLoading(false);
        }
      }
    };

    void load();

    const onUpdate = () => void load();
    window.addEventListener('inventory:movement-updated', onUpdate);
    window.addEventListener('inventory:dataset-updated', onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('inventory:movement-updated', onUpdate);
      window.removeEventListener('inventory:dataset-updated', onUpdate);
    };
  }, []);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const bookingsWithAddOns = useMemo(() => {
    return rows
      .map((b) => {
        const rec = b as unknown as Record<string, unknown>;
        const raw = rec.add_ons ?? rec.addOns ?? b.add_ons;
        return { booking: b, addOns: toAddOns(raw) };
      })
      .filter(({ addOns }) => addOns.length > 0);
  }, [rows, refreshTick]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return bookingsWithAddOns;
    const q = search.toLowerCase();
    return bookingsWithAddOns.filter(({ booking }) => {
      const ref = getBookingReference(booking).toLowerCase();
      const guest = [booking.client?.first_name, booking.client?.last_name, booking.client?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const unit = resolveUnitName(booking.listing_id).toLowerCase();
      const title = (booking.listing?.title ?? '').toLowerCase();
      return ref.includes(q) || guest.includes(q) || unit.includes(q) || title.includes(q);
    });
  }, [bookingsWithAddOns, search]);

  const totals = useMemo(() => {
    const total = bookingsWithAddOns.length;
    const applied = bookingsWithAddOns.filter(({ booking, addOns }) =>
      hasAppliedMovements(getBookingReference(booking), addOns)
    ).length;
    const pending = total - applied;
    return { total, applied, pending };
  }, [bookingsWithAddOns, refreshTick]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const redirectToStockOut = (booking: BookingRow, addOns: AdditionalService[]) => {
    const bookingRef = getBookingReference(booking);
    if (!bookingRef) return;

    const params = new URLSearchParams();
    params.set('mode', 'unit');
    params.set('returnTo', '/sales-report/inventory/booking-requests');
    params.set('reference', bookingRef);
    params.set('referenceType', 'BOOKING');
    params.set('reason', 'Guest Booking');
    params.set('bookingId', booking.id);

    if (booking.listing_id) params.set('unitId', booking.listing_id);

    addOns.forEach((a) => {
      params.append('itemId', a.id);
      params.append('qty', String(Math.max(0, Math.floor(a.quantity))));
    });

    const notes = `Booking ${bookingRef} · ${addOns.length} item${addOns.length !== 1 ? 's' : ''}`;
    params.set('notes', notes);

    router.push(`/sales-report/inventory/StockOut?${params.toString()}`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes inventoryReveal {
          from { opacity: 0; transform: translate3d(0, 14px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .inventory-reveal { opacity: 0; animation: inventoryReveal 560ms ease-in-out forwards; }
        .bkr-row:hover { background: #e8f4f4 !important; }
        .bkr-row { transition: background 120ms; }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal"
        style={{ fontFamily: 'Poppins' }}
      >
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Booking Requests</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900">Booking Requests</h1>
          <p className="text-gray-600 mt-1">
            Review confirmed booking add-ons and apply them as unit stock-outs to keep inventory levels accurate.
          </p>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 inventory-reveal" style={{ animationDelay: '80ms' }}>
        {[
          { label: 'Total Bookings', value: totals.total, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
          { label: 'Pending Stock-Out', value: totals.pending, gradient: 'from-amber-500 to-amber-600' },
          { label: 'Applied', value: totals.applied, gradient: 'from-[#05807e] to-[#0B5858]' },
        ].map((stat, i) => (
          <SummaryCard
            key={i}
            label={stat.label}
            value={stat.value}
            gradient={stat.gradient}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 inventory-reveal" style={{ animationDelay: '140ms' }}>
        <div className="flex-1 relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, guest name, or unit…"
            className="w-full pl-10 pr-4 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white text-gray-900 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
            style={{ fontFamily: 'Poppins' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="inventory-reveal" style={{ animationDelay: '200ms', fontFamily: 'Poppins' }}>
        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-12 text-center text-gray-500" style={{ fontFamily: 'Poppins' }}>
              Loading booking requests…
            </div>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-12 text-center" style={{ fontFamily: 'Poppins' }}>
              <div className="font-semibold mb-2 text-amber-700">Could not load bookings</div>
              <p className="text-sm text-gray-600 mb-4">{fetchError}</p>
              <button
                type="button"
                onClick={() => setRefreshTick((t) => t + 1)}
                className="px-4 py-2 rounded-lg bg-[#05807e] text-white font-semibold text-sm hover:bg-[#047772] transition-colors"
                style={{ fontFamily: 'Poppins' }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : bookingsWithAddOns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="py-12 px-6 text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">No bookings with add-ons found</div>
              <p className="text-sm">Confirmed bookings with guest add-ons will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

            {/* Desktop header */}
            <div
              className="hidden md:grid px-5 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              {GRID_HEADERS.map((h) => (
                <div key={h} className="text-xs font-bold tracking-wide text-white/75">{h}</div>
              ))}
            </div>

            {filteredRows.length === 0 ? (
              <div className="py-8 px-6 text-center text-gray-500" style={{ fontFamily: 'Poppins' }}>
                <div className="font-semibold text-gray-900 mb-1">No results match your search</div>
                <div className="text-sm">Try adjusting your search term.</div>
              </div>
            ) : (
              filteredRows.map(({ booking, addOns }) => {
                const bookingRef = getBookingReference(booking);
                const isExpanded = expanded[bookingRef] === true;
                const applied = hasAppliedMovements(bookingRef, addOns);
                const guestName = [booking.client?.first_name, booking.client?.last_name]
                  .filter(Boolean)
                  .join(' ') || '—';
                const unitName = resolveUnitName(booking.listing_id);
                const addOnsTotal = addOns.reduce((sum, a) => sum + a.quantity * a.charge, 0);

                return (
                  <React.Fragment key={bookingRef}>
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid bkr-row px-5 py-3.5 border-b border-gray-200 last:border-b-0 items-start"
                      style={{ gridTemplateColumns: GRID_COLS }}
                    >
                      {/* Reference */}
                      <div className="flex flex-col gap-1 min-w-0 pr-3">
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [bookingRef]: !isExpanded }))}
                          className="text-[12.5px] font-semibold text-[#0b5858] hover:underline text-left break-words whitespace-normal w-fit max-w-full"
                          aria-expanded={isExpanded}
                        >
                          {bookingRef}
                        </button>
                        <span
                          className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            applied
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {applied ? 'Applied' : 'Pending'}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                        <div className="text-[12.5px] text-gray-700 whitespace-normal">
                          {formatDate(booking.check_in_date)}
                        </div>
                        <div className="text-[11px] text-gray-400">→</div>
                        <div className="text-[12.5px] text-gray-700 whitespace-normal">
                          {formatDate(booking.check_out_date)}
                        </div>
                        <div className="text-[11px] text-gray-500 capitalize mt-0.5">
                          {booking.status ?? '—'}
                        </div>
                      </div>

                      {/* Guest */}
                      <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                        <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">
                          {guestName}
                        </div>
                        {booking.client?.email && (
                          <div className="text-[11px] text-gray-500 whitespace-normal break-all">
                            {booking.client.email}
                          </div>
                        )}
                      </div>

                      {/* Unit */}
                      <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                        <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">
                          {unitName}
                        </div>
                        {booking.listing?.title && (
                          <div className="text-[11px] text-gray-500 whitespace-normal break-words">
                            {booking.listing.title}
                          </div>
                        )}
                      </div>

                      {/* Add-ons summary */}
                      <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                        <div className="text-[12.5px] font-medium text-gray-900">
                          {addOns.length} item{addOns.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-gray-500">{formatPHP(addOnsTotal)}</div>
                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [bookingRef]: !isExpanded }))}
                          className="text-[11px] text-[#0b5858] hover:underline text-left w-fit mt-0.5"
                        >
                          {isExpanded ? 'Hide items ▲' : 'View items ▼'}
                        </button>
                      </div>

                      {/* Action */}
                      <div className="flex items-start">
                        <button
                          type="button"
                          disabled={applied}
                          onClick={() => redirectToStockOut(booking, addOns)}
                          className={`inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap ${
                            applied
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-[#0B5858] text-white hover:bg-[#0a4a4a]'
                          }`}
                        >
                          {applied ? 'Applied' : 'Apply Stock-Out'}
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-4 border-b border-gray-200 last:border-b-0 bkr-row">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [bookingRef]: !isExpanded }))}
                            className="text-[13px] font-semibold text-[#0b5858] hover:underline text-left break-words"
                            aria-expanded={isExpanded}
                          >
                            {bookingRef}
                          </button>
                          <div className="text-[11px] text-gray-500 whitespace-normal break-words mt-0.5">
                            {guestName}
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            applied
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {applied ? 'Applied' : 'Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 mb-3">
                        <div className="bg-[#e8f4f4] rounded-lg p-2">
                          <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Check-in</div>
                          <div className="text-[12px] font-bold text-[#0b5858]">{formatDate(booking.check_in_date)}</div>
                        </div>
                        <div className="bg-[#e8f4f4] rounded-lg p-2">
                          <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Check-out</div>
                          <div className="text-[12px] font-bold text-gray-700">{formatDate(booking.check_out_date)}</div>
                        </div>
                        <div className="bg-[#e8f4f4] rounded-lg p-2">
                          <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Add-ons</div>
                          <div className="text-[12px] font-bold text-[#0b5858]">{addOns.length} item{addOns.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      {!applied && (
                        <button
                          type="button"
                          onClick={() => redirectToStockOut(booking, addOns)}
                          className="w-full py-2 rounded-lg bg-[#0B5858] text-white text-[13px] font-semibold hover:bg-[#0a4a4a] transition-colors"
                        >
                          Apply Stock-Out
                        </button>
                      )}
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div
                        className="border-b border-gray-200 last:border-b-0 bg-[#f6fafa] px-5 py-5"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                          {/* Items list */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-[11px] font-bold tracking-wider text-gray-500 uppercase mb-3">
                              Requested Items
                            </h3>
                            <ul className="space-y-2">
                              {addOns.map((a) => (
                                <li key={a.id} className="flex justify-between items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">
                                      {a.name || a.id}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                      {a.quantity} × {formatPHP(a.charge)}
                                    </div>
                                  </div>
                                  <div className="text-[12.5px] font-semibold text-gray-900 whitespace-nowrap shrink-0">
                                    {formatPHP(a.quantity * a.charge)}
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                              <span className="text-[12px] text-gray-600">Subtotal</span>
                              <span className="text-[12.5px] font-semibold text-gray-900">{formatPHP(addOnsTotal)}</span>
                            </div>
                          </div>

                          {/* Guest request + meta */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-[11px] font-bold tracking-wider text-gray-500 uppercase mb-3">
                              Guest Request
                            </h3>
                            <div className="text-[12.5px] text-gray-700 whitespace-pre-wrap break-words">
                              {String(booking.request_description ?? booking.notes ?? '').trim() || '—'}
                            </div>
                            <div className="mt-4 text-[11px] text-gray-400 leading-relaxed">
                              Applying will create stock-out movements with{' '}
                              <span className="font-semibold text-gray-600">referenceType: BOOKING</span> and{' '}
                              <span className="font-semibold text-gray-600">referenceId: {bookingRef}</span>.
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
