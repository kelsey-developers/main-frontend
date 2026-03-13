'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';
import InventoryDropdown from './InventoryDropdown';
import { useToast } from '../hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useProductNames } from '../hooks/useProductNames';
import { getTodayInPhilippineTime, getNowIso } from '@/lib/dateUtils';
import { apiClient } from '@/lib/api/client';
import {
  loadInventoryDataset,
  inventoryWarehouseDirectory,
  inventoryUnits,
  inventoryItems,
  isWarehouseActive,
} from '../lib/inventoryDataStore';
import {
  createDamageIncident,
  updateDamageIncident,
  uploadDamageIncidentAttachments,
  type CreateDamageIncidentPayload,
  type DamageIncident,
} from '@/lib/api/damageIncidents';
import {
  type DamageIncidentStatus,
  DAMAGE_STATUS_LABELS,
  normalizeDamageStatus,
  canEditChargedAbsorbed,
  isTransitioningToSettled,
  isResolvedStatus,
} from '../helpers/damageIncidentHelpers';

const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
  red: '#f10e3b',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1.5px solid ${C.lightGray}`,
  fontSize: 14,
  color: C.darkGray,
  background: C.white,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Poppins',
  transition: 'border-color 0.15s',
};

function Field({
  label,
  required,
  hint,
  hintBelow,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  hintBelow?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.darkGray,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'Poppins',
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
        {hint && (
          <span style={{ fontWeight: 400, color: C.midGray, fontSize: 11 }}>· {hint}</span>
        )}
      </label>
      {children}
      {hintBelow && (
        <div style={{ fontSize: 11, color: C.midGray, fontFamily: 'Poppins' }}>{hintBelow}</div>
      )}
    </div>
  );
}

type WriteOffType = 'warehouse' | 'unit';

type DamageStatus = 'open' | 'charged_to_guest' | 'absorbed' | 'settled';

const STATUS_OPTIONS: { value: DamageStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'charged_to_guest', label: 'Charged to guest' },
  { value: 'absorbed', label: 'Absorbed' },
  { value: 'settled', label: 'Settled' },
];

interface LineItem {
  tempId: string;
  productId: string;
  quantity: number;
  itemCost?: number;
}

interface DamageReportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  /** When provided, modal opens in edit mode (PATCH). Items are read-only in edit. */
  incident?: DamageIncident | null;
}

export default function DamageReportModal({ onClose, onSuccess, incident }: DamageReportModalProps) {
  const isEdit = Boolean(incident?.id);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [writeOffType, setWriteOffType] = useState<WriteOffType>('warehouse');
  const [warehouseId, setWarehouseId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [bookingOptions, setBookingOptions] = useState<Array<{ id: string; code: string; guestName: string; checkIn: string; checkOut: string }>>([]);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [reportDate, setReportDate] = useState(getTodayInPhilippineTime());
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DamageIncidentStatus>('open');
  const [notes, setNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [absorbedAmount, setAbsorbedAmount] = useState<number>(0);
  const [chargedToGuest, setChargedToGuest] = useState<number>(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptImages, setReceiptImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = useAuth();
  const mockAuth = useMockAuth();
  const authState = auth.user ? auth : mockAuth;
  /** Preview only — reporter id is sent via createDamageIncident(..., { reporterUserId }); body has no reportedByUserId */
  const reportedByDisplay = auth.user
    ? `${auth.userProfile?.fullname ?? ([auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ') || 'User')} (ID: ${auth.user.id})`
    : '—';
  const { error, success } = useToast();
  const productIdsForNames = incident?.items?.map((i) => i.productId).filter(Boolean) ?? [];
  const productNamesFromApi = useProductNames(productIdsForNames);

  const warehouses = inventoryWarehouseDirectory.filter((w) => isWarehouseActive(w));
  const unitOptions = inventoryUnits.map((u) => ({ value: u.id, label: u.name }));

  const getProductName = (productId: string) =>
    inventoryItems.find((p) => p.id === productId)?.name ??
    productNamesFromApi[productId] ??
    `Product #${productId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void loadInventoryDataset();
  }, []);

  // Load bookings for selected unit when unit write-off and unit changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (writeOffType !== 'unit' || !unitId) {
        setBookingId('');
        setBookingOptions([]);
        return;
      }
      setIsBookingLoading(true);
      try {
        const rows = await apiClient.get<
          Array<{
            id: string;
            reference_code?: string;
            check_in_date?: string;
            check_out_date?: string;
            client?: { first_name?: string; last_name?: string };
          }>
        >(`/api/bookings?listingId=${encodeURIComponent(unitId)}`);
        if (cancelled) return;
        const mapped = rows.map((b) => ({
          id: b.id,
          code: b.reference_code || b.id,
          guestName: [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ').trim() || 'Guest',
          checkIn: b.check_in_date || '',
          checkOut: b.check_out_date || '',
        }));
        setBookingOptions(mapped);
        setBookingId((prev) => (prev && !mapped.some((b) => b.id === prev) ? '' : prev));
      } catch {
        if (!cancelled) setBookingOptions([]);
      } finally {
        if (!cancelled) setIsBookingLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [writeOffType, unitId]);

  useEffect(() => {
    if (incident) {
      setReportDate(incident.reportDate ?? incident.reportedAt ?? getTodayInPhilippineTime());
      setDescription(incident.description ?? '');
      setResolutionNotes(incident.resolutionNotes ?? '');
      const s = normalizeDamageStatus(incident.status);
      setStatus(s);
      // Open: charged/absorbed = 0; otherwise load amounts from incident
      if (s === 'open') {
        setAbsorbedAmount(0);
        setChargedToGuest(0);
      } else {
        setAbsorbedAmount(incident.absorbedAmount ?? 0);
        setChargedToGuest(incident.chargedToGuest ?? 0);
      }
      const rawItems = incident.items ?? [];
      const firstWithUnit = rawItems.find((it) => it.unitId);
      if (firstWithUnit?.unitId || incident.unitId) {
        setWriteOffType('unit');
        setUnitId(firstWithUnit?.unitId ?? incident.unitId ?? '');
        setBookingId(incident.bookingId ?? '');
      } else {
        setWriteOffType('warehouse');
        const whId =
          incident.warehouseId ??
          (rawItems[0]?.productId
            ? inventoryItems.find((p) => p.id === rawItems[0].productId)?.warehouseId
            : undefined);
        if (whId) setWarehouseId(whId);
      }
      const items: LineItem[] = rawItems.map((it, i) => ({
        tempId: it.id ?? `line-${i}-${Date.now()}`,
        productId: it.productId,
        quantity: it.quantity,
        itemCost: it.itemCost,
      }));
      setLineItems(items);
    }
  }, [incident]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const MAX_FILE_SIZE_MB = 2;
  const MAX_TOTAL_MB = 8;
  const MAX_FILES = 5;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const maxTotalBytes = MAX_TOTAL_MB * 1024 * 1024;
    const currentTotal = receiptImages.reduce((sum, f) => sum + f.size, 0);
    const validFiles: File[] = [];
    let skippedOversized = false;

    for (const file of files) {
      if (validFiles.length >= MAX_FILES) break;
      if (file.size > maxBytes) {
        skippedOversized = true;
        continue;
      }
      if (
        currentTotal + validFiles.reduce((s, f) => s + f.size, 0) + file.size >
        maxTotalBytes
      ) {
        skippedOversized = true;
        break;
      }
      validFiles.push(file);
    }

    if (skippedOversized) {
      error(
        `Some images were skipped. Max ${MAX_FILE_SIZE_MB}MB per file, ${MAX_TOTAL_MB}MB total, ${MAX_FILES} files.`
      );
    }

    const newImages = [...receiptImages, ...validFiles];
    setReceiptImages(newImages);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setReceiptImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (writeOffType === 'warehouse' && !warehouseId && !isEdit) {
      error('Please select a warehouse.');
      return;
    }
    if (writeOffType === 'unit' && !unitId && !isEdit) {
      error('Please select a unit for unit write-off.');
      return;
    }
    if (!reportDate) {
      error('Please select a report date.');
      return;
    }
    if (!description.trim()) {
      error('Please enter a description.');
      return;
    }

    if (isEdit && incident) {
      const prevStatus = normalizeDamageStatus(incident.status);
      const prevAbsorbed = incident.absorbedAmount ?? 0;
      const prevCharged = incident.chargedToGuest ?? 0;
      const noChanges =
        reportDate === (incident.reportDate ?? incident.reportedAt ?? '') &&
        (description.trim() || '') === (incident.description ?? '') &&
        status === prevStatus &&
        absorbedAmount === prevAbsorbed &&
        chargedToGuest === prevCharged &&
        (resolutionNotes.trim() || '') === (incident.resolutionNotes ?? '') &&
        (writeOffType === 'warehouse' ? warehouseId === (incident.warehouseId ?? '') : true) &&
        (writeOffType === 'unit'
          ? unitId === (incident.unitId ?? '') && bookingId === (incident.bookingId ?? '')
          : true) &&
        receiptImages.length === 0;
      if (noChanges) {
        error('No changes were made. Cancel or close to exit.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEdit && incident?.id) {
        const isWarehouseEdit = writeOffType === 'warehouse';
        const isSettling = isTransitioningToSettled(status, incident.status);
        const canEdit = canEditChargedAbsorbed(status);
        const updatePayload = {
          reportDate,
          description: description.trim() || undefined,
          status,
          absorbedAmount: canEdit ? Math.max(0, absorbedAmount) : 0,
          chargedToGuest: canEdit ? Math.max(0, chargedToGuest) : 0,
          resolutionNotes: resolutionNotes.trim() || undefined,
          // Omit resolvedByUserId — same FK constraint as reportedByUserId if auth user not in DB
          ...(isSettling && { resolvedAt: getNowIso() }),
          ...(isWarehouseEdit && warehouseId ? { warehouseId } : {}),
          ...(!isWarehouseEdit && unitId ? { unitId, bookingId: bookingId || undefined } : {}),
        };
        await updateDamageIncident(incident.id, updatePayload);
          if (receiptImages.length > 0) {
            try {
              await uploadDamageIncidentAttachments(incident.id, receiptImages);
            } catch (uploadErr) {
              if (process.env.NODE_ENV !== 'production') {
                console.error('Damage report attachment upload error:', uploadErr);
              }
              error('Report updated, but photo upload failed.');
            }
          }
        success('Damage report updated.');
      } else {
        const isUnitWriteOff = writeOffType === 'unit' && unitId;
        const reportedAtIso = getNowIso();
        // No reportedByUserId in payload — createDamageIncident drops it and sends X-Reporter-User-Id when set.
        const reporterUserId =
          auth.user?.id != null ? String(auth.user.id) : undefined;
        const payload: CreateDamageIncidentPayload = {
          description: description.trim(),
          reportedAt: reportedAtIso,
          status,
          cost: 0,
          absorbedAmount: 0,
          chargedToGuest: 0,
          ...(isUnitWriteOff
            ? { unitId, bookingId: bookingId || undefined }
            : { warehouseId }),
        };

        const created = await createDamageIncident(payload, { reporterUserId });

        if (created.id && receiptImages.length > 0) {
          try {
            await uploadDamageIncidentAttachments(created.id, receiptImages);
          } catch (uploadErr) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Damage report attachment upload error:', uploadErr);
            }
            error('Report created, but photo upload failed. You can re-upload later.');
          }
        }

        success(
          writeOffType === 'warehouse'
            ? 'Warehouse write-off recorded.'
            : 'Unit write-off recorded.'
        );
      }
      onSuccess?.();
      handleClose();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Damage report error:', err);
      }
      error(err instanceof Error ? err.message : 'Failed to record damage report.');
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(17, 24, 39, 0.38)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: C.white,
            borderRadius: 20,
            width: 'min(680px, 92vw)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            transform: visible ? 'scale(1)' : 'scale(0.95)',
            transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
            fontFamily: 'Poppins',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0b5858, #05807e)',
              padding: '24px 28px',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  marginBottom: 4,
                }}
              >
                {isEdit ? 'EDIT DAMAGE REPORT' : 'CREATE DAMAGE REPORT'}
              </div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: 20 }}>
                {isEdit ? `Report ${incident?.id ?? ''}` : 'Record warehouse or unit write-off'}
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.15)',
                color: C.white,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')
              }
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
            {/* Write-off type and location */}
            <div style={{ marginBottom: 20 }}>
                  <Field label="Write-off type" required>
                    <div className="inline-flex gap-1 bg-white border-[1.5px] border-gray-200 rounded-lg p-1 w-full">
                      {(['warehouse', 'unit'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setWriteOffType(t);
                            setUnitId('');
                            setBookingId('');
                            setWarehouseId('');
                          }}
                          className={`flex-1 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${
                            writeOffType === t
                              ? 'bg-[#05807e] text-white'
                              : 'bg-transparent text-gray-600 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {t === 'warehouse' ? 'Warehouse write-off' : 'Unit write-off'}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                {/* Warehouse (warehouse write-off only) */}
                {writeOffType === 'warehouse' && (
                  <div style={{ marginBottom: 20 }}>
                    <Field label="Warehouse" required>
                      <InventoryDropdown
                        value={warehouseId}
                        onChange={setWarehouseId}
                        options={[
                          { value: '', label: 'Select warehouse…' },
                          ...warehouses.map((w) => ({ value: w.id, label: w.name })),
                        ]}
                        placeholder="Select warehouse…"
                        placeholderWhen=""
                        fullWidth={true}
                        align="left"
                        backdropZIndexClass="z-[10005]"
                        menuZIndexClass="z-[10010]"
                      />
                    </Field>
                  </div>
                )}

                {/* Unit + Booking (unit write-off only) */}
                {writeOffType === 'unit' && (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <Field label="Unit" required>
                        <InventoryDropdown
                          value={unitId}
                          onChange={setUnitId}
                          options={[
                            { value: '', label: 'Select unit…' },
                            ...unitOptions,
                          ]}
                          placeholder="Select unit…"
                          placeholderWhen=""
                          fullWidth={true}
                          align="left"
                          backdropZIndexClass="z-[10005]"
                          menuZIndexClass="z-[10010]"
                        />
                      </Field>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <Field label="Booking" hint="Optional — link to guest stay">
                        <InventoryDropdown
                          value={bookingId}
                          onChange={setBookingId}
                          options={[
                            {
                              value: '',
                              label: !unitId
                                ? 'Select unit first'
                                : isBookingLoading
                                  ? 'Loading bookings…'
                                  : 'Select booking…',
                            },
                            ...bookingOptions.map((b) => ({
                              value: b.id,
                              label: `${b.code} — ${b.guestName} (${b.checkIn} to ${b.checkOut})`,
                            })),
                          ]}
                          placeholder={isBookingLoading ? 'Loading…' : 'Select booking…'}
                          placeholderWhen=""
                          fullWidth={true}
                          align="left"
                          backdropZIndexClass="z-[10005]"
                          menuZIndexClass="z-[10010]"
                        />
                      </Field>
                    </div>
                  </>
                )}

            {/* Report details */}
            <div
              style={{
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <Field label="Reported By">
                <div
                  style={{
                    ...inputStyle,
                    background: '#f8fbfb',
                    color: C.darkGray,
                    cursor: 'default',
                  }}
                >
                  {reportedByDisplay}
                </div>
              </Field>
              <Field label="Report Date" required>
                <SingleDatePicker
                  value={reportDate}
                  onChange={setReportDate}
                  placeholder="Select date"
                  calendarZIndex={10020}
                  className="w-full"
                />
              </Field>
            </div>

            <div style={{ marginBottom: 20 }}>
              <Field label="Description" required>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the damage and list items involved."
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 80,
                  }}
                />
              </Field>
            </div>

            <div
              style={{
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <Field
                label="Absorbed amount (PHP)"
                hint={status === 'open' ? 'Set to 0 for open reports; populated from stock-out in review' : 'Amount not paid by guest; absorbed by property'}
              >
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={absorbedAmount}
                  onChange={(e) => {
                    if (status === 'open') return;
                    const v = parseFloat(e.target.value);
                    setAbsorbedAmount(Number.isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  placeholder="0"
                  disabled={status === 'open'}
                  style={{
                    ...inputStyle,
                    ...(status === 'open' ? { background: '#f8fbfb', cursor: 'not-allowed' } : {}),
                  }}
                />
              </Field>
              <Field
                label="Charged to guest (PHP)"
                hint={status === 'open' ? 'Set to 0 for open reports; populated from stock-out in review' : 'Based on cost from stock-out when resolved'}
              >
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={chargedToGuest}
                  onChange={(e) => {
                    if (status === 'open') return;
                    const v = parseFloat(e.target.value);
                    setChargedToGuest(Number.isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  placeholder="0"
                  disabled={status === 'open'}
                  style={{
                    ...inputStyle,
                    ...(status === 'open' ? { background: '#f8fbfb', cursor: 'not-allowed' } : {}),
                  }}
                />
              </Field>
            </div>

            {isEdit && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Status" hint="Open → Charged to guest / Absorbed → Settled.">
                  <div className="inline-flex gap-1 bg-white border-[1.5px] border-gray-200 rounded-lg p-1 w-full">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStatus(opt.value);
                          if (opt.value === 'open') {
                            setAbsorbedAmount(0);
                            setChargedToGuest(0);
                          } else if (opt.value === 'charged_to_guest') {
                            setAbsorbedAmount(0);
                          } else if (opt.value === 'absorbed') {
                            setChargedToGuest(0);
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${
                          status === opt.value
                            ? 'bg-[#05807e] text-white'
                            : 'bg-transparent text-gray-600 hover:bg-gray-50'
                        }`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {/* Line items: read-only in edit mode when incident has items (from prior flow or stock-out) */}
            {isEdit && lineItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.darkGray,
                    marginBottom: 10,
                    fontFamily: 'Poppins',
                  }}
                >
                  Damaged items (from stock-out)
                </div>
                <div style={{ fontSize: 11, color: C.midGray, marginBottom: 8 }}>
                  Items are recorded when the incident is resolved via stock-out.
                </div>
                <div
                  style={{
                    border: `1.5px solid ${C.lightGray}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fbfb' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>
                          Product
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>
                          Qty
                        </th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: C.midGray, fontFamily: 'Poppins' }}>
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.tempId} style={{ borderTop: `1px solid ${C.lightGray}` }}>
                          <td style={{ padding: '6px 12px', fontSize: 13, color: C.darkGray, fontFamily: 'Poppins' }}>
                            {getProductName(item.productId)}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 13, fontFamily: 'Poppins' }}>
                            {item.quantity}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: 13, fontFamily: 'Poppins' }}>
                            {item.itemCost != null ? `PHP ${item.itemCost.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Image upload */}
            <div style={{ marginBottom: 20 }}>
              <Field label="Evidence photos" hint="Optional">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 10,
                      border: `2px dashed ${C.lightGray}`,
                      background: '#f8fbfb',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s',
                      fontFamily: 'Poppins',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.teal;
                      e.currentTarget.style.background = '#e8f4f4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.lightGray;
                      e.currentTarget.style.background = '#f8fbfb';
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5m0 0L7 8m5-5v12"
                        stroke={C.teal}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.darkTeal }}>
                      Click to upload damage photos (optional)
                    </div>
                    <div style={{ fontSize: 11, color: C.midGray }}>
                      PNG, JPG up to {MAX_FILE_SIZE_MB}MB each, max {MAX_FILES} files
                    </div>
                  </button>

                  {imagePreviews.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: 12,
                        marginTop: 12,
                      }}
                    >
                      {imagePreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: 10,
                            overflow: 'hidden',
                            border: `1.5px solid ${C.lightGray}`,
                            aspectRatio: '1',
                          }}
                        >
                          <img
                            src={preview}
                            alt={`Photo ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: 'none',
                              background: 'rgba(241, 14, 59, 0.9)',
                              color: C.white,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              fontWeight: 'bold',
                              transition: 'transform 0.15s',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.transform = 'scale(1.1)')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.transform = 'scale(1)')
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* Resolution notes (edit mode, when charged/absorbed/settled) */}
            {isEdit && isResolvedStatus(status) && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Resolution notes" hint="From stock-out when resolving.">
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Items written off via stock-out; cost split 50/50 guest/property"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 80,
                    }}
                  />
                </Field>
              </div>
            )}

            {/* Notes (create mode) */}
            {!isEdit && (
              <div style={{ marginBottom: 20 }}>
                <Field label="Notes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 80,
                    }}
                  />
                </Field>
              </div>
            )}

            {/* Review */}
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 12,
                background: '#f0f9f9',
                border: `1.5px solid ${C.teal}33`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.darkTeal,
                  marginBottom: 10,
                  fontFamily: 'Poppins',
                }}
              >
                Review before submit
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 13, color: C.darkGray, fontFamily: 'Poppins' }}>
                  {description.trim() || '(No description)'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.darkTeal,
                    fontFamily: 'Poppins',
                  }}
                >
                  <span>Absorbed: PHP {absorbedAmount.toLocaleString()}</span>
                  <span>Charged to guest: PHP {chargedToGuest.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '20px 28px',
              borderTop: `1.5px solid ${C.lightGray}`,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: `1.5px solid ${C.lightGray}`,
                background: C.white,
                color: C.darkGray,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'Poppins',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.white;
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!isEdit && !description.trim())}
              style={{
                padding: '10px 28px',
                borderRadius: 10,
                border: 'none',
                background:
                  !isEdit && !description.trim()
                    ? C.midGray
                    : `linear-gradient(135deg, ${C.darkTeal}, ${C.teal})`,
                color: C.white,
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  !isEdit && !description.trim()
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'opacity 0.15s',
                boxShadow:
                  !isEdit && !description.trim()
                    ? 'none'
                    : '0 4px 14px rgba(11,88,88,0.3)',
                fontFamily: 'Poppins',
                opacity: !isEdit && !description.trim() ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (isEdit || description.trim())
                  e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (isEdit || description.trim())
                  e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Update report' : 'Create damage report'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
