'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';
import InventoryDropdown from './InventoryDropdown';
import { useToast } from '../hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useProductNames } from '../hooks/useProductNames';
import { useUserDisplayNames } from '../hooks/useUserDisplayNames';
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
  normalizeDamageStatus,
  canEditChargedAbsorbed,
  isTransitioningToSettled,
  isResolvedStatus,
  parseInventoryActionFromDescription,
  getReasonFromDescriptionFirstLine,
  getInventoryActionDescriptionLabel,
} from '../helpers/damageIncidentHelpers';

type WriteOffType = 'warehouse' | 'unit';

/** write_off = deduct from inventory (do Stock Out); record_only = no deduction (e.g. reusable damaged but stays in place). */
type InventoryAction = 'write_off' | 'record_only';

const STATUS_OPTIONS: { value: DamageIncidentStatus; label: string; dot: string }[] = [
  { value: 'open', label: 'Open', dot: '#9ca3af' },
  { value: 'resolved', label: 'Resolved', dot: '#10b981' },
];

function looksLikeOpaqueUserId(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
  if (/^c[a-z0-9]{20,}$/i.test(v)) return true;
  return false;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function nameFromEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!looksLikeEmail(email)) return null;
  const local = email.split('@')[0] ?? '';
  const words = local
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
  return words || null;
}

function normalizeKnownName(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '—') return null;
  if (/^unknown(?:\s+reporter)?$/i.test(trimmed)) return null;
  if (/^user\s*id\s*:/i.test(trimmed)) return null;
  const suffix = trimmed.match(/^(.*)\s+\(id:\s*([^)]+)\)\s*$/i);
  if (suffix) {
    const nameOnly = suffix[1]?.trim();
    return nameOnly || null;
  }
  if (looksLikeEmail(trimmed)) return nameFromEmail(trimmed) ?? trimmed;
  return trimmed;
}

// ─── Shared UI primitives ────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
  fontFamily: 'Poppins',
        fontSize: 11,
        color: '#dc2626',
        fontWeight: 500,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5.5" stroke="#dc2626" />
        <path d="M6 3.5v3M6 8h.01" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {msg}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #0b5858, #05807e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(5,128,126,0.28)',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0b5858', fontFamily: 'Poppins', letterSpacing: '-0.01em' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins', marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '22px 28px',
        borderLeft: '3px solid transparent',
        borderImage: 'linear-gradient(180deg, #0b5858, #05807e88) 1',
        background: '#ffffff',
        animation: 'sectionIn 0.3s ease both',
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 8, background: '#f5f7f7' }} />;
}

function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
      <label
        style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        marginBottom: 6,
          fontFamily: 'Poppins',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        }}
      >
        {label}
      {required && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 2 }}>
          <path d="M4 1v6M1.5 2.5l5 3M6.5 2.5l-5 3" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
        {hint && (
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af', fontSize: 11 }}>
          · {hint}
        </span>
        )}
      </label>
  );
}

const baseInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 12,
  border: '1.5px solid #e5e7eb',
  fontSize: 13,
  color: '#1f2937',
  background: '#ffffff',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Poppins',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const errorInput: React.CSSProperties = {
  ...baseInput,
  borderColor: '#fca5a5',
  background: '#fff7f7',
  boxShadow: '0 0 0 3px rgba(239,68,68,0.08)',
};

const focusInput: React.CSSProperties = {
  ...baseInput,
  borderColor: '#05807e',
  boxShadow: '0 0 0 3px rgba(5,128,126,0.1)',
};

interface LineItem {
  tempId: string;
  productId: string;
  quantity: number;
  itemCost?: number;
  /** When set (e.g. from parsed description), show this in edit mode instead of getProductName(productId) */
  displayName?: string;
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
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DamageIncidentStatus>('open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [absorbedAmount, setAbsorbedAmount] = useState<number>(0);
  const [chargedToGuest, setChargedToGuest] = useState<number>(0);
  const [assignedCharge, setAssignedCharge] = useState<number>(0);
  const [settlementTouched, setSettlementTouched] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [inventoryAction, setInventoryAction] = useState<InventoryAction>('write_off');
  const [receiptImages, setReceiptImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const getInputStyle = (field: string, hasError: boolean): React.CSSProperties => {
    if (focused === field) return focusInput;
    if (hasError) return errorInput;
    return baseInput;
  };

  const auth = useAuth();
  const mockAuth = useMockAuth();
  const reporterUserId = incident?.reportedByUserId ?? auth.user?.id;
  const userDisplayNames = useUserDisplayNames(reporterUserId != null ? [reporterUserId] : []);
  /** Prefer known display names; avoid exposing opaque ids in the UI. */
  const reportedByDisplay = (() => {
    const uid = incident?.reportedByUserId ?? auth.user?.id;
    if (uid != null) {
      const idStr = String(uid).trim();
      if (idStr) {
        const fromAuth =
          auth.user && String(auth.user.id) === idStr
            ? (auth.userProfile?.fullname ?? [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ').trim())
            : null;
        if (fromAuth) return fromAuth;

        const fromMap = userDisplayNames[idStr]?.trim();
        if (fromMap) return fromMap;
      }
    }

    const fromIncidentName =
      normalizeKnownName(incident?.reportedByName) ??
      normalizeKnownName(incident?.reportedBy);
    if (fromIncidentName) return fromIncidentName;

    if (uid == null) return '—';
    const idStr = String(uid).trim();
    if (!idStr || idStr === '—') return 'Unknown user';
    return looksLikeOpaqueUserId(idStr) ? 'Unknown user' : idStr;
  })();
  const { error, success } = useToast();
  const productIdsForNames = incident?.items?.map((i) => i.productId).filter(Boolean) ?? [];
  const productNamesFromApi = useProductNames(productIdsForNames);

  const warehouses = inventoryWarehouseDirectory.filter((w) => isWarehouseActive(w));
  const unitOptions = inventoryUnits.map((u) => ({ value: u.id, label: u.name }));

  const getProductName = (productId: string) =>
    inventoryItems.find((p) => p.id === productId)?.name ??
    productNamesFromApi[productId] ??
    `Product #${productId}`;

  /** Build POST description: first line = "Write off - reason" or "Record only - reason"; then item lines. API has no inventoryAction field; action is in description. */
  const buildDescription = (reasonText: string, items: LineItem[], action: InventoryAction): string => {
    const actionLabel = getInventoryActionDescriptionLabel(action);
    const reason = reasonText.trim();
    const firstLine = reason ? `${actionLabel} - ${reason}` : actionLabel;
    const valid = items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (valid.length === 0) return firstLine;
    const itemLines = valid.map((i) => `${getProductName(i.productId)} — qty: ${i.quantity}, price: ${i.itemCost ?? 0}`);
    return `${firstLine}\n${itemLines.join('\n')}`;
  };

  /** Parse description line 2+ into items; used when API returns empty incident.items but description has item lines. */
  const parseDescriptionToLineItems = (description: string | null | undefined): LineItem[] => {
    const text = (description ?? '').trim();
    if (!text) return [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];
    const itemLines = lines.slice(1);
    const result: LineItem[] = [];
    for (let i = 0; i < itemLines.length; i++) {
      const line = itemLines[i];
      const m = line.match(/^(.*?)\s+[—–-]\s+qty:\s*([0-9,]+(?:\.[0-9]+)?)\s*,\s*price:\s*([0-9,]+(?:\.[0-9]+)?)\s*$/i);
      if (m) {
        const name = (m[1] ?? '').trim();
        const q = Number((m[2] ?? '').replace(/,/g, ''));
        const p = Number((m[3] ?? '').replace(/,/g, ''));
        const productId = inventoryItems.find((p) => p.name === name)?.id ?? '';
        result.push({
          tempId: `parsed-${i}-${Date.now()}`,
          productId,
          quantity: Number.isFinite(q) ? q : 0,
          itemCost: Number.isFinite(p) ? p : 0,
          displayName: name || undefined,
        });
      }
    }
    return result;
  };

  const itemsSum = lineItems.reduce((s, i) => s + i.quantity * (i.itemCost ?? 0), 0);
  const totalCost = writeOffType === 'unit' ? assignedCharge + itemsSum : itemsSum;

  // Create mode: default settlement based on type so fields don't show as 0.
  // Unit → fully charged to guest. Warehouse → fully absorbed.
  useEffect(() => {
    if (isEdit) return;
    if (settlementTouched) return;

    const cost = Math.max(0, totalCost);
    const isUnitSelected = writeOffType === 'unit' && Boolean(unitId);
    const isWarehouseSelected = writeOffType === 'warehouse' && Boolean(warehouseId);

    if (isUnitSelected) {
      setStatus('open');
      setChargedToGuest(cost);
      setAbsorbedAmount(0);
      return;
    }
    if (isWarehouseSelected) {
      setStatus('open');
      setAbsorbedAmount(cost);
      setChargedToGuest(0);
      return;
    }

    setStatus('open');
    setAbsorbedAmount(0);
    setChargedToGuest(0);
  }, [isEdit, settlementTouched, totalCost, unitId, warehouseId, writeOffType]);

  // If user switches between unit/warehouse, allow defaults to re-apply.
  useEffect(() => {
    if (isEdit) return;
    setSettlementTouched(false);
  }, [isEdit, writeOffType, unitId, warehouseId]);

  const errors = {
    warehouse: writeOffType === 'warehouse' && !warehouseId && !isEdit ? 'Please select a warehouse' : '',
    unit: writeOffType === 'unit' && !unitId && !isEdit ? 'Please select a unit' : '',
    reportDate: !reportDate ? 'Report date is required' : '',
    reason: !buildDescription(reason, lineItems, inventoryAction).trim() ? 'Add a reason or at least one item' : '',
  };
  const isValid = Object.values(errors).every((e) => !e);
  const showError = (field: keyof typeof errors) =>
    (touched[field] || submitAttempted) && errors[field] ? errors[field] : '';

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
      const desc = incident.description ?? '';
      setDescription(desc);
      setReason(getReasonFromDescriptionFirstLine(incident.description));
      setResolutionNotes(incident.resolutionNotes ?? '');
      setInventoryAction(parseInventoryActionFromDescription(incident.description));
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
      const items: LineItem[] =
        rawItems.length > 0
          ? rawItems.map((it, i) => ({
              tempId: it.id ?? `line-${i}-${Date.now()}`,
              productId: it.productId,
              quantity: it.quantity,
              itemCost: it.itemCost,
            }))
          : parseDescriptionToLineItems(incident.description);
      setLineItems(items);
      const assigned = (incident as { assignedCharge?: number | null }).assignedCharge;
      setAssignedCharge(assigned != null ? Number(assigned) : 0);
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
    setSubmitAttempted(true);
    if (!isValid && !isEdit) return;

    if (isEdit && incident) {
      const prevStatus = normalizeDamageStatus(incident.status);
      const prevAbsorbed = incident.absorbedAmount ?? 0;
      const prevCharged = incident.chargedToGuest ?? 0;
      const noChanges =
        reportDate === (incident.reportDate ?? incident.reportedAt ?? '') &&
        buildDescription(reason, lineItems, inventoryAction).trim() === (incident.description ?? '').trim() &&
        status === prevStatus &&
        absorbedAmount === prevAbsorbed &&
        chargedToGuest === prevCharged &&
        (resolutionNotes.trim() || '') === (incident.resolutionNotes ?? '') &&
        inventoryAction === parseInventoryActionFromDescription(incident.description) &&
        assignedCharge === ((incident as { assignedCharge?: number | null }).assignedCharge ?? 0) &&
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
        const rawCostFromItems = (incident.items ?? []).reduce((sum, it) => sum + ((it.itemCost ?? 0) * (it.quantity ?? 0)), 0);
        const unitCostForUpdate = writeOffType === 'unit' && assignedCharge >= 0
          ? (inventoryAction === 'write_off' ? assignedCharge + rawCostFromItems : assignedCharge)
          : undefined;
        const updatePayload = {
          reportDate,
          description: buildDescription(reason, lineItems, inventoryAction).trim() || undefined,
          status,
          absorbedAmount: canEdit ? Math.max(0, absorbedAmount) : 0,
          chargedToGuest: canEdit ? Math.max(0, chargedToGuest) : 0,
          resolutionNotes: resolutionNotes.trim() || undefined,
          assignedCharge: writeOffType === 'unit' ? (assignedCharge > 0 ? assignedCharge : null) : undefined,
          ...(unitCostForUpdate != null && { cost: unitCostForUpdate }),
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
        const isWarehouse = writeOffType === 'warehouse' && warehouseId;
        const reporterUserId =
          auth.user?.id != null && String(auth.user.id).trim() !== ''
            ? String(auth.user.id).trim()
            : undefined;
        const reporterDisplayName =
          auth.userProfile?.fullname?.trim() ||
          [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ').trim() ||
          undefined;
        const reporterEmail =
          auth.user?.email != null && String(auth.user.email).trim() !== ''
            ? String(auth.user.email).trim()
            : undefined;
        if (!reporterUserId) {
          error('You must be logged in to create a damage report.');
          return;
        }
        const reportedAtIso = getNowIso();
        const validLineItems = lineItems.filter((i) => i.productId && Number(i.quantity) > 0);
        const itemsSum = validLineItems.reduce((s, i) => s + (i.quantity * (i.itemCost ?? 0)), 0);
        const cost = isUnitWriteOff ? assignedCharge + itemsSum : isWarehouse ? itemsSum : 0;
        // Settlement defaults: unit → fully charged to guest; warehouse → fully absorbed
        const initialChargedToGuest = isUnitWriteOff ? cost : 0;
        const initialAbsorbedAmount = isWarehouse ? cost : 0;
        const payload: CreateDamageIncidentPayload = {
          description: buildDescription(reason, validLineItems, inventoryAction).trim(),
          reportedAt: reportedAtIso,
          reportedByUserId: reporterUserId,
          reportedByName: reporterDisplayName,
          reportedByEmail: reporterEmail,
          status,
          cost,
          absorbedAmount: initialAbsorbedAmount,
          chargedToGuest: initialChargedToGuest,
          ...(isUnitWriteOff ? { assignedCharge: assignedCharge >= 0 ? assignedCharge : null } : {}),
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

  const invalidCount = Object.values(errors).filter(Boolean).length;

  return createPortal(
    <>
      <style>{`
        @keyframes sectionIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes errorShake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-4px); }
          40%,80% { transform: translateX(4px); }
        }
        .error-shake { animation: errorShake 0.35s ease; }
      `}</style>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11, 31, 31, 0.5)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#f5f7f7',
            borderRadius: 22,
            width: 'min(660px, 92vw)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
            transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            fontFamily: 'Poppins',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0b5858 0%, #05807e 60%, #059f9c 100%)',
              padding: '22px 28px 18px',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', right: 40, bottom: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
            <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 5, fontFamily: 'Poppins' }}>
                {isEdit ? 'EDIT DAMAGE REPORT' : 'CREATE DAMAGE REPORT'}
              </div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', fontFamily: 'Poppins' }}>
                  {isEdit ? `Report #${incident?.id ?? ''}` : 'Record write-off'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontFamily: 'Poppins' }}>
                  {isEdit ? 'Update the details below and save' : 'Fill in the sections below to log a warehouse or unit write-off'}
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                  width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff',
                  cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.26)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            >
              ×
            </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Section 1 — Location */}
            <Section>
              <SectionHeader
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.9" />
                    <circle cx="12" cy="9" r="2.5" fill="#05807e" />
                  </svg>
                }
                title="Location"
                subtitle="Where did the damage occur?"
              />
              <div style={{ marginBottom: 18 }}>
                <FieldLabel label="Write-off type" required />
                <div style={{ display: 'flex', gap: 8 }}>
                      {(['warehouse', 'unit'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setWriteOffType(t);
                            setUnitId('');
                            setBookingId('');
                            setWarehouseId('');
                        touch('warehouse');
                        touch('unit');
                      }}
                      style={{
                        flex: 1, padding: '11px 16px', borderRadius: 12, border: `1.5px solid ${writeOffType === t ? '#05807e' : '#e5e7eb'}`,
                        background: writeOffType === t ? 'linear-gradient(135deg, #e6f4f4, #d0eded)' : '#fff',
                        color: writeOffType === t ? '#0b5858' : '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'Poppins',
                        boxShadow: writeOffType === t ? '0 2px 8px rgba(5,128,126,0.18)' : 'none',
                      }}
                    >
                      {t === 'warehouse' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18M5 21V9l8-4 8 4v12M9 21v-6h6v6M9 9h6" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path d="M9 22V12h6v10" />
                        </svg>
                      )}
                      {t === 'warehouse' ? 'Warehouse' : 'Unit'}
                        </button>
                      ))}
                    </div>
                </div>
                {writeOffType === 'warehouse' && (
                <div style={{ marginBottom: 18 }}>
                  <FieldLabel label="Warehouse" required />
                      <InventoryDropdown
                        value={warehouseId}
                    onChange={(v) => { setWarehouseId(v); touch('warehouse'); }}
                    options={[{ value: '', label: 'Select warehouse…' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]}
                        placeholder="Select warehouse…"
                        placeholderWhen=""
                    fullWidth
                        align="left"
                        backdropZIndexClass="z-[10005]"
                        menuZIndexClass="z-[10010]"
                      />
                  <FieldError msg={showError('warehouse')} />
                  </div>
                )}
                {writeOffType === 'unit' && (
                  <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                    <div>
                      <FieldLabel label="Unit" required />
                        <InventoryDropdown
                          value={unitId}
                        onChange={(v) => { setUnitId(v); touch('unit'); }}
                        options={[{ value: '', label: 'Select unit…' }, ...unitOptions]}
                          placeholder="Select unit…"
                          placeholderWhen=""
                        fullWidth
                          align="left"
                          backdropZIndexClass="z-[10005]"
                          menuZIndexClass="z-[10010]"
                        />
                      <FieldError msg={showError('unit')} />
                    </div>
                    <div>
                      <FieldLabel label="Booking" hint="Optional" />
                        <InventoryDropdown
                          value={bookingId}
                          onChange={setBookingId}
                          options={[
                          { value: '', label: !unitId ? 'Select unit first' : isBookingLoading ? 'Loading…' : 'No booking' },
                          ...bookingOptions.map((b) => ({ value: b.id, label: `${b.code} — ${b.guestName}` })),
                        ]}
                        placeholder="Select booking…"
                          placeholderWhen=""
                        fullWidth
                          align="left"
                          backdropZIndexClass="z-[10005]"
                          menuZIndexClass="z-[10010]"
                        />
                    </div>
                  </div>
                  {unitId && (
                    <div style={{ marginBottom: 18 }}>
                      <FieldLabel label="Assigned charge (PHP)" hint="Guest-facing cost beyond items" />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={assignedCharge}
                        disabled
                        placeholder="0"
              style={{
                          ...getInputStyle('assignedCharge', false),
                    background: '#f8fbfb',
                          color: '#9ca3af',
                          cursor: 'not-allowed',
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel label="Reported by" />
                  <div style={{ ...baseInput, background: '#f8fbfb', color: '#9ca3af', cursor: 'default' }}>
                  {reportedByDisplay}
                </div>
                </div>
                <div>
                  <FieldLabel label="Report date" required />
                <SingleDatePicker
                  value={reportDate}
                    onChange={(v) => { setReportDate(v); touch('reportDate'); }}
                  placeholder="Select date"
                  calendarZIndex={10020}
                  className="w-full"
                />
                  <FieldError msg={showError('reportDate')} />
            </div>
            </div>
            </Section>

            <Divider />

            {/* Section 2 — Items */}
            <Section>
              <SectionHeader
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" fill="white" fillOpacity="0.9" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" />
                  </svg>
                }
                title="Damage Items"
                subtitle="What was damaged? Quantities and estimated costs."
              />
              <div style={{ marginBottom: 18 }}>
                <FieldLabel label="Inventory action" required />
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { v: 'write_off', label: 'Write off', sub: 'Deducts from stock', icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4.5l-5 5M15 15l-2 2a2 2 0 01-2.8 0l-4-4a2 2 0 010-2.8l2-2" />
                        <path d="M9 9l2 2M14.5 4.5a2 2 0 012.8 0l2 2a2 2 0 010 2.8l-5 5" />
                      </svg>
                    )},
                    { v: 'record_only', label: 'Record only', sub: 'No stock deduction', icon: (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                      </svg>
                    )},
                  ].map(({ v, label, sub, icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInventoryAction(v as InventoryAction)}
              style={{
                        flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${inventoryAction === v ? '#05807e' : '#e5e7eb'}`,
                        background: inventoryAction === v ? 'linear-gradient(135deg, #e6f4f4, #d0eded)' : '#fff',
                        color: inventoryAction === v ? '#0b5858' : '#6b7280', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                        fontFamily: 'Poppins', textAlign: 'left', boxShadow: inventoryAction === v ? '0 2px 8px rgba(5,128,126,0.15)' : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{icon}{label}</div>
                                            <div style={{ fontWeight: 400, fontSize: 10, color: inventoryAction === v ? '#05807e' : '#9ca3af', marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              {(writeOffType === 'warehouse' || (writeOffType === 'unit' && unitId)) && (
                <div style={{ borderRadius: 14, border: '1.5px solid #cce8e8', overflow: 'hidden', boxShadow: '0 2px 8px rgba(5,128,126,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #0b5858, #05807e)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontFamily: 'Poppins' }}>Product</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', width: 80, fontFamily: 'Poppins' }}>Qty</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', width: 110, fontFamily: 'Poppins' }}>Price (PHP)</th>
                        {!isEdit && <th style={{ width: 36 }} />}
                      </tr>
                    </thead>
                    <tbody>
                      {(isEdit ? lineItems : lineItems.length ? lineItems : [{ tempId: 'new', productId: '', quantity: 0, itemCost: 0 }]).map((item, idx) => (
                        <tr key={item.tempId} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafeff', borderTop: idx > 0 ? '1px solid #f0f9f9' : 'none' }}>
                          <td style={{ padding: '9px 14px' }}>
                            {isEdit ? (
                              <span style={{ fontWeight: 600, color: '#1f2937', fontFamily: 'Poppins' }}>{item.displayName ?? getProductName(item.productId)}</span>
                            ) : (
                              <InventoryDropdown
                                value={item.productId}
                                onChange={(id) => {
                                  const p = inventoryItems.find((x) => x.id === id);
                                  const next = [...lineItems];
                                  if (!next[idx]) next[idx] = { ...item, productId: id, itemCost: p?.unitCost ?? 0 };
                                  else next[idx] = { ...next[idx], productId: id, itemCost: p?.unitCost ?? 0 };
                                  setLineItems(next.length ? next : [{ tempId: 'new', productId: id, quantity: 0, itemCost: p?.unitCost ?? 0 }]);
                                }}
                                options={[{ value: '', label: 'Select product…' }, ...inventoryItems.map((p) => ({ value: p.id, label: p.name }))]}
                                placeholder="Select product…"
                                placeholderWhen=""
                                fullWidth
                                align="left"
                                backdropZIndexClass="z-[10015]"
                                menuZIndexClass="z-[10020]"
                              />
                            )}
                          </td>
                          <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                            {isEdit ? (
                              <span style={{ fontWeight: 600, color: '#1f2937', fontFamily: 'Poppins' }}>{item.quantity}</span>
                            ) : (
                <input
                  type="number"
                  min={0}
                                value={item.quantity || ''}
                  onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  const next = [...lineItems];
                                  const row = next[idx] ?? { ...item };
                                  row.quantity = Number.isNaN(v) ? 0 : Math.max(0, v);
                                  if (!next[idx]) next[idx] = row;
                                  setLineItems(next);
                                }}
                                style={{ width: 56, padding: '7px 8px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 12, textAlign: 'right', fontFamily: 'Poppins', background: '#fff', outline: 'none', color: '#1f2937' }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                            {isEdit ? (
                              <span style={{ fontWeight: 600, color: '#1f2937', fontFamily: 'Poppins' }}>{item.itemCost != null ? item.itemCost.toLocaleString() : '—'}</span>
                            ) : (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                                value={item.itemCost ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                                  const next = [...lineItems];
                                  const row = next[idx] ?? { ...item };
                                  row.itemCost = Number.isNaN(v) ? 0 : Math.max(0, v);
                                  if (!next[idx]) next[idx] = row;
                                  setLineItems(next);
                                }}
                                style={{ width: 88, padding: '7px 8px', borderRadius: 9, border: '1.5px solid #e5e7eb', fontSize: 12, textAlign: 'right', fontFamily: 'Poppins', background: '#fff', outline: 'none', color: '#1f2937' }}
                              />
                            )}
                          </td>
                          {!isEdit && (
                            <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => setLineItems((p) => p.filter((_, i) => i !== idx))}
                                style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff0f0'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'transparent'; }}
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!isEdit && (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid #e6f4f4', background: '#f0f9f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => setLineItems((p) => {
                          const base = p.length ? p : [{ tempId: 'new', productId: '', quantity: 0, itemCost: 0 }];
                          return [...base, { tempId: `row-${Date.now()}`, productId: '', quantity: 0, itemCost: 0 }];
                        })}
                        style={{ fontSize: 12, fontWeight: 700, color: '#05807e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Poppins' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#0b5858')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#05807e')}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add item
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0b5858', fontFamily: 'Poppins' }}>
                        PHP {itemsSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
            </div>
                  )}
                </div>
              )}
            </Section>

            <Divider />

            {/* Section 3 — Description */}
            <Section>
              <SectionHeader
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="4" width="16" height="16" rx="3" fill="white" fillOpacity="0.9" />
                    <path d="M8 9h8M8 13h5" stroke="#05807e" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
                title="Description"
                subtitle="Provide a brief reason for the damage."
              />
              <div>
                <FieldLabel label="Reason" required hint="Brief summary, first line of report" />
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => touch('reason')}
                  onFocus={() => setFocused('reason')}
                  placeholder="e.g. Guest damage to room fixtures — broken mirror and towel rail"
                  rows={3}
                  style={{ ...getInputStyle('reason', Boolean(showError('reason'))), resize: 'vertical', minHeight: 72 }}
                />
                <FieldError msg={showError('reason')} />
              </div>
            </Section>

            <Divider />

            {/* Section 4 — Settlement */}
            <Section>
              <SectionHeader
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="white" fillOpacity="0.9" />
                    <path d="M12 7v2m0 6v2M9.5 10.5a2.5 2.5 0 015 0c0 2.5-5 2.5-5 5a2.5 2.5 0 005 0" stroke="#05807e" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
                title="Settlement"
                subtitle="Financial resolution of this incident."
              />
            {isEdit && (
                <div style={{ marginBottom: 18 }}>
                  <FieldLabel label="Status" />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setStatus(opt.value);
                          if (opt.value === 'open') {
                            setAbsorbedAmount(0);
                            setChargedToGuest(0);
                          }
                        }}
                        style={{
                          padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${status === opt.value ? opt.dot : '#e5e7eb'}`,
                          background: status === opt.value ? `${opt.dot}18` : '#fff', color: status === opt.value ? opt.dot : '#9ca3af',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', fontFamily: 'Poppins',
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === opt.value ? opt.dot : '#d1d5db', flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
              </div>
            )}
              <div style={{ display: 'grid', gridTemplateColumns: writeOffType === 'warehouse' ? '1fr' : '1fr 1fr', gap: 12, marginBottom: isEdit && isResolvedStatus(status) ? 18 : 0 }}>
                <div>
                  <FieldLabel label="Absorbed (PHP)" hint={status === 'open' ? '0 until resolved' : undefined} />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={absorbedAmount}
                    onChange={(e) => {
                      if (status === 'open') return;
                      setSettlementTouched(true);
                      const v = parseFloat(e.target.value);
                      setAbsorbedAmount(Number.isNaN(v) ? 0 : Math.max(0, v));
                    }}
                    disabled={status === 'open'}
                    placeholder="0"
                    style={{ ...baseInput, ...(status === 'open' ? { background: '#f8fbfb', color: '#c4cdd6', cursor: 'not-allowed' } : {}) }}
                    onFocus={() => setFocused('absorbed')}
                    onBlur={() => setFocused(null)}
                  />
                </div>
                {writeOffType !== 'warehouse' && (
                  <div>
                    <FieldLabel label="Charged to guest (PHP)" hint={status === 'open' ? '0 until resolved' : undefined} />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={chargedToGuest}
                      onChange={(e) => {
                        if (status === 'open') return;
                        setSettlementTouched(true);
                        const v = parseFloat(e.target.value);
                        const charged = Number.isNaN(v) ? 0 : Math.max(0, v);
                        setChargedToGuest(charged);
                        if (incident) {
                          const rc = incident.cost ?? assignedCharge + (incident.items ?? []).reduce((s, i) => s + (i.itemCost ?? 0) * (i.quantity ?? 0), 0);
                          setAbsorbedAmount(Math.max(0, rc - charged));
                        }
                      }}
                      disabled={status === 'open'}
                      placeholder="0"
                      style={{ ...baseInput, ...(status === 'open' ? { background: '#f8fbfb', color: '#c4cdd6', cursor: 'not-allowed' } : {}) }}
                      onFocus={() => setFocused('charged')}
                      onBlur={() => setFocused(null)}
                    />
                  </div>
                )}
              </div>
              {isEdit && isResolvedStatus(status) && (
                <div>
                  <FieldLabel label="Resolution notes" />
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Items written off via stock-out; cost split 50/50 guest/property"
                    rows={3}
                    style={{ ...baseInput, resize: 'vertical', minHeight: 76 }}
                    onFocus={() => setFocused('notes')}
                    onBlur={() => setFocused(null)}
                  />
              </div>
            )}
            </Section>

            <Divider />

            {/* Section 5 — Evidence */}
            <Section>
              <SectionHeader
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="6" width="20" height="15" rx="3" fill="white" fillOpacity="0.9" />
                    <circle cx="12" cy="13.5" r="3" stroke="#05807e" strokeWidth="1.5" />
                    <path d="M9 6l1.5-2h3L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
                  </svg>
                }
                title="Evidence Photos"
                subtitle="Optional — upload damage documentation."
              />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                  width: '100%', padding: '22px', borderRadius: 14, border: '2px dashed #c4dede', background: 'linear-gradient(135deg, #f8fbfb, #f0f9f9)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s', fontFamily: 'Poppins',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#05807e'; e.currentTarget.style.background = 'linear-gradient(135deg, #e6f4f4, #d4eded)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#c4dede'; e.currentTarget.style.background = 'linear-gradient(135deg, #f8fbfb, #f0f9f9)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0b5858, #05807e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(5,128,126,0.28)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5m0 0L7 8m5-5v12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0b5858' }}>Click to upload photos</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>PNG, JPG · max 2MB each · up to 5 files</div>
                  </button>
                  {imagePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginTop: 14 }}>
                  {imagePreviews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb', aspectRatio: '1', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <button
                            type="button"
                        onClick={() => removeImage(i)}
                        style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.92)', color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              <div style={{ height: 8 }} />
            </Section>
            </div>

          {/* Footer */}
          <div style={{ flexShrink: 0, borderTop: '1px solid #e8f0f0', background: '#fff', boxShadow: '0 -4px 24px rgba(11,88,88,0.08)' }}>
            <div style={{ background: 'linear-gradient(90deg, #0b5858, #05807e)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Poppins' }}>Items</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Poppins' }}>PHP {itemsSum.toLocaleString()}</div>
              </div>
                {writeOffType === 'unit' && assignedCharge > 0 && (
                  <>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Poppins' }}>Assigned</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Poppins' }}>PHP {assignedCharge.toLocaleString()}</div>
              </div>
                  </>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Poppins' }}>Total cost</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'Poppins' }}>PHP {totalCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                </div>
                </div>
            <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                {submitAttempted && !isValid ? (
                  <div className="error-shake" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#dc2626', fontFamily: 'Poppins', fontWeight: 600 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{invalidCount}</div>
                    {invalidCount === 1 ? '1 field needs attention' : `${invalidCount} fields need attention`}
              </div>
                ) : submitAttempted && isValid ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#10b981', fontFamily: 'Poppins', fontWeight: 600 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    All fields look good
            </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Poppins', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Fields marked
                    <svg width="10" height="10" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M4 1v6M1.5 2.5l5 3M6.5 2.5l-5 3" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    are required
          </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleClose}
                  style={{ padding: '10px 22px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Poppins' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
                  disabled={isSubmitting}
              style={{
                    padding: '10px 28px', borderRadius: 12, border: 'none',
                    background: submitAttempted && !isValid && !isEdit ? '#e5e7eb' : 'linear-gradient(135deg, #0b5858, #05807e)',
                    color: submitAttempted && !isValid && !isEdit ? '#9ca3af' : '#fff', fontSize: 13, fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer', transition: 'all 0.15s', fontFamily: 'Poppins',
                    boxShadow: submitAttempted && !isValid && !isEdit ? 'none' : '0 4px 16px rgba(11,88,88,0.3)',
                    letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8, opacity: isSubmitting ? 0.75 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isSubmitting && (isEdit || isValid)) e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = isSubmitting ? '0.75' : '1'; }}
                >
                  {isSubmitting ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Saving…
                    </>
                  ) : isEdit ? 'Update report' : 'Create report →'}
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>,
    document.body
  );
}
