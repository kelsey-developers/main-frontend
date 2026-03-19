'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import SummaryCard from '../components/SummaryCard';
import DamageReportModal from '../components/DamageReportModal';
import DamageReportEditModal from '../components/DamageReportEditModal';
import DamageReportViewModal from '../components/DamageReportViewModal';
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
import {
  DAMAGE_STATUS_LABELS,
  SETTLEMENT_LABELS,
  getSettlementFromAmounts,
  normalizeDamageStatus,
  getInventoryActionLabel,
  parseInventoryActionFromDescription,
  type DamageIncidentStatus,
} from '../helpers/damageIncidentHelpers';
import { useAuth } from '@/contexts/AuthContext';
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
  /** Backend may return this when user id is not available */
  reportedByName?: string;
  reportedAt: string;
  /** When the record was created (API createdAt); falls back to reportedAt */
  createdAt: string;
  /** When the record was last updated (API updatedAt) */
  updatedAt: string;
  incident: DamageIncident;
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border border-amber-200',
  resolved: 'bg-green-50 text-green-700 border border-green-200',
};

function formatDateShort(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

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

function nameFromEmail(value: string): string | undefined {
  const email = value.trim().toLowerCase();
  if (!looksLikeEmail(email)) return undefined;
  const local = email.split('@')[0] ?? '';
  const words = local
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
  return words || undefined;
}

function normalizeReporterName(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || isNoneLike(trimmed)) return undefined;

  const nameWithIdSuffix = trimmed.match(/^(.*)\s+\(id:\s*([^)]+)\)\s*$/i);
  if (nameWithIdSuffix) {
    const nameOnly = nameWithIdSuffix[1]?.trim();
    if (!nameOnly || isNoneLike(nameOnly) || /^unknown(?:\s+reporter)?$/i.test(nameOnly)) {
      return undefined;
    }
    return nameOnly;
  }

  if (/^unknown(?:\s+reporter)?$/i.test(trimmed)) return undefined;
  if (/^user\s*id\s*:/i.test(trimmed)) return undefined;
  if (looksLikeEmail(trimmed)) return nameFromEmail(trimmed) ?? trimmed;
  return trimmed;
}

function extractUserIdFromReportedByText(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isNoneLike(trimmed)) return undefined;

  const userIdPrefix = trimmed.match(/^user\s*id\s*:\s*(.+)$/i);
  if (userIdPrefix) {
    const extracted = userIdPrefix[1]?.trim();
    return extracted && !isNoneLike(extracted) ? extracted : undefined;
  }

  const idSuffix = trimmed.match(/\(id:\s*([^)]+)\)\s*$/i);
  if (idSuffix) {
    const extracted = idSuffix[1]?.trim();
    return extracted && !isNoneLike(extracted) ? extracted : undefined;
  }

  return undefined;
}

/** Get reporter user id from incident (API may send reportedByUserId or reportedBy.id / reportedBy string). */
function getReportedByUserId(inc: DamageIncident): string | undefined {
  if (inc.reportedByUserId != null && inc.reportedByUserId !== '') {
    const direct = String(inc.reportedByUserId).trim();
    if (direct && !isNoneLike(direct)) return direct;
  }
  const rb = (inc as unknown as Record<string, unknown>).reportedBy;
  if (rb == null) return undefined;
  if (typeof rb === 'object' && rb !== null && 'id' in rb) {
    const fromObj = String((rb as { id: string | number }).id).trim();
    if (fromObj && !isNoneLike(fromObj)) return fromObj;
    return undefined;
  }
  if (typeof rb === 'string') {
    const extracted = extractUserIdFromReportedByText(rb);
    if (extracted) return extracted;
    const fromText = rb.trim();
    if (looksLikeOpaqueUserId(fromText)) return fromText;
  }
  return undefined;
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
      reportedByUserId: getReportedByUserId(inc),
      reportedByName: normalizeReporterName(inc.reportedByName ?? inc.reportedBy),
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
  const [editModalIncident, setEditModalIncident] = useState<DamageIncident | null>(null);
  const [viewModalIncident, setViewModalIncident] = useState<DamageIncident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState<DamageIncident[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isServerDown, setIsServerDown] = useState(false);

  const { error: showError, success: showSuccess } = useToast();

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

  const auth = useAuth();
  const userIdsForNames = useMemo(
    () =>
      [
        ...rows.map((r) => r.reportedByUserId),
        ...rows.map((r) => r.incident.resolvedByUserId),
        ...(viewModalIncident
          ? [
              viewModalIncident.reportedByUserId,
              (viewModalIncident as { resolvedByUserId?: string | number | null }).resolvedByUserId,
            ]
          : []),
      ].filter(Boolean) as string[],
    [rows, viewModalIncident]
  );
  const userDisplayNames = useUserDisplayNames(userIdsForNames);

  /** Name display: prefer auth/user-map names, then API names; avoid exposing raw opaque ids in UI. */
  const getDisplayNameForUserId = (userId: string | number | undefined | null, nameFromApi?: string | null): string => {
    if (userId != null && userId !== '') {
      const idStr = String(userId).trim();
      if (!idStr || isNoneLike(idStr)) return 'Unknown user';
      if (auth?.user && String(auth.user.id) === idStr) {
        const fromAuth =
          auth.userProfile?.fullname?.trim() ||
          [auth.user.firstName, auth.user.lastName].filter(Boolean).join(' ').trim();
        if (fromAuth) return fromAuth;
      }
      const fromMap = userDisplayNames[idStr]?.trim();
      if (fromMap) return fromMap;

      const normalizedApiName = normalizeReporterName(nameFromApi);
      if (normalizedApiName) return normalizedApiName;

      if (!looksLikeOpaqueUserId(idStr) && !/^user\s*id\s*:/i.test(idStr)) return idStr;
      return 'Unknown user';
    }

    const normalizedApiName = normalizeReporterName(nameFromApi);
    if (normalizedApiName) return normalizedApiName;

    return 'Unknown user';
  };

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
          String(r.incident.resolvedByUserId ?? '').toLowerCase().includes(q)
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
    const resolved = rows.filter((r) => normalizeDamageStatus(r.incident.status) === 'resolved').length;
    return { total, open, resolved };
  }, [rows]);

  const statusOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const seen = new Set<string>();
    for (const r of rows) {
      const s = normalizeDamageStatus(r.incident.status);
      seen.add(s);
    }
    const order: DamageIncidentStatus[] = ['open', 'resolved'];
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
            label: 'Resolved',
            value: totals.resolved,
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
              style={{ gridTemplateColumns: '0.85fr 0.85fr 0.75fr 0.85fr 1fr 1.1fr 1.2fr 1fr' }}
            >
              {['REPORT ID', 'TYPE', 'ACTION', 'STATUS', 'BOOKING', 'UNIT', 'REPORTED BY', 'CREATED AT'].map((h) => (
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
                      setViewModalIncident(full ?? row.incident);
                    } catch {
                      setViewModalIncident(row.incident);
                    }
                  }}
                  className="hidden md:grid px-5 py-3 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ gridTemplateColumns: '0.85fr 0.85fr 0.75fr 0.85fr 1fr 1.1fr 1.2fr 1fr' }}
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
                        parseInventoryActionFromDescription(row.incident.description) === 'record_only'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                      title={parseInventoryActionFromDescription(row.incident.description) === 'record_only' ? 'No stock deduction' : 'Deduct stock via Stock Out'}
                    >
                      {getInventoryActionLabel(parseInventoryActionFromDescription(row.incident.description))}
                    </span>
                  </div>
                  <div className="text-[12px] flex flex-col gap-0.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium w-fit ${
                        STATUS_CLASSES[normalizeDamageStatus(row.incident.status)] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {DAMAGE_STATUS_LABELS[normalizeDamageStatus(row.incident.status)]}
                    </span>
                    {normalizeDamageStatus(row.incident.status) === 'resolved' && (() => {
                      const settlement = getSettlementFromAmounts(row.incident.chargedToGuest, row.incident.absorbedAmount);
                      return settlement ? (
                        <span className="text-[10px] text-gray-500">{SETTLEMENT_LABELS[settlement]}</span>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-[12.5px] text-gray-700">
                    {isNoneLike(row.bookingId) ? <NoneBadge /> : row.bookingId ?? '—'}
                  </div>
                  <div className="text-[12.5px] font-medium text-gray-900 whitespace-normal break-words">
                    {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName ?? row.unitId ?? '—'}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-gray-900">
                      {getDisplayNameForUserId(row.reportedByUserId, row.reportedByName)}
                    </div>
                    <div className="text-[11px] text-gray-500">{formatDateShort(row.reportedAt)}</div>
                  </div>
                  <div className="text-[12px] text-gray-700">
                    {formatDateShort(row.createdAt)}
                  </div>
                </div>

                {/* Mobile card */}
                <div
                  onClick={async () => {
                    try {
                      const full = await getDamageIncident(row.incident.id);
                      setViewModalIncident(full ?? row.incident);
                    } catch {
                      setViewModalIncident(row.incident);
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
parseInventoryActionFromDescription(row.incident.description) === 'record_only'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {getInventoryActionLabel(parseInventoryActionFromDescription(row.incident.description))}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                          STATUS_CLASSES[normalizeDamageStatus(row.incident.status)] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {DAMAGE_STATUS_LABELS[normalizeDamageStatus(row.incident.status)]}
                      </span>
                      {normalizeDamageStatus(row.incident.status) === 'resolved' && (() => {
                        const settlement = getSettlementFromAmounts(row.incident.chargedToGuest, row.incident.absorbedAmount);
                        return settlement ? (
                          <span className="text-[9.5px] text-gray-500">{SETTLEMENT_LABELS[settlement]}</span>
                        ) : null;
                      })()}
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
                    <div className="col-span-2 bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1">Reported by</div>
                      <div className="text-[12px] font-semibold text-gray-900">
                        {getDisplayNameForUserId(row.reportedByUserId, row.reportedByName)}
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

      {editModalIncident && (
        <DamageReportEditModal
          incident={editModalIncident}
          onClose={() => setEditModalIncident(null)}
          onSuccess={() => {
            setEditModalIncident(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}

      {viewModalIncident && (
        <DamageReportViewModal
          incident={viewModalIncident}
          unitName={
            viewModalIncident.unitId
              ? inventoryUnits.find((u) => u.id === viewModalIncident.unitId)?.name ?? viewModalIncident.unitId
              : undefined
          }
          reportedByDisplayName={getDisplayNameForUserId(
            viewModalIncident.reportedByUserId,
            viewModalIncident.reportedByName ?? viewModalIncident.reportedBy
          )}
          resolvedByDisplayName={getDisplayNameForUserId(
            viewModalIncident.resolvedByUserId ?? null,
            (viewModalIncident as { resolvedByName?: string }).resolvedByName
          )}
          onClose={() => setViewModalIncident(null)}
          onEdit={() => {
            void (async () => {
              const inc = viewModalIncident;
              setViewModalIncident(null);
              try {
                const full = await getDamageIncident(inc.id);
                setEditModalIncident(full ?? inc);
              } catch {
                setEditModalIncident(inc);
              }
            })();
          }}
        />
      )}
    </>
  );
}
