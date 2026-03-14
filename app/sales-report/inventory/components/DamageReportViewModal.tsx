'use client';

/**
 * DamageReportViewModal — Read-only detail view for a damage incident.
 *
 * Design:
 * - Teal gradient header with report ID, type badges, and key meta dates
 * - Body: clean two-column data grid layout grouped into logical sections
 * - Sections: Overview · Items · Costs · Resolution
 * - No inline "Set Action" — settlement happens via Edit Report only
 * - Sticky footer: Edit Report CTA only
 * - Staggered entrance animation per section
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DamageIncident } from '@/lib/api/damageIncidents';
import {
  getSettlementFromAmounts,
  normalizeDamageStatus,
  parseInventoryActionFromDescription,
  SETTLEMENT_LABELS,
} from '../helpers/damageIncidentHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useProductNames } from '../hooks/useProductNames';
import { useUserDisplayNames } from '../hooks/useUserDisplayNames';
import {
  inventoryItems,
  inventoryWarehouseDirectory,
  inventoryUnits,
} from '../lib/inventoryDataStore';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface DamageReportViewModalProps {
  incident: DamageIncident;
  onClose: () => void;
  onEdit?: () => void;
  /** Optional: resolved display name for "Reported by" / "Resolved by" (from useUserDisplayNames) */
  reportedByDisplayName?: string;
  resolvedByDisplayName?: string;
  unitName?: string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  open: { label: 'Open', bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
  resolved: { label: 'Resolved', bg: '#ecfdf5', color: '#065f46', dot: '#10b981' },
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, fallback = '—') {
  if (val == null || (val === 0 && fallback === '—')) return fallback;
  if (val === 0) return 'PHP 0';
  return `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(raw: string | null | undefined) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(raw: string | null | undefined) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

/** Parse item lines from description (line 2+). Format: "Name — qty: N, price: P" */
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
    } else {
      parsed.push({ name: line, quantity: null, unitPrice: null });
    }
  }
  return parsed;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
  delay = 0,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e8f0f0',
        overflow: 'hidden',
        animation: 'fadeUp 0.32s ease both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '13px 18px',
          borderBottom: '1px solid #f0f5f5',
          background: '#fafcfc',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #0b5858, #05807e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: '#0b5858',
            fontFamily: 'Poppins',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

/** Two-column key/value grid */
function DataGrid({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode; wide?: boolean }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px 24px',
      }}
    >
      {rows.map(({ label, value, wide }) => (
        <div
          key={label}
          style={{
            gridColumn: wide ? '1 / -1' : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#9ca3af',
              fontFamily: 'Poppins',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#1f2937',
              fontFamily: 'Poppins',
              lineHeight: 1.4,
            }}
          >
            {value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function CostRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: highlight ? '#0b5858' : '#6b7280',
          fontFamily: 'Poppins',
          fontWeight: highlight ? 700 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: highlight ? 15 : 13,
          fontWeight: highlight ? 800 : 600,
          color: highlight ? '#0b5858' : '#1f2937',
          fontFamily: 'Poppins',
          letterSpacing: highlight ? '-0.02em' : 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DamageReportViewModal({
  incident,
  onClose,
  onEdit,
  reportedByDisplayName,
  resolvedByDisplayName,
  unitName: unitNameProp,
}: DamageReportViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

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

  const status = normalizeDamageStatus(incident.status);
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const settlement =
    status === 'resolved'
      ? getSettlementFromAmounts(incident.chargedToGuest, incident.absorbedAmount)
      : null;

  const rawItems = incident.items ?? [];
  const descriptionItems = parseItemsFromDescription(incident.description);
  const useDescriptionForItems = descriptionItems.length > 0;
  const displayItems = useDescriptionForItems ? descriptionItems : rawItems;
  const productIds = rawItems.map((i) => i.productId).filter(Boolean);
  const productNamesFromApi = useProductNames(productIds);
  const getProductName = (id: string) =>
    inventoryItems.find((p) => p.id === id)?.name ??
    productNamesFromApi[id] ??
    `Product #${id}`;

  const warehouseName =
    inventoryWarehouseDirectory.find((w) => w.id === incident.warehouseId)?.name ??
    incident.warehouseId ??
    '—';

  const unitName =
    unitNameProp ??
    inventoryUnits.find((u) => u.id === incident.unitId)?.name ??
    incident.unitId ??
    '—';

  const isUnit = Boolean(incident.unitId);
  const isWarehouse = Boolean(incident.warehouseId);

  const auth = useAuth();
  const reportedById = incident.reportedByUserId != null ? String(incident.reportedByUserId) : null;
  const resolvedByUserIdRaw = incident.resolvedByUserId;
  const resolvedById =
    resolvedByUserIdRaw != null && resolvedByUserIdRaw !== ''
      ? String(resolvedByUserIdRaw)
      : null;
  const viewModalNames = useUserDisplayNames([reportedById, resolvedById].filter(Boolean) as string[]);

  /** Name display: use id only (from API reportedByUserId/resolvedByUserId). Auth for current user, then useUserDisplayNames, else "User ID: {id}". */
  const getDisplayNameForUserId = (userId: string | number | undefined | null): string => {
    if (userId == null) return '—';
    const idStr = String(userId);
    if (auth?.user && String(auth.user.id) === idStr) {
      const fromAuth =
        auth.userProfile?.fullname?.trim() ||
        [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ').trim();
      if (fromAuth) return fromAuth;
    }
    return viewModalNames[idStr]?.trim() || `User ID: ${idStr}`;
  };

  const inventoryAction = parseInventoryActionFromDescription(incident.description);
  const assignedCharge =
    (incident as { assignedCharge?: number | null }).assignedCharge ?? null;

  const itemsSum = useDescriptionForItems
    ? descriptionItems.reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0)
    : rawItems.reduce((s, i) => s + (i.quantity ?? 0) * (i.itemCost ?? 0), 0);
  const totalCost = incident.cost ?? itemsSum;

  /* Reported by / Resolved by: use id only; prefer parent-passed name, else getDisplayNameForUserId(id). */
  const reportedByDisplay =
    (reportedByDisplayName?.trim()) || getDisplayNameForUserId(incident.reportedByUserId);
  const resolvedByDisplay =
    (resolvedByDisplayName?.trim()) || getDisplayNameForUserId(resolvedById ?? null);

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
          background: 'rgba(7, 26, 26, 0.52)',
          backdropFilter: 'blur(3px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#f4f7f7',
            borderRadius: 22,
            width: 'min(680px, 92vw)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.05)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.96)',
            transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            fontFamily: 'Poppins',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0b5858 0%, #05807e 55%, #06938f 100%)',
              padding: '22px 24px 20px',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: -20,
                top: -30,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 60,
                bottom: -40,
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
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
                      color: 'rgba(255,255,255,0.6)',
                      fontFamily: 'Poppins',
                    }}
                  >
                    DAMAGE REPORT
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#fff',
                      background: 'rgba(255,255,255,0.18)',
                      padding: '3px 9px',
                      borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.25)',
                      fontFamily: 'Poppins',
                    }}
                  >
                    {isUnit ? 'UNIT' : isWarehouse ? 'WAREHOUSE' : 'REPORT'}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: statusCfg.color,
                      background: statusCfg.bg,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontFamily: 'Poppins',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusCfg.dot,
                        display: 'inline-block',
                      }}
                    />
                    {statusCfg.label}
                    {settlement != null && (
                      <span style={{ marginLeft: 6, opacity: 0.9 }}>· {SETTLEMENT_LABELS[settlement]}</span>
                    )}
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
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  fontFamily: 'Poppins',
                  marginBottom: 14,
                  wordBreak: 'break-all',
                }}
              >
                {incident.id}
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  {
                    label: 'Created at',
                    value: fmtDate(incident.createdAt ?? incident.reportedAt),
                  },
                  {
                    label: 'Reported at',
                    value: fmtDate(incident.reportDate ?? incident.reportedAt),
                  },
                  { label: 'Reported by', value: reportedByDisplay },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: 'Poppins',
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: 'Poppins',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '16px 16px 4px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionCard
                title="Overview"
                delay={0}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="4"
                      fill="white"
                      fillOpacity="0.9"
                    />
                    <path
                      d="M8 9h8M8 13h5"
                      stroke="#0b5858"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              >
                <DataGrid
                  rows={[
                    {
                      label: 'Report ID',
                      value: (
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: '#6b7280',
                            wordBreak: 'break-all',
                          }}
                        >
                          {incident.id}
                        </span>
                      ),
                    },
                    {
                      label: 'Status',
                      value: (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'Poppins',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: statusCfg.dot,
                              display: 'inline-block',
                            }}
                          />
                          {statusCfg.label}
                          {settlement != null && (
                            <span style={{ marginLeft: 6, fontWeight: 500, opacity: 0.9 }}>
                              · {SETTLEMENT_LABELS[settlement]}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    {
                      label: 'Inventory action',
                      value: (
                        <span style={{ fontWeight: 700 }}>
                          {inventoryAction === 'record_only'
                            ? 'Record only'
                            : 'Write off'}
                          {inventoryAction === 'write_off' && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 11,
                                fontWeight: 400,
                                color: '#9ca3af',
                                marginTop: 2,
                              }}
                            >
                              Stock will be deducted — complete Stock Out to apply
                            </span>
                          )}
                        </span>
                      ),
                    },
                    { label: 'Booking ID', value: incident.bookingId ?? '—' },
                    ...(isWarehouse
                      ? [
                          {
                            label: 'Warehouse',
                            value: (
                              <span>
                                <span style={{ fontWeight: 600 }}>{warehouseName}</span>
                                {incident.warehouseId && (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                      color: '#9ca3af',
                                    }}
                                  >
                                    {incident.warehouseId}
                                  </span>
                                )}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    ...(isUnit
                      ? [
                          {
                            label: 'Unit',
                            value: (
                              <span>
                                <span style={{ fontWeight: 600 }}>{unitName}</span>
                                {incident.unitId && (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                      color: '#9ca3af',
                                    }}
                                  >
                                    {incident.unitId}
                                  </span>
                                )}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    { label: 'Reported by', value: reportedByDisplay },
                    {
                      label: 'Updated at',
                      value: fmtDateTime(incident.updatedAt),
                    },
                  ]}
                />
              </SectionCard>

              {incident.description && (
                <SectionCard
                  title="Description"
                  delay={60}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                        fill="white"
                        fillOpacity="0.9"
                      />
                    </svg>
                  }
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: '#1f2937',
                      fontFamily: 'Poppins',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {incident.description}
                  </div>
                </SectionCard>
              )}

              {(displayItems.length > 0) && (
                <SectionCard
                  title="Damage Items"
                  delay={120}
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                        fill="white"
                        fillOpacity="0.9"
                      />
                      <path
                        d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
                        stroke="white"
                        strokeWidth="1.4"
                        strokeOpacity="0.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #e8f0f0' }}>
                        {['Product', 'Qty', 'Unit price', 'Subtotal'].map((h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: '0 0 9px',
                              textAlign: i === 0 ? 'left' : 'right',
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: '#9ca3af',
                              fontFamily: 'Poppins',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {useDescriptionForItems
                        ? descriptionItems.map((it, i) => {
                            const subtotal =
                              it.quantity != null && it.unitPrice != null
                                ? it.quantity * it.unitPrice
                                : null;
                            return (
                              <tr
                                key={`${it.name}-${i}`}
                                style={{
                                  borderBottom:
                                    i < descriptionItems.length - 1
                                      ? '1px solid #f3f4f6'
                                      : 'none',
                                  background:
                                    i % 2 === 1 ? '#fafeff' : 'transparent',
                                }}
                              >
                                <td
                                  style={{
                                    padding: '9px 0',
                                    fontWeight: 600,
                                    color: '#1f2937',
                                    fontFamily: 'Poppins',
                                  }}
                                >
                                  {it.name}
                                </td>
                                <td
                                  style={{
                                    padding: '9px 0',
                                    textAlign: 'right',
                                    color: '#6b7280',
                                    fontFamily: 'Poppins',
                                  }}
                                >
                                  {it.quantity ?? '—'}
                                </td>
                                <td
                                  style={{
                                    padding: '9px 0',
                                    textAlign: 'right',
                                    color: '#6b7280',
                                    fontFamily: 'Poppins',
                                  }}
                                >
                                  {it.unitPrice != null
                                    ? `PHP ${it.unitPrice.toLocaleString()}`
                                    : '—'}
                                </td>
                                <td
                                  style={{
                                    padding: '9px 0',
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                    fontFamily: 'Poppins',
                                  }}
                                >
                                  {subtotal != null
                                    ? `PHP ${subtotal.toLocaleString()}`
                                    : '—'}
                                </td>
                              </tr>
                            );
                          })
                        : rawItems.map((item, i) => (
                            <tr
                              key={(item as { id?: string }).id ?? i}
                              style={{
                                borderBottom:
                                  i < rawItems.length - 1
                                    ? '1px solid #f3f4f6'
                                    : 'none',
                                background:
                                  i % 2 === 1 ? '#fafeff' : 'transparent',
                              }}
                            >
                              <td
                                style={{
                                  padding: '9px 0',
                                  fontWeight: 600,
                                  color: '#1f2937',
                                  fontFamily: 'Poppins',
                                }}
                              >
                                {getProductName(item.productId)}
                              </td>
                              <td
                                style={{
                                  padding: '9px 0',
                                  textAlign: 'right',
                                  color: '#6b7280',
                                  fontFamily: 'Poppins',
                                }}
                              >
                                {item.quantity ?? '—'}
                              </td>
                              <td
                                style={{
                                  padding: '9px 0',
                                  textAlign: 'right',
                                  color: '#6b7280',
                                  fontFamily: 'Poppins',
                                }}
                              >
                                {item.itemCost != null
                                  ? `PHP ${item.itemCost.toLocaleString()}`
                                  : '—'}
                              </td>
                              <td
                                style={{
                                  padding: '9px 0',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: '#1f2937',
                                  fontFamily: 'Poppins',
                                }}
                              >
                                {item.quantity != null && item.itemCost != null
                                  ? `PHP ${(item.quantity * item.itemCost).toLocaleString()}`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </SectionCard>
              )}

              <SectionCard
                title="Costs & Amounts"
                delay={180}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="white"
                      fillOpacity="0.9"
                    />
                    <path
                      d="M12 7v2m0 6v2M9.5 10.5a2.5 2.5 0 015 0c0 2.5-5 2.5-5 5a2.5 2.5 0 005 0"
                      stroke="#0b5858"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <CostRow label="Cost (recorded)" value={fmt(incident.cost, 'PHP 0')} />
                  {assignedCharge != null && (
                    <CostRow
                      label="Assigned charge (unit)"
                      value={fmt(assignedCharge)}
                    />
                  )}
                  <CostRow
                    label="Estimated cost"
                    value={fmt((incident as { estimatedCost?: number }).estimatedCost)}
                  />
                  <CostRow
                    label="Actual cost"
                    value={fmt((incident as { actualCost?: number }).actualCost)}
                  />
                  <CostRow
                    label="Charged to guest"
                    value={fmt(incident.chargedToGuest, 'PHP 0')}
                  />
                  <CostRow
                    label="Absorbed"
                    value={fmt(incident.absorbedAmount, 'PHP 0')}
                  />
                  <div
                    style={{
                      borderTop: '1.5px solid #e8f0f0',
                      marginTop: 4,
                    }}
                  >
                    <CostRow
                      label="Total (items sum)"
                      value={`PHP ${itemsSum.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
                      highlight
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Resolution"
                delay={240}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="white"
                      strokeWidth="1.6"
                      strokeOpacity="0.9"
                    />
                  </svg>
                }
              >
                {inventoryAction === 'write_off' && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#92400e"
                      strokeWidth="2"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 9v4M12 17h.01"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#92400e',
                        fontFamily: 'Poppins',
                        lineHeight: 1.5,
                      }}
                    >
                      Deduct stock via{' '}
                      <strong>Stock Out → Damage / Write-off</strong> to apply
                      the inventory deduction.
                    </span>
                  </div>
                )}

                <DataGrid
                  rows={[
                    { label: 'Resolved by', value: resolvedByDisplay },
                    {
                      label: 'Resolved at',
                      value: fmtDateTime(
                        (incident as { resolvedAt?: string }).resolvedAt
                      ),
                    },
                    ...(incident.resolutionNotes
                      ? [
                          {
                            label: 'Resolution notes',
                            value: incident.resolutionNotes,
                            wide: true,
                          },
                        ]
                      : [
                          {
                            label: 'Resolution notes',
                            value: '—',
                            wide: true,
                          },
                        ]),
                  ]}
                />
              </SectionCard>

              <div style={{ height: 4 }} />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '14px 20px',
              background: '#fff',
              borderTop: '1px solid #e8f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 -4px 20px rgba(11,88,88,0.07)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 20,
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.dot}44`,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusCfg.dot,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusCfg.color,
                  fontFamily: 'Poppins',
                }}
              >
                {statusCfg.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#9ca3af',
                  fontFamily: 'Poppins',
                }}
              >
                ·
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6b7280',
                  fontFamily: 'Poppins',
                }}
              >
                PHP {totalCost.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '9px 20px',
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
                Close
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 11,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0b5858, #05807e)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                    fontFamily: 'Poppins',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    boxShadow: '0 4px 14px rgba(11,88,88,0.28)',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
