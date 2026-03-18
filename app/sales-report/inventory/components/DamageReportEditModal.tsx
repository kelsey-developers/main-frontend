'use client';

/**
 * DamageReportEditModal — Focused edit modal.
 *
 * Only two things are editable:
 *  1. Status + charged / absorbed amounts (+ resolution notes when resolved)
 *  2. Inventory action (write-off vs record only)
 *
 * Everything else (items, dates, reason, location) is displayed as
 * read-only context so the user knows *what* they're resolving.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useProductNames } from '../hooks/useProductNames';
import { getNowIso } from '@/lib/dateUtils';
import {
  updateDamageIncident,
  uploadDamageIncidentAttachments,
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
import {
  inventoryItems,
  inventoryWarehouseDirectory,
  inventoryUnits,
} from '../lib/inventoryDataStore';

type InventoryAction = 'write_off' | 'record_only';

export interface DamageReportEditModalProps {
  incident: DamageIncident;
  onClose: () => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS: {
  value: DamageIncidentStatus;
  label: string;
  dot: string;
  bg: string;
  activeBorder: string;
  color: string;
  hint: string;
}[] = [
  {
    value: 'open',
    label: 'Open',
    dot: '#9ca3af',
    bg: '#f9fafb',
    activeBorder: '#9ca3af',
    color: '#374151',
    hint: 'Active, not yet resolved',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    dot: '#10b981',
    bg: '#ecfdf5',
    activeBorder: '#10b981',
    color: '#065f46',
    hint: 'Closed; settlement from charged/absorbed amounts',
  },
];

function fmtDate(raw: string | null | undefined) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(val: number | null | undefined) {
  if (val == null) return '—';
  return `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Parse item lines from the damage report description.
 * Pushed format (from DamageReportModal buildDescription):
 *   Line 1: reason (e.g. "Guest damage to mirror")
 *   Line 2+: "<ProductName> — qty: <number>, price: <number>"
 * Example:
 *   Guest damage to mirror
 *   Bath Towel — qty: 2, price: 350
 *   Mirror — qty: 1, price: 1200
 * We accept em dash (—), en dash (–), or hyphen (-) before "qty:".
 * Numbers may include commas (e.g. 1,200); we strip them when parsing.
 */
function parseItemsFromDescription(description: string | null | undefined): Array<{
  name: string;
  quantity: number | null;
  unitPrice: number | null;
}> {
  const text = (description ?? '').trim();
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const itemLines = lines.slice(1);

  const parsed: Array<{ name: string; quantity: number | null; unitPrice: number | null }> = [];
  for (const line of itemLines) {
    // Match: "ProductName — qty: 2, price: 350" (dash can be —, –, or -)
    const m = line.match(/^(.*?)\s+[—–-]\s+qty:\s*([0-9,]+(?:\.[0-9]+)?)\s*,\s*price:\s*([0-9,]+(?:\.[0-9]+)?)\s*$/i);
    if (m) {
      const name = (m[1] ?? '').trim();
      const q = Number((m[2] ?? '').replace(/,/g, ''));
      const p = Number((m[3] ?? '').replace(/,/g, ''));
      parsed.push({
        name: name || line,
        quantity: Number.isFinite(q) ? q : null,
        unitPrice: Number.isFinite(p) ? p : null,
      });
      continue;
    }
    parsed.push({ name: line, quantity: null, unitPrice: null });
  }
  return parsed;
}

function IconUnit({ size = 14, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2v-9.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9.5 22v-7a2.5 2.5 0 015 0v7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconWarehouse({ size = 14, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 9l9-5 9 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 22v-6h10v6" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 12h.01M12 12h.01M17 12h.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconScissors({ size = 14, color = '#0b5858' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a3 3 0 106 0 3 3 0 00-6 0zM4 17a3 3 0 106 0 3 3 0 00-6 0z"
        stroke={color}
        strokeWidth="2"
      />
      <path d="M9.5 8.5l10 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 15.5l4.2-2.52" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M14.5 12l5-3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconNote({ size = 14, color = '#0b5858' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M15 3v5h5" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 12h8M8 16h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconInfo({ size = 18, color = '#9ca3af' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function DamageReportEditModal({ incident, onClose, onSuccess }: DamageReportEditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const origStatus = normalizeDamageStatus(incident.status);
  const origAbsorbed = origStatus === 'open' ? 0 : (incident.absorbedAmount ?? 0);
  const origCharged = origStatus === 'open' ? 0 : (incident.chargedToGuest ?? 0);
  const origAction: InventoryAction = parseInventoryActionFromDescription(incident.description);
  const origNotes = incident.resolutionNotes ?? '';

  const [status, setStatus] = useState<DamageIncidentStatus>(origStatus);
  const [absorbedAmount, setAbsorbedAmount] = useState(origAbsorbed);
  const [chargedToGuest, setChargedToGuest] = useState(origCharged);
  const [chargeToGuestChecked, setChargeToGuestChecked] = useState(() =>
    Boolean(incident.unitId) && origCharged > 0
  );
  const [absorbedChecked, setAbsorbedChecked] = useState(() =>
    incident.unitId ? origAbsorbed > 0 : true
  );
  const [resolutionNotes, setResolutionNotes] = useState(origNotes);
  const [inventoryAction, setInventoryAction] = useState<InventoryAction>(origAction);
  const [receiptImages, setReceiptImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = useAuth();
  const { error, success } = useToast();

  const rawItems = incident.items ?? [];
  const productNamesFromApi = useProductNames(rawItems.map((i) => i.productId).filter(Boolean));
  const getProductName = (id: string) =>
    inventoryItems.find((p) => p.id === id)?.name ?? productNamesFromApi[id] ?? `Product #${id}`;

  const descriptionItems = parseItemsFromDescription(incident.description);

  const locationType: 'unit' | 'warehouse' = incident.unitId ? 'unit' : 'warehouse';
  const isUnit = Boolean(incident.unitId);
  const isWarehouse = Boolean(incident.warehouseId);
  const locationLabel =
    inventoryWarehouseDirectory.find((w) => w.id === incident.warehouseId)?.name ??
    inventoryUnits.find((u) => u.id === incident.unitId)?.name ??
    incident.warehouseId ??
    incident.unitId ??
    null;

  const assignedCharge = (incident as { assignedCharge?: number | null }).assignedCharge ?? 0;
  const useDescriptionForItems = descriptionItems.length > 0;
  const itemsSum = useDescriptionForItems
    ? descriptionItems.reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0)
    : rawItems.reduce((s, i) => s + (i.quantity ?? 0) * (i.itemCost ?? 0), 0);
  const totalCost = incident.cost ?? assignedCharge + itemsSum;

  const isDirty =
    status !== origStatus ||
    absorbedAmount !== origAbsorbed ||
    chargedToGuest !== origCharged ||
    resolutionNotes.trim() !== origNotes.trim() ||
    inventoryAction !== origAction ||
    receiptImages.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
        setTimeout(onClose, 260);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const isOpen = status === 'open';

  const setOpen = () => {
    setStatus('open');
    setAbsorbedAmount(0);
    setChargedToGuest(0);
  };

  const setResolved = () => {
    setStatus('resolved');
    if (isWarehouse) {
      setChargedToGuest(0);
      setAbsorbedAmount(totalCost);
    } else if (isUnit) {
      if (!chargeToGuestChecked && !absorbedChecked) {
        setChargeToGuestChecked(true);
        setAbsorbedChecked(true);
        const half = totalCost / 2;
        setChargedToGuest(half);
        setAbsorbedAmount(totalCost - half);
      } else if (chargeToGuestChecked && absorbedChecked) {
        const half = totalCost / 2;
        setChargedToGuest(half);
        setAbsorbedAmount(totalCost - half);
      } else if (chargeToGuestChecked) {
        setChargedToGuest(totalCost);
        setAbsorbedAmount(0);
      } else {
        setAbsorbedAmount(totalCost);
        setChargedToGuest(0);
      }
    }
  };

  const handleChargeToGuestToggle = () => {
    const next = !chargeToGuestChecked;
    setChargeToGuestChecked(next);
    setStatus('resolved');
    if (next && absorbedChecked) {
      const half = totalCost / 2;
      setChargedToGuest(half);
      setAbsorbedAmount(totalCost - half);
    } else if (next) {
      setChargedToGuest(totalCost);
      setAbsorbedAmount(0);
    } else if (absorbedChecked) {
      setChargedToGuest(0);
      setAbsorbedAmount(totalCost);
    } else {
      setAbsorbedChecked(true);
      setAbsorbedAmount(totalCost);
      setChargedToGuest(0);
    }
  };

  const handleAbsorbedToggle = () => {
    const next = !absorbedChecked;
    setAbsorbedChecked(next);
    setStatus('resolved');
    if (next && chargeToGuestChecked) {
      const half = totalCost / 2;
      setAbsorbedAmount(half);
      setChargedToGuest(totalCost - half);
    } else if (next) {
      setAbsorbedAmount(totalCost);
      setChargedToGuest(0);
    } else if (chargeToGuestChecked) {
      setAbsorbedAmount(0);
      setChargedToGuest(totalCost);
    } else {
      setChargeToGuestChecked(true);
      setChargedToGuest(totalCost);
      setAbsorbedAmount(0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxBytes = 2 * 1024 * 1024;
    const maxTotal = 8 * 1024 * 1024;
    const cur = receiptImages.reduce((s, f) => s + f.size, 0);
    const valid: File[] = [];
    let skipped = false;

    for (const f of files) {
      if (valid.length >= 5) break;
      if (
        f.size > maxBytes ||
        cur + valid.reduce((s, x) => s + x.size, 0) + f.size > maxTotal
      ) {
        skipped = true;
        continue;
      }
      valid.push(f);
    }

    if (skipped) error('Some images were skipped. Max 2MB/file, 8MB total, 5 files.');

    setReceiptImages((p) => [...p, ...valid]);
    valid.forEach((f) => {
      const r = new FileReader();
      r.onloadend = () => setImagePreviews((p) => [...p, r.result as string]);
      r.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setReceiptImages((p) => p.filter((_, idx) => idx !== i));
    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!isDirty) {
      error('No changes were made.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isSettling = isTransitioningToSettled(status, incident.status);
      const canEdit = canEditChargedAbsorbed(status);
      const rawCost = rawItems.reduce((s, it) => s + (it.itemCost ?? 0) * (it.quantity ?? 0), 0);
      const isUnit = Boolean(incident.unitId);
      const unitCostForUpdate =
        isUnit && assignedCharge >= 0
          ? inventoryAction === 'write_off'
            ? assignedCharge + rawCost
            : assignedCharge
          : undefined;

      const reasonFromFirst = getReasonFromDescriptionFirstLine(incident.description);
      const actionLabel = getInventoryActionDescriptionLabel(inventoryAction);
      const newFirstLine = reasonFromFirst ? `${actionLabel} - ${reasonFromFirst}` : actionLabel;
      const lines = (incident.description ?? '').trim().split('\n');
      const restOfLines = lines.slice(1).filter(Boolean);
      const newDescription = restOfLines.length > 0 ? `${newFirstLine}\n${restOfLines.join('\n')}` : newFirstLine;

      await updateDamageIncident(incident.id, {
        description: newDescription,
        status,
        absorbedAmount: canEdit ? Math.max(0, absorbedAmount) : 0,
        chargedToGuest: canEdit ? Math.max(0, chargedToGuest) : 0,
        resolutionNotes: resolutionNotes.trim() || undefined,
        ...(isUnit ? { assignedCharge: assignedCharge > 0 ? assignedCharge : null } : {}),
        ...(unitCostForUpdate != null && { cost: unitCostForUpdate }),
        ...(isSettling && {
          resolvedAt: getNowIso(),
          ...(auth?.user?.id != null && { resolvedByUserId: String(auth.user.id) }),
        }),
        ...(incident.warehouseId ? { warehouseId: incident.warehouseId } : {}),
        ...(incident.unitId
          ? { unitId: incident.unitId, bookingId: incident.bookingId ?? undefined }
          : {}),
      });

      if (receiptImages.length > 0) {
        try {
          await uploadDamageIncidentAttachments(incident.id, receiptImages);
        } catch {
          error('Report updated, but photo upload failed.');
        }
      }

      success('Damage report updated.');
      onSuccess?.();
      handleClose();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to update damage report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const selectedStatusCfg = STATUS_OPTIONS.find((s) => s.value === status)!;

  const inputStyle = (field: string, disabled?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 13px',
    borderRadius: 11,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: focused === field ? '#05807e' : '#e5e7eb',
    fontSize: 13,
    color: disabled ? '#c4cdd6' : '#1f2937',
    background: disabled ? '#f8f9fa' : '#fff',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'Poppins',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: focused === field && !disabled ? '0 0 0 3px rgba(5,128,126,0.1)' : 'none',
  });

  return createPortal(
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
          background: 'rgba(5, 20, 20, 0.55)',
          backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#f4f6f6',
            borderRadius: 22,
            width: 'min(580px, 92vw)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 28px 72px rgba(0,0,0,0.26), 0 0 0 1px rgba(0,0,0,0.06)',
            animation: visible ? 'modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both' : 'none',
            fontFamily: 'Poppins',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0b5858 0%, #05807e 60%, #059f9c 100%)',
              padding: '20px 22px 18px',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -18,
                top: -28,
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 55,
                bottom: -35,
                width: 85,
                height: 85,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: 'rgba(255,255,255,0.55)',
                      fontFamily: 'Poppins',
                    }}
                  >
                    DAMAGE REPORT
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#92400e',
                      background: '#fef3c7',
                      padding: '3px 10px',
                      borderRadius: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'Poppins',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#f59e0b',
                        display: 'inline-block',
                        animation: 'pulseDot 2s ease infinite',
                      }}
                    />
                    EDITING
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.14)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.26)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')
                  }
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  fontFamily: 'Poppins',
                  marginBottom: 12,
                  wordBreak: 'break-all',
                }}
              >
                {incident.id}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {locationLabel && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: 'rgba(255,255,255,0.13)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '3px 10px',
                      borderRadius: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'Poppins',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {locationType === 'unit' ? <IconUnit size={14} /> : <IconWarehouse size={14} />}
                    </span>
                    {locationLabel}
                  </span>
                )}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins' }}>
                  Reported {fmtDate(incident.reportDate ?? incident.reportedAt)}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins' }}>
                  ·
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins' }}>
                  {fmtMoney(totalCost)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div
              style={{
                margin: '12px 12px 0',
                padding: '14px 16px',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e8f0f0',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#9ca3af',
                  marginBottom: 10,
                  fontFamily: 'Poppins',
                }}
              >
                Report snapshot
              </div>

              {incident.description && (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#6b7280',
                      fontFamily: 'Poppins',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {incident.description.split('\n')[0]}
                  </div>
                </div>
              )}

              {(rawItems.length > 0 || descriptionItems.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(descriptionItems.length > 0
                    ? descriptionItems.map((it, i) => {
                        const subtotal =
                          it.quantity != null && it.unitPrice != null
                            ? it.quantity * it.unitPrice
                            : null;
                        return (
                          <div
                            key={`${it.name}-${i}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 0',
                              borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                              gap: 10,
                            }}
                          >
                            <span style={{ fontSize: 12, color: '#374151', fontFamily: 'Poppins', fontWeight: 500, minWidth: 0 }}>
                              <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {it.name}
                              </span>
                              {it.quantity != null && it.unitPrice != null && (
                                <span style={{ display: 'block', color: '#9ca3af', fontWeight: 400, marginTop: 1 }}>
                                  qty {it.quantity} · unit {fmtMoney(it.unitPrice)}
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', fontFamily: 'Poppins', flexShrink: 0 }}>
                              {subtotal != null ? fmtMoney(subtotal) : '—'}
                            </span>
                          </div>
                        );
                      })
                    : rawItems.map((item, i) => (
                        <div
                          key={item.id ?? i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '5px 0',
                            borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#374151', fontFamily: 'Poppins', fontWeight: 500 }}>
                            {getProductName(item.productId)}
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}> × {item.quantity ?? '?'}</span>
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', fontFamily: 'Poppins' }}>
                            {item.quantity != null && item.itemCost != null ? fmtMoney(item.quantity * item.itemCost) : '—'}
                          </span>
                        </div>
                      )))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1.5px solid #e8f0f0', marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Poppins' }}>
                      Total
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0b5858', fontFamily: 'Poppins' }}>
                      {fmtMoney(totalCost)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ margin: '8px 12px 0', background: '#fff', borderRadius: 14, border: '1px solid #e8f0f0', overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid #f0f5f5', background: '#fafcfc', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #0b5858, #05807e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0b5858', fontFamily: 'Poppins' }}>
                  Inventory action
                </span>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', gap: 8 }}>
                {([
                  { v: 'write_off', label: 'Write off', sub: 'Deducts from stock', icon: <IconScissors size={14} color="#0b5858" /> },
                  { v: 'record_only', label: 'Record only', sub: 'No stock deduction', icon: <IconNote size={14} color="#0b5858" /> },
                ] as const).map(({ v, label, sub, icon }) => {
                  const active = inventoryAction === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInventoryAction(v)}
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1.5px solid ${active ? '#05807e' : '#e5e7eb'}`,
                        background: active ? 'linear-gradient(135deg, #e6f4f4, #d0eded)' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        textAlign: 'left',
                        fontFamily: 'Poppins',
                        boxShadow: active ? '0 2px 10px rgba(5,128,126,0.16)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#0b5858' : '#6b7280', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
                        {label}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 400, color: active ? '#05807e' : '#9ca3af' }}>{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Status: Open | Resolved ───────────────────────────────────── */}
            <div style={{ margin: '8px 12px 0', background: '#fff', borderRadius: 14, border: '1px solid #e8f0f0', overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid #f0f5f5', background: '#fafcfc', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #0b5858, #05807e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" fill="white" fillOpacity="0.85" />
                    <path d="M12 8v4l2 2" stroke="#0b5858" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0b5858', fontFamily: 'Poppins' }}>
                  Status
                </span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={setOpen}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${isOpen ? '#9ca3af' : '#e5e7eb'}`,
                    background: isOpen ? '#f9fafb' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    fontFamily: 'Poppins',
                    boxShadow: isOpen ? '0 2px 10px rgba(156,163,175,0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isOpen ? '#374151' : '#6b7280' }}>Open</span>
                    {isOpen && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 15, lineHeight: 1.3 }}>Active, not yet resolved</div>
                </button>
                <button
                  type="button"
                  onClick={setResolved}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${!isOpen ? '#10b981' : '#e5e7eb'}`,
                    background: !isOpen ? '#ecfdf5' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    fontFamily: 'Poppins',
                    boxShadow: !isOpen ? '0 2px 10px rgba(16,185,129,0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: !isOpen ? '#065f46' : '#6b7280' }}>Resolved</span>
                    {!isOpen && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', flexShrink: 0 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 10, color: !isOpen ? '#065f46' : '#9ca3af', paddingLeft: 15, opacity: 0.85, lineHeight: 1.3 }}>Cost allocated / closed</div>
                </button>
              </div>
            </div>

            {/* ── Settlement (only when Resolved): warehouse = absorbed only; unit = multi-select + auto-split ── */}
            {!isOpen && (
              <div style={{ margin: '8px 12px 0', background: '#fff', borderRadius: 14, border: '1px solid #e8f0f0', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid #f0f5f5', background: '#fafcfc', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #0b5858, #05807e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" fill="white" fillOpacity="0.85" />
                      <path d="M12 7v2m0 6v2M9.5 10.5a2.5 2.5 0 015 0c0 2.5-5 2.5-5 5a2.5 2.5 0 005 0" stroke="#0b5858" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0b5858', fontFamily: 'Poppins' }}>
                    Settlement
                  </span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {isWarehouse && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'Poppins', display: 'block', marginBottom: 6 }}>
                        Absorbed (PHP)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={absorbedAmount}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setAbsorbedAmount(Number.isNaN(v) ? 0 : Math.max(0, v));
                        }}
                        placeholder="0"
                        onFocus={() => setFocused('absorbed')}
                        onBlur={() => setFocused(null)}
                        style={inputStyle('absorbed')}
                      />
                    </div>
                  )}

                  {isUnit && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                        <label
                          onClick={handleChargeToGuestToggle}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            fontFamily: 'Poppins',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#374151',
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: `2px solid ${chargeToGuestChecked ? '#f59e0b' : '#e5e7eb'}`,
                              background: chargeToGuestChecked ? '#fef3c7' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {chargeToGuestChecked && <span style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1 }}>✓</span>}
                          </span>
                          Charged to guest
                        </label>
                        <label
                          onClick={handleAbsorbedToggle}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            fontFamily: 'Poppins',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#374151',
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: `2px solid ${absorbedChecked ? '#8b5cf6' : '#e5e7eb'}`,
                              background: absorbedChecked ? '#f5f3ff' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {absorbedChecked && <span style={{ fontSize: 12, color: '#8b5cf6', lineHeight: 1 }}>✓</span>}
                          </span>
                          Absorbed
                        </label>
                      </div>

                      {(chargeToGuestChecked || absorbedChecked) && (
                        <div style={{ display: 'grid', gridTemplateColumns: chargeToGuestChecked && absorbedChecked ? '1fr 1fr' : '1fr', gap: 12, marginBottom: isResolvedStatus(status) ? 14 : 0 }}>
                          {chargeToGuestChecked && (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'Poppins', display: 'block', marginBottom: 6 }}>
                                Charged to guest (PHP)
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={chargedToGuest}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  const charged = Number.isNaN(v) ? 0 : Math.max(0, Math.min(v, totalCost));
                                  setChargedToGuest(charged);
                                  if (absorbedChecked) setAbsorbedAmount(Math.max(0, totalCost - charged));
                                }}
                                placeholder="0"
                                onFocus={() => setFocused('charged')}
                                onBlur={() => setFocused(null)}
                                style={inputStyle('charged')}
                              />
                            </div>
                          )}
                          {absorbedChecked && (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'Poppins', display: 'block', marginBottom: 6 }}>
                                Absorbed (PHP)
                              </label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={absorbedAmount}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  const absorbed = Number.isNaN(v) ? 0 : Math.max(0, Math.min(v, totalCost));
                                  setAbsorbedAmount(absorbed);
                                  if (chargeToGuestChecked) setChargedToGuest(Math.max(0, totalCost - absorbed));
                                }}
                                placeholder="0"
                                onFocus={() => setFocused('absorbed')}
                                onBlur={() => setFocused(null)}
                                style={inputStyle('absorbed')}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {isResolvedStatus(status) && (
              <div style={{ margin: '8px 12px 0', background: '#fff', borderRadius: 14, border: '1px solid #e8f0f0', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid #f0f5f5', background: '#fafcfc' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0b5858', fontFamily: 'Poppins' }}>
                    Resolution notes
                  </span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    onFocus={() => setFocused('notes')}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. Cost split 50/50, Stock Out submitted"
                    rows={3}
                    style={{ ...inputStyle('notes'), resize: 'vertical', minHeight: 72 }}
                  />
                </div>
              </div>
            )}

            <div style={{ margin: '8px 12px 12px', background: '#fff', borderRadius: 14, border: '1px solid #e8f0f0', overflow: 'hidden' }}>
              <div style={{ padding: '11px 16px', borderBottom: '1px solid #f0f5f5', background: '#fafcfc', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #0b5858, #05807e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="2" y="6" width="20" height="15" rx="3" fill="white" fillOpacity="0.85" />
                    <circle cx="12" cy="13.5" r="3" stroke="#0b5858" strokeWidth="1.5" />
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#0b5858', fontFamily: 'Poppins' }}>
                  Evidence photos
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af', marginLeft: 5 }}>optional</span>
                </span>
              </div>

              <div style={{ padding: '14px 16px' }}>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: 12,
                    border: '2px dashed #c4dede',
                    background: 'linear-gradient(135deg, #f8fbfb, #f0f9f9)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.15s',
                    fontFamily: 'Poppins',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#05807e';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #e6f4f4, #d4eded)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#c4dede';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fbfb, #f0f9f9)';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5m0 0L7 8m5-5v12" stroke="#05807e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0b5858' }}>Upload photos</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>PNG, JPG · 2MB each · max 5</span>
                </button>

                {imagePreviews.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginTop: 10 }}>
                    {imagePreviews.map((src, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e5e7eb', aspectRatio: '1' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(239,68,68,0.9)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              background: '#fff',
              borderTop: '1px solid #e8f0f0',
              boxShadow: '0 -4px 20px rgba(11,88,88,0.07)',
            }}
          >
            <div style={{ height: 3, background: selectedStatusCfg.dot, opacity: 0.6, transition: 'background 0.25s' }} />

            <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {isDirty ? (
                  <>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e', fontFamily: 'Poppins', whiteSpace: 'nowrap' }}>
                      Unsaved changes
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'Poppins' }}>No changes yet</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 11,
                    border: '1.5px solid #e5e7eb',
                    background: '#fff',
                    color: '#6b7280',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'Poppins',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isDirty}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 11,
                    border: 'none',
                    background: !isDirty ? '#e5e7eb' : 'linear-gradient(135deg, #0b5858, #05807e)',
                    color: !isDirty ? '#9ca3af' : '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : !isDirty ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'Poppins',
                    boxShadow: !isDirty ? 'none' : '0 4px 14px rgba(11,88,88,0.26)',
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    opacity: isSubmitting ? 0.75 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting && isDirty) e.currentTarget.style.opacity = '0.88';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = isSubmitting ? '0.75' : '1';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

