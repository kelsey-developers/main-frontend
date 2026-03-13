'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import SummaryCard from '../components/SummaryCard';
import DamageReportModal from '../components/DamageReportModal';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import { useToast } from '../hooks/useToast';
import NoneBadge, { isNoneLike } from '../components/NoneBadge';

/** Inventory-style type badge - labels: Unit / Warehouse */
const ReportTypeBadge = ({ reportType }: { reportType: ReportType }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
      reportType === 'unit' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
    }`}
  >
    {reportType === 'unit' ? 'Unit' : 'Warehouse'}
  </span>
);
import {
  listDamageIncidents,
  getDamageIncident,
  type DamageIncident,
} from '@/lib/api/damageIncidents';
import { inventoryUnits, loadInventoryDataset } from '../lib/inventoryDataStore';
import { formatPhp } from '../helpers/purchaseOrderHelpers';
import DamageReportEvidenceImages from '../components/DamageReportEvidenceImages';
import {
  DAMAGE_STATUS_LABELS,
  normalizeDamageStatus,
  type DamageIncidentStatus,
} from '../helpers/damageIncidentHelpers';
import { useUserDisplayNames } from '../hooks/useUserDisplayNames';

type ReportType = 'unit' | 'warehouse';

type DamageReportRow = {
  id: string;
  reportType: ReportType;
  bookingId?: string;
  unitId?: string;
  unitName?: string;
  reportedBy?: string;
  reportedByUserId?: string;
  reportedAt: string;
  /** When the record was created (API createdAt); falls back to reportedAt */
  createdAt: string;
  /** When the record was last updated (API updatedAt) */
  updatedAt: string;
  incident: DamageIncident;
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border border-amber-200',
  charged_to_guest: 'bg-blue-50 text-blue-700 border border-blue-200',
  absorbed: 'bg-violet-50 text-violet-700 border border-violet-200',
  settled: 'bg-green-50 text-green-700 border border-green-200',
};

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

// ─── Detail Drawer ────────────────────────────────────────────────────
function DamageReportDetailDrawer({
  incident,
  unitName,
  reportType,
  reportedByDisplayName,
  resolvedByDisplayName,
  onClose,
  onEdit,
}: {
  incident: DamageIncident;
  unitName?: string;
  reportType: ReportType;
  /** Resolved from user id via frontend fetch */
  reportedByDisplayName?: string;
  resolvedByDisplayName?: string;
  onClose: () => void;
  onEdit: (inc: DamageIncident) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [evidencePreview, setEvidencePreview] = useState<{ path: string; label: string } | null>(null);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);
  useEffect(() => {
    setPreviewImageFailed(false);
  }, [evidencePreview]);
  useEffect(() => {
    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) delete document.body.dataset.modalCount;
      else document.body.dataset.modalCount = String(nextModalCount);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 260);
  };

  const reportedAt = incident.reportedAt ?? incident.reportDate ?? incident.dateReported ?? incident.createdAt ?? '';
  const createdAt = incident.createdAt ?? reportedAt;
  const resolvedAt = incident.resolvedAt ?? '';
  const cost = incident.cost ?? incident.estimatedCost ?? incident.actualCost;
  const statusKey = normalizeDamageStatus(incident.status);

  return createPortal(
    <div
      onClick={handleClose}
      className="fixed inset-0 z-[10000] flex justify-end overflow-hidden"
      style={{
        background: 'rgba(17, 24, 39, 0.38)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full flex flex-col bg-white"
        style={{
          width: 'min(680px, 96vw)',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.14)',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
          fontFamily: 'Poppins',
        }}
      >
        {/* Drawer header - PO style */}
        <div
          className="flex-shrink-0 px-7 py-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0b5858 0%, #05807e 100%)' }}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                DAMAGE REPORT
              </div>
              <div className="text-[18px] sm:text-2xl font-black mb-1 break-all">{incident.id}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ReportTypeBadge reportType={reportType} />
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                  STATUS_CLASSES[statusKey] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {DAMAGE_STATUS_LABELS[statusKey]}
              </span>
              <button
                onClick={handleClose}
                className="rounded-full border-0 text-2xl flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  width: 34,
                  height: 34,
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Meta row - PO style (user ids for reported/resolved) */}
          <div className="flex gap-6 mt-5 flex-wrap" style={{ fontFamily: 'Poppins' }}>
            {[
              { label: 'Created at', val: formatDateShort(createdAt) },
              { label: 'Reported at', val: formatDateShort(reportedAt) },
              {
                label: 'Reported by',
                val:
                  reportedByDisplayName ??
                  (incident.reportedByUserId != null && String(incident.reportedByUserId).trim() !== ''
                    ? `User ID: ${incident.reportedByUserId}`
                    : incident.reportedBy ?? '—'),
              },
              ...(resolvedAt || incident.resolvedByUserId
                ? [
                    { label: 'Resolved at', val: resolvedAt ? formatDateShort(resolvedAt) : '—' },
                    {
                      label: 'Resolved by',
                      val:
                        resolvedByDisplayName ??
                        (incident.resolvedByUserId != null &&
                        String(incident.resolvedByUserId).trim() !== ''
                          ? `User ID: ${incident.resolvedByUserId}`
                          : '—'),
                    },
                  ]
                : []),
            ].map((m) => (
              <div key={m.label}>
                <div className="text-[10px] font-semibold tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {m.label}
                </div>
                <div className="text-sm font-semibold">{m.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body - PO style sections */}
        <div className="flex-1 overflow-y-auto px-7 py-6" style={{ fontFamily: 'Poppins' }}>
          {/* Overview + identifiers - all reference fields */}
          <div className="mb-5 rounded-xl border border-[#cce8e8] bg-[#f0f9f9] p-4">
            <div className="mb-2 text-[10px] font-bold tracking-wider uppercase text-gray-500">Overview &amp; IDs</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <div className="text-gray-500">Report ID</div>
                <div className="font-mono text-[11px] font-semibold text-gray-900 break-all">{incident.id}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-semibold text-gray-900">{DAMAGE_STATUS_LABELS[statusKey]}</div>
              </div>
              <div>
                <div className="text-gray-500">Booking ID</div>
                <div className="font-semibold text-gray-900 font-mono text-[11px] break-all">
                  {isNoneLike(incident.bookingId) ? '—' : incident.bookingId ?? '—'}
                </div>
              </div>
              {incident.unitId ? (
                <>
                  <div>
                    <div className="text-gray-500">Unit</div>
                    <div className="font-semibold text-gray-900">{unitName ?? incident.unitId ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Unit ID</div>
                    <div className="font-mono text-[11px] text-gray-800 break-all">{incident.unitId}</div>
                  </div>
                </>
              ) : null}
              {incident.warehouseId ? (
                <div>
                  <div className="text-gray-500">Warehouse</div>
                  <div className="font-mono text-[11px] text-gray-800 break-all">{incident.warehouseId}</div>
                </div>
              ) : null}
              <div>
                <div className="text-gray-500">Reported by</div>
                <div className="font-semibold text-gray-900">
                  {reportedByDisplayName ?? incident.reportedBy ?? (incident.reportedByUserId ? `User ID: ${incident.reportedByUserId}` : '—')}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Resolved by</div>
                <div className="font-semibold text-gray-900">
                  {resolvedByDisplayName ?? (incident.resolvedByUserId ? `User ID: ${incident.resolvedByUserId}` : '—')}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Updated at</div>
                <div className="font-semibold text-gray-900">
                  {incident.updatedAt ? formatDate(incident.updatedAt) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Description - always show */}
          <div className="mb-5">
            <div className="mb-2 text-[10px] font-bold tracking-wider uppercase text-gray-500">Description</div>
            <div className="text-[13px] text-gray-800 whitespace-pre-wrap">
              {incident.description?.trim() ? incident.description : '—'}
            </div>
          </div>

          {/* Costs - show all amount fields */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 text-[10px] font-bold tracking-wider uppercase text-gray-500">Costs &amp; amounts</div>
            <div className="grid gap-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Cost</span>
                <span className="font-semibold text-[#0b5858]">
                  {cost != null ? formatPhp(Number(cost)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated cost</span>
                <span className="font-semibold">
                  {incident.estimatedCost != null ? formatPhp(Number(incident.estimatedCost)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actual cost</span>
                <span className="font-semibold">
                  {incident.actualCost != null ? formatPhp(Number(incident.actualCost)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Charged to guest</span>
                <span className="font-semibold">
                  {incident.chargedToGuest != null ? formatPhp(Number(incident.chargedToGuest)) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Absorbed</span>
                <span className="font-semibold">
                  {incident.absorbedAmount != null ? formatPhp(Number(incident.absorbedAmount)) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Resolution - always show block; notes may be — */}
          <div className="mb-5 rounded-xl border border-[#cce8e8] bg-[#f0f9f9] p-4">
            <div className="mb-2 text-[10px] font-bold tracking-wider uppercase text-gray-500">Resolution</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px] mb-3">
              <div>
                <div className="text-gray-500">Resolved by</div>
                <div className="font-semibold text-gray-900">
                  {resolvedByDisplayName ?? (incident.resolvedByUserId ? `User ID: ${incident.resolvedByUserId}` : '—')}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Resolved at</div>
                <div className="font-semibold text-gray-900">
                  {resolvedAt ? formatDate(resolvedAt) : '—'}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-[#cce8e8]">
              <div className="text-gray-500 mb-1">Resolution notes</div>
              <div className="text-[13px] text-gray-800 whitespace-pre-wrap">
                {incident.resolutionNotes?.trim() ? incident.resolutionNotes : '—'}
              </div>
            </div>
          </div>

          {/* Submitted images */}
          <DamageReportEvidenceImages
            incidentId={incident.id}
            onPreview={(path, label) => setEvidencePreview({ path, label })}
          />
        </div>

        {/* Footer */}
        <div
          className="px-7 py-4 border-t border-[#e5e7eb] flex gap-2 flex-shrink-0 bg-white"
          style={{ fontFamily: 'Poppins' }}
        >
          <button
            onClick={() => onEdit(incident)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white font-semibold text-sm rounded-lg transition-all duration-150 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{ boxShadow: '0 2px 8px rgba(11,88,88,0.2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor">
              <path
                d="M11.333 2.00004C11.5084 1.82463 11.7163 1.68648 11.9451 1.59347C12.1738 1.50046 12.4191 1.45435 12.6663 1.45435C12.9136 1.45435 13.1589 1.50046 13.3876 1.59347C13.6164 1.68648 13.8243 1.82463 13.9997 2.00004C14.1751 2.17546 14.3132 2.38334 14.4062 2.61209C14.4992 2.84084 14.5453 3.08618 14.5453 3.33337C14.5453 3.58057 14.4992 3.82591 14.4062 4.05466C14.3132 4.28341 14.1751 4.49129 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit report
          </button>
        </div>
      </div>

      {/* Image preview overlay - PO style */}
      {evidencePreview && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setEvidencePreview(null);
            setPreviewImageFailed(false);
          }}
          className="fixed inset-0 z-[10001] bg-[rgba(17,24,39,0.55)] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[980px] rounded-2xl overflow-hidden border border-white/15 bg-[#0f172a] shadow-2xl"
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/10 text-white">
              <div className="text-[12px] font-semibold">{evidencePreview.label}</div>
              <button
                type="button"
                onClick={() => { setEvidencePreview(null); setPreviewImageFailed(false); }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close image preview"
              >
                ×
              </button>
            </div>
            <div className="p-3 bg-black/20 min-h-[200px] flex items-center justify-center">
              {previewImageFailed ? (
                <div className="flex flex-col items-center gap-2 py-8 text-white/80">
                  <svg className="w-14 h-14 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[14px] font-medium">Image was not present in submission</span>
                </div>
              ) : (
                <img
                  src={evidencePreview.path}
                  alt={evidencePreview.label}
                  className="w-full max-h-[76vh] object-contain rounded-lg bg-white"
                  onError={() => setPreviewImageFailed(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function flattenIncidentsToRows(incidents: DamageIncident[]): DamageReportRow[] {
  const byUnit = new Map(inventoryUnits.map((u) => [u.id, u.name]));
  const rows: DamageReportRow[] = incidents.map((inc) => {
    const reportedAt =
      inc.reportedAt ?? inc.reportDate ?? inc.dateReported ?? inc.createdAt ?? '';
    const createdAt = inc.createdAt ?? reportedAt;
    const updatedAt = inc.updatedAt ?? '';
    const reportType: ReportType = inc.unitId ? 'unit' : 'warehouse';
    return {
      id: inc.id,
      reportType,
      bookingId: inc.bookingId,
      unitId: inc.unitId,
      unitName: inc.unitId ? (byUnit.get(inc.unitId) ?? inc.unitId) : undefined,
      reportedBy: inc.reportedBy,
      reportedByUserId: inc.reportedByUserId,
      reportedAt,
      createdAt,
      updatedAt,
      incident: inc,
    };
  });
  rows.sort((a, b) => {
    const ta = new Date(a.reportedAt).getTime();
    const tb = new Date(b.reportedAt).getTime();
    return tb - ta;
  });
  return rows;
}

export default function DamageReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<DamageIncident | null>(null);
  const [drawerIncident, setDrawerIncident] = useState<DamageIncident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState<DamageIncident[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isServerDown, setIsServerDown] = useState(false);

  const { error: showError } = useToast();

  useEffect(() => {
    void loadInventoryDataset().then(() => setRefreshTick((t) => t + 1));
    const onDatasetUpdated = () => setRefreshTick((t) => t + 1);
    window.addEventListener('inventory:dataset-updated', onDatasetUpdated);
    return () => window.removeEventListener('inventory:dataset-updated', onDatasetUpdated);
  }, []);

  useEffect(() => {
    const load = async () => {
      setFetchError(null);
      setIsServerDown(false);
      try {
        const data = await listDamageIncidents();
        setIncidents(Array.isArray(data) ? data : []);
      } catch (err) {
        setIncidents([]);
        const status = (err as any)?.status as number | undefined;
        const msg = err instanceof Error ? err.message : 'Failed to load damage reports.';
        setFetchError(msg);
        const isConfigError =
          /MARKET_API_URL|not configured|damage-incidents|unreachable|backend/i.test(msg);
        // Treat 401/403 as permissions issues, not server-down.
        const isAuthError = status === 401 || status === 403;
        setIsServerDown(!isConfigError && !isAuthError);
        showError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [refreshTick, showError]);

  const rows = useMemo(
    () => flattenIncidentsToRows(incidents),
    [incidents, refreshTick]
  );

  const userIdsForNames = useMemo(
    () =>
      [
        ...rows.map((r) => r.reportedByUserId),
        ...rows.map((r) => r.incident.resolvedByUserId),
      ].filter(Boolean) as string[],
    [rows]
  );
  const userDisplayNames = useUserDisplayNames(userIdsForNames);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') {
      list = list.filter((r) => normalizeDamageStatus(r.incident.status) === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.incident.description?.toLowerCase().includes(q) ||
          r.unitName?.toLowerCase().includes(q) ||
          r.bookingId?.toLowerCase().includes(q) ||
          r.incident.resolutionNotes?.toLowerCase().includes(q) ||
          r.reportedBy?.toLowerCase().includes(q) ||
          r.reportedByUserId?.toLowerCase().includes(q) ||
          r.incident.resolvedByUserId?.toLowerCase().includes(q)
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((r) => {
        const reportedDate = new Date(r.reportedAt);
        if (dateFrom && reportedDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (reportedDate > to) return false;
        }
        return true;
      });
    }
    return list;
  }, [rows, statusFilter, search, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const total = rows.length;
    const open = rows.filter((r) => normalizeDamageStatus(r.incident.status) === 'open').length;
    const settled = rows.filter((r) => normalizeDamageStatus(r.incident.status) === 'settled').length;
    return { total, open, settled };
  }, [rows]);

  const statusOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const seen = new Set<string>();
    for (const r of rows) {
      const s = normalizeDamageStatus(r.incident.status);
      seen.add(s);
    }
    const order: DamageIncidentStatus[] = ['open', 'charged_to_guest', 'absorbed', 'settled'];
    return [
      { value: 'all', label: 'All statuses' },
      ...order.filter((s) => seen.has(s)).map((s) => ({ value: s, label: DAMAGE_STATUS_LABELS[s] })),
    ];
  }, [rows]);

  return (
    <>
      <style>{`
        @keyframes inventoryReveal {
          from { opacity: 0; transform: translate3d(0, 14px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .inventory-reveal { opacity: 0; animation: inventoryReveal 560ms ease-in-out forwards; }
        .damage-btn:hover { background: #0a4a4a !important; color: #ffffff !important; }
        .damage-row:hover { background: #e8f4f4 !important; }
      `}</style>
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
            <span className="text-gray-900 font-medium">Damage Reports</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900">Damage Reports</h1>
          <p className="text-gray-600 mt-1">
            View and manage damage reports for units and bookings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditIncident(null);
            setModalOpen(true);
          }}
          className="damage-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-[1.5px] border-[#05807e] bg-white text-[#05807e] text-[13px] font-semibold transition-all"
          style={{ fontFamily: 'Poppins' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Create damage report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 inventory-reveal">
        {[
          {
            label: 'Total Reports',
            value: totals.total,
            gradient: 'from-[#0B5858] to-[#0a4a4a]',
          },
          {
            label: 'Open',
            value: totals.open,
            gradient: 'from-[#05807e] to-[#0B5858]',
          },
          {
            label: 'Settled',
            value: totals.settled,
            gradient: 'from-amber-500 to-amber-600',
          },
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

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 inventory-reveal">
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
            placeholder="Search by description, unit, booking, or reporter…"
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

        <div className="flex gap-2 flex-wrap">
          <div className="relative z-[60]">
            <InventoryDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              minWidthClass="min-w-[200px]"
              menuZIndexClass="z-[999]"
            />
          </div>

          <SingleDatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="From date"
            className="min-w-[140px]"
          />
          <SingleDatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="To date"
            className="min-w-[140px]"
          />

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3.5 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="inventory-reveal">
        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div
              className="px-4 py-12 text-center text-gray-500"
              style={{ fontFamily: 'Poppins' }}
            >
              Loading damage reports…
            </div>
          </div>
        ) : fetchError ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div
              className="px-4 py-12 text-center"
              style={{ fontFamily: 'Poppins' }}
            >
              {isServerDown ? (
                <>
                  <div className="flex justify-center mb-4">
                    <svg
                      className="w-16 h-16 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <path d="M2 12h20M2 12v4a2 2 0 002 2h16a2 2 0 002-2v-4" />
                      <path d="M3 3l18 18" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="font-semibold text-gray-700 mb-1">Server is unavailable</div>
                  <p className="text-sm text-gray-500 mb-4">Please try again later.</p>
                  <button
                    type="button"
                    onClick={() => setRefreshTick((t) => t + 1)}
                    className="px-4 py-2 rounded-lg bg-[#05807e] text-white font-semibold text-sm hover:bg-[#047772] transition-colors"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <div className="font-semibold mb-2 text-amber-700">Could not load damage reports</div>
                  <p className="text-sm text-gray-600 mb-2">{fetchError}</p>
                  <p className="text-xs text-gray-500 mb-4">
                    Ensure the market backend is running and MARKET_API_URL in .env.local points to it (e.g. Cloudflare tunnel URL).
                  </p>
                  <button
                    type="button"
                    onClick={() => setRefreshTick((t) => t + 1)}
                    className="px-4 py-2 rounded-lg bg-[#05807e] text-white font-semibold text-sm hover:bg-[#047772] transition-colors"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div
              className="py-12 px-6 text-center text-gray-400 text-sm"
              style={{ fontFamily: 'Poppins' }}
            >
              <div className="flex justify-center mb-3">
                <svg
                  className="w-12 h-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">No damage reports found</div>
              <p className="text-sm">
                Create a damage report using the button above.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'Poppins' }}>
            {/* Table header - Desktop (PO style) */}
            <div
              className="hidden md:grid px-5 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]"
              style={{ gridTemplateColumns: '0.85fr 0.85fr 0.9fr 1fr 1.1fr 1.2fr 1fr 1fr' }}
            >
              {['REPORT ID', 'TYPE', 'STATUS', 'BOOKING', 'UNIT', 'REPORTED BY', 'CREATED AT', 'UPDATED AT'].map((h) => (
                <div key={h} className="text-xs font-bold tracking-wide text-white/75">
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {filteredRows.map((row) => (
              <div key={row.id}>
                {/* Desktop row */}
                <div
                  onClick={async () => {
                    try {
                      const full = await getDamageIncident(row.incident.id);
                      setDrawerIncident(full ?? row.incident);
                    } catch {
                      setDrawerIncident(row.incident);
                    }
                  }}
                  className="hidden md:grid px-5 py-3 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ gridTemplateColumns: '0.85fr 0.85fr 0.9fr 1fr 1.1fr 1.2fr 1fr 1fr' }}
                >
                  <div
                    className="text-[11px] text-gray-400 break-all font-mono max-w-[180px]"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                    title={row.id}
                  >
                    {row.id}
                  </div>
                  <div className="text-[12px]">
                    <ReportTypeBadge reportType={row.reportType} />
                  </div>
                  <div className="text-[12px]">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                        STATUS_CLASSES[normalizeDamageStatus(row.incident.status)] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {DAMAGE_STATUS_LABELS[normalizeDamageStatus(row.incident.status)]}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-gray-700">
                    {isNoneLike(row.bookingId) ? <NoneBadge /> : row.bookingId ?? '—'}
                  </div>
                  <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">
                    {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName ?? row.unitId ?? '—'}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-gray-900">
                      {row.reportedByUserId
                        ? (userDisplayNames[row.reportedByUserId] ?? row.reportedBy ?? '—')
                        : (row.reportedBy ?? '—')}
                    </div>
                    <div className="text-[11px] text-gray-500">{formatDateShort(row.reportedAt)}</div>
                  </div>
                  <div className="text-[12px] text-gray-700">
                    {formatDateShort(row.createdAt)}
                  </div>
                  <div className="text-[12px] text-gray-700">
                    {row.updatedAt ? formatDateShort(row.updatedAt) : '—'}
                  </div>
                </div>

                {/* Mobile card */}
                <div
                  onClick={async () => {
                    try {
                      const full = await getDamageIncident(row.incident.id);
                      setDrawerIncident(full ?? row.incident);
                    } catch {
                      setDrawerIncident(row.incident);
                    }
                  }}
                  className="md:hidden px-4 py-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors active:bg-gray-50"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div
                      className="text-[11px] text-gray-400 break-all font-mono min-w-0"
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {row.id}
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                      <ReportTypeBadge reportType={row.reportType} />
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                          STATUS_CLASSES[normalizeDamageStatus(row.incident.status)] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {DAMAGE_STATUS_LABELS[normalizeDamageStatus(row.incident.status)]}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Booking</div>
                      <div className="text-[13px] font-bold text-[#0b5858]">
                        {isNoneLike(row.bookingId) ? '—' : row.bookingId ?? '—'}
                      </div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Unit</div>
                      <div className="text-[13px] font-bold text-gray-700">
                        {isNoneLike(row.unitName) ? '—' : row.unitName ?? row.unitId ?? '—'}
                      </div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Created at</div>
                      <div className="text-[13px] font-bold text-gray-700">
                        {formatDateShort(row.createdAt)}
                      </div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Updated at</div>
                      <div className="text-[13px] font-bold text-gray-700">
                        {row.updatedAt ? formatDateShort(row.updatedAt) : '—'}
                      </div>
                    </div>
                    <div className="col-span-2 bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Reported by</div>
                      <div className="text-[12px] font-semibold text-gray-900">
                        {row.reportedByUserId
                          ? (userDisplayNames[row.reportedByUserId] ?? row.reportedBy ?? '—')
                          : (row.reportedBy ?? '—')}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{formatDateShort(row.reportedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-3 text-[12px] text-gray-400 inventory-reveal"
        style={{ fontFamily: 'Poppins' }}
      >
        Showing{' '}
        <span className="font-semibold text-[#05807e]">{filteredRows.length}</span> of{' '}
        {rows.length} damage reports
        {search && (
          <span>
            {' '}
            — &quot;<em>{search}</em>&quot;
          </span>
        )}
      </div>

      {modalOpen && (
        <DamageReportModal
          onClose={() => {
            setModalOpen(false);
            setEditIncident(null);
          }}
          onSuccess={() => setRefreshTick((t) => t + 1)}
          incident={editIncident}
        />
      )}

      {drawerIncident && (
        <DamageReportDetailDrawer
          incident={drawerIncident}
          reportType={drawerIncident.unitId ? 'unit' : 'warehouse'}
          unitName={
            drawerIncident.unitId
              ? inventoryUnits.find((u) => u.id === drawerIncident.unitId)?.name ?? drawerIncident.unitId
              : undefined
          }
          reportedByDisplayName={
            drawerIncident.reportedByUserId
              ? userDisplayNames[drawerIncident.reportedByUserId] ?? drawerIncident.reportedBy
              : drawerIncident.reportedBy
          }
          resolvedByDisplayName={
            drawerIncident.resolvedByUserId
              ? userDisplayNames[drawerIncident.resolvedByUserId]
              : undefined
          }
          onClose={() => setDrawerIncident(null)}
          onEdit={async (inc) => {
            setDrawerIncident(null);
            try {
              const full = await getDamageIncident(inc.id);
              setEditIncident(full ?? inc);
            } catch {
              setEditIncident(inc);
            }
            setModalOpen(true);
          }}
        />
      )}
    </>
  );
}
