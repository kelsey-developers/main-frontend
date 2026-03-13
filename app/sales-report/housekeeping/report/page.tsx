'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDamageIncident,
  uploadDamageIncidentAttachments,
  type CreateDamageIncidentPayload,
} from '@/lib/api/damageIncidents';
import InventoryDropdown from '@/app/sales-report/inventory/components/InventoryDropdown';

/** Unit from GET /api/units (backend may use title or name) */
type UnitOption = {
  id: string;
  title?: string;
  name?: string;
  location?: string;
  city?: string;
  property_type?: string;
};

type BookingOption = {
  id: string;
  guest: string;
  checkIn: string;
  checkOut: string;
};

function HousekeepingReportSkeleton() {
  return (
    <div style={{ fontFamily: 'Poppins' }} className="animate-pulse">
      <div className="mb-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-9 w-64 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-full max-w-xl bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
          <div className="h-10 w-full bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-10 w-3/4 bg-gray-100 rounded" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
          <div className="min-h-[300px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200" />
        </div>
      </div>
      <div className="pt-5">
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format YYYY-MM-DD as "Mar 13, 2026" for display in Report Date field */
function formatReportDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function unitDisplayLabel(unit: UnitOption): string {
  const name = unit.title ?? unit.name ?? unit.id;
  const loc = unit.location ?? unit.city;
  return loc ? `${name} · ${loc}` : name;
}

type ProofFile = { file: File; preview?: string };

export type ReportCategory = 'loss' | 'broken';

export default function HousekeepingReportPage() {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);
  const reportedByName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
    : '';
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnits() {
      setUnitsError(null);
      setUnitsLoading(true);
      try {
        const data = await apiClient.get<UnitOption[] | { units?: UnitOption[]; data?: UnitOption[]; results?: UnitOption[] }>(
          '/api/units?limit=200&offset=0'
        );
        const list = Array.isArray(data) ? data : (data.units ?? data.data ?? data.results ?? []);
        if (!cancelled) setUnits(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setUnitsError(err instanceof Error ? err.message : 'Failed to load units');
          setUnits([]);
        }
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    }
    void fetchUnits();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchRecentBookings() {
      setBookingsLoading(true);
      setBookingsError(null);
      try {
        const data = await apiClient.get<
          Array<{
            id: string;
            check_in_date: string;
            check_out_date: string;
            client?: { first_name?: string; last_name?: string };
          }> | { message?: string }
        >('/api/market/bookings/my');

        if (!Array.isArray(data)) {
          if (!cancelled) {
            setBookings([]);
          }
          return;
        }

        const today = new Date(todayStr + 'T00:00:00');
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - 11); // ~ a week and a half ago

        const recent = data
          .map<BookingOption | null>((b) => {
            const guest =
              [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ').trim() ||
              'Guest';
            const ci = new Date(b.check_in_date + 'T00:00:00');
            if (Number.isNaN(ci.getTime())) return null;
            if (ci < cutoff || ci > today) return null;
            return {
              id: b.id,
              guest,
              checkIn: b.check_in_date,
              checkOut: b.check_out_date,
            };
          })
          .filter((b): b is BookingOption => b != null);

        if (!cancelled) {
          setBookings(recent);
        }
      } catch (err) {
        if (!cancelled) {
          setBookingsError(err instanceof Error ? err.message : 'Failed to load bookings');
          setBookings([]);
        }
      } finally {
        if (!cancelled) {
          setBookingsLoading(false);
        }
      }
    }
    void fetchRecentBookings();
    return () => {
      cancelled = true;
    };
  }, [todayStr]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  /** Report date: always defaults to today (ignores booking dates). */
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const reportDateInputRef = useRef<HTMLInputElement>(null);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  const unitOptions = [
    { value: '', label: unitsLoading ? 'Loading units…' : 'Select a unit' },
    ...units.map((u) => ({ value: u.id, label: unitDisplayLabel(u) })),
  ];

  const bookingDropdownOptions = useMemo(
    () =>
      bookings.map((b) => ({
        value: b.id,
        label: `${b.id} · ${b.guest} · ${b.checkIn} → ${b.checkOut}`,
      })),
    [bookings],
  );

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const newEntries: ProofFile[] = [];
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) return;
      const entry: ProofFile = { file };
      if (isImage) {
        const url = URL.createObjectURL(file);
        entry.preview = url;
      }
      newEntries.push(entry);
    });
    setProofFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const removeProofFile = useCallback((index: number) => {
    setProofFiles((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDescription = description.trim();
    if (!selectedUnitId || !selectedUnit || !trimmedDescription || !reportedByName) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const reportedAtIso = new Date(reportDate + 'T12:00:00.000Z').toISOString();

    const payload: CreateDamageIncidentPayload = {
      bookingId: selectedBookingId || undefined,
      unitId: selectedUnitId,
      // reportedByUserId omitted: auth user id may not exist in market-backend User table (FK constraint).
      // Backend should allow null and/or resolve reporter from session.
      reportedAt: reportedAtIso,
      description: trimmedDescription,
      resolutionNotes: notes.trim() || undefined,
      cost: 0,
      chargedToGuest: 0,
      absorbedAmount: 0,
      status: 'open',
    };

    try {
      const incident = await createDamageIncident(payload);
      const incidentId = incident?.id != null ? String(incident.id) : '';

      if (proofFiles.length > 0 && incidentId) {
        await uploadDamageIncidentAttachments(
          incidentId,
          proofFiles.map((p) => p.file)
        );
      }

      setSubmitted(true);
      setSelectedUnitId('');
      setDescription('');
      setNotes('');
      setSelectedBookingId('');
      proofFiles.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setProofFiles([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit report';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );
  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  if (unitsLoading && units.length === 0) {
    return <HousekeepingReportSkeleton />;
  }

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <div className="mb-6">
        <Link
          href="/sales-report/housekeeping"
          className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Housekeeping
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Report
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Report an issue or damage or loss of items for a unit you were assigned to clean today ({formatDate(todayStr)}).
        </p>
      </div>

      {submitted && (
        <div className="mb-6 p-4 rounded-xl bg-[#0B5858]/10 border border-[#0B5858]/20 text-[#0B5858]">
          <p className="font-medium">Report submitted.</p>
          <p className="text-sm mt-1">Thank you. The report has been recorded.</p>
        </div>
      )}

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
          <p className="font-medium">Could not submit report</p>
          <p className="text-sm mt-1">{submitError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <form id="housekeeping-report-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Booking – full width, optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Booking
                <span className="ml-1.5 font-normal text-gray-500">Optional – link to guest stay</span>
              </label>
              <InventoryDropdown
                value={selectedBookingId}
                onChange={setSelectedBookingId}
                options={[
                  {
                    value: '',
                    label: bookingsLoading ? 'Loading bookings…' : 'No booking linked',
                  },
                  ...bookingDropdownOptions,
                ]}
                placeholder={bookingsLoading ? 'Loading bookings…' : 'Select booking…'}
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
                align="left"
                disabled={bookingsLoading || bookings.length === 0}
              />
              {bookingsError && (
                <p className="mt-1.5 text-sm text-amber-600">{bookingsError}</p>
              )}
              {bookings.length === 0 && !bookingsLoading && !bookingsError && (
                <p className="mt-1.5 text-xs text-gray-500">
                  No recent bookings found within the last week and a half.
                </p>
              )}
            </div>

            {/* Reported By and Report Date – side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reported By <span className="text-red-500">*</span>
                  <span className="ml-1.5 font-normal text-gray-500">Auto-filled</span>
                </label>
                <input
                  type="text"
                  value={reportedByName}
                  readOnly
                  aria-readonly
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-[13px] cursor-default"
                  aria-label="Reported by (current user)"
                />
                {!reportedByName && (
                  <p className="mt-1.5 text-xs text-amber-600">Sign in to see your name here.</p>
                )}
              </div>
              <div>
                <label htmlFor="report-date-input" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Report Date <span className="text-red-500">*</span>
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const el = reportDateInputRef.current;
                    if (el?.showPicker) el.showPicker();
                    else el?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const el = reportDateInputRef.current;
                      if (el?.showPicker) el.showPicker();
                      else el?.focus();
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-gray-900 py-2.5 pl-3 pr-3 text-[13px] cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors min-h-[42px]"
                  aria-label="Report date – click to open calendar"
                >
                  <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="flex-1 text-gray-900">{formatReportDateDisplay(reportDate)}</span>
                </div>
                <input
                  ref={reportDateInputRef}
                  id="report-date-input"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="sr-only"
                  title="Report date"
                  aria-hidden
                />
              </div>
            </div>

            {/* Unit – full width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <InventoryDropdown
                value={selectedUnitId}
                onChange={setSelectedUnitId}
                options={unitOptions}
                placeholder={unitsLoading ? 'Loading units…' : 'Select a unit'}
                placeholderWhen=""
                hideIcon
                fullWidth
                minWidthClass="min-w-0"
                align="left"
                disabled={unitsLoading}
              />
              {unitsError && (
                <p className="mt-2 text-sm text-amber-600">{unitsError}</p>
              )}
              {units.length === 0 && !unitsLoading && !unitsError && (
                <p className="mt-2 text-sm text-gray-500">No units available.</p>
              )}
              {selectedUnit && (
                <p className="mt-2 text-xs text-gray-500">
                  {(selectedUnit.location ?? selectedUnit.city) && (
                    <span>{(selectedUnit.location ?? selectedUnit.city)}</span>
                  )}
                  {selectedUnit.property_type && (
                    <span>{selectedUnit.location || selectedUnit.city ? ' · ' : ''}{selectedUnit.property_type}</span>
                  )}
                </p>
              )}
            </div>

            <div className="mb-1.5">
              <label htmlFor="report-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the issue, damage, or loss..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors resize-none overflow-y-auto text-[13px]"
              />
            </div>

            <div>
              <label htmlFor="report-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
                <span className="ml-1.5 font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="report-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors resize-none overflow-y-auto text-[13px]"
              />
            </div>

          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-2">Proof of damage/loss</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload photos or videos as evidence. Images and videos only.
          </p>
          <label
            className="flex flex-col items-center justify-center w-full min-h-[300px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-[#0B5858]/40 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Drag and drop or click to upload</span>
              <span className="text-xs text-gray-400">Photos or videos</span>
            </div>
          </label>
          {proofFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">{proofFiles.length} file(s) added</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proofFiles.map((item, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt=""
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-gray-100">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black/60 rounded px-1 py-0.5 truncate">
                          {item.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeProofFile(index)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      aria-label="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pt-5">
        <button
          type="submit"
          form="housekeeping-report-form"
          disabled={!selectedUnitId || !description.trim() || isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-white bg-[#0B5858] hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting…' : 'Submit report'}
        </button>
      </div>
    </div>
  );
}
