'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import SummaryCard from '../components/SummaryCard';
import DamageReportModal from '../components/DamageReportModal';
import AuditTrailModal from '../components/AuditTrailModal';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import { useToast } from '../hooks/useToast';
import NoneBadge, { isNoneLike } from '../components/NoneBadge';
import { useProductNames } from '../hooks/useProductNames';
import {
  listDamageIncidents,
  getDamageIncident,
  type DamageIncident,
  type LostBrokenItem,
} from '@/lib/api/damageIncidents';
import { inventoryUnits, inventoryItems, loadInventoryDataset } from '../lib/inventoryDataStore';
import type { ReplenishmentItem } from '../types';

type DamageReportRow = {
  id: string;
  incidentId: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  unitId?: string;
  unitName?: string;
  writeOffType: 'warehouse' | 'unit';
  quantity: number;
  severity?: string;
  status?: string;
  reportedAt: string;
  reportedBy: string;
  notes?: string;
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border border-amber-200',
  'in-review': 'bg-blue-50 text-blue-700 border border-blue-200',
  resolved: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const SEVERITY_CLASSES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 border border-gray-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-red-50 text-red-700 border border-red-200',
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

function flattenIncidentsToRows(incidents: DamageIncident[]): DamageReportRow[] {
  const byUnit = new Map(inventoryUnits.map((u) => [u.id, u.name]));

  const rows: DamageReportRow[] = [];

  for (const incident of incidents) {
    const items: LostBrokenItem[] = incident.items ?? [];
    const reportedAt =
      incident.reportDate ?? incident.dateReported ?? incident.createdAt ?? '';
    const reportedBy = incident.reportedBy ?? '—';
    const status = incident.status ?? '';

    if (items.length === 0) {
      rows.push({
        id: incident.id,
        incidentId: incident.id,
        productId: '',
        productName: '—',
        warehouseId: '',
        warehouseName: '—',
        writeOffType: 'warehouse',
        quantity: 0,
        status,
        reportedAt,
        reportedBy,
        notes: incident.description,
      });
      continue;
    }

    for (const item of items) {
      const unitId = item.unitId;
      const writeOffType: 'warehouse' | 'unit' = unitId ? 'unit' : 'warehouse';
      const rowId = item.id ? `${incident.id}-${item.id}` : `${incident.id}-${item.productId}-${item.quantity}`;

      rows.push({
        id: rowId,
        incidentId: incident.id,
        productId: item.productId,
        productName: '', // Filled by useProductNames
        warehouseId: '',
        warehouseName: '—',
        unitId,
        unitName: unitId ? (byUnit.get(unitId) ?? unitId) : undefined,
        writeOffType,
        quantity: item.quantity,
        status,
        reportedAt,
        reportedBy,
        notes: incident.description,
      });
    }
  }

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
  const [auditItem, setAuditItem] = useState<ReplenishmentItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Warehouse' | 'Unit'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState<DamageIncident[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isServerDown, setIsServerDown] = useState(false);

  const { error: showError } = useToast();

  useEffect(() => {
    void loadInventoryDataset();
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
        const msg = err instanceof Error ? err.message : 'Failed to load damage reports.';
        setFetchError(msg);
        const isConfigError =
          /MARKET_API_URL|not configured|damage-incidents/i.test(msg);
        setIsServerDown(!isConfigError);
        showError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [refreshTick, showError]);

  const rawRows = useMemo(
    () => flattenIncidentsToRows(incidents),
    [incidents]
  );

  const productIds = useMemo(
    () => [...new Set(rawRows.map((r) => r.productId).filter(Boolean))],
    [rawRows]
  );

  const productNames = useProductNames(productIds);

  const rows = useMemo<DamageReportRow[]>(() => {
    return rawRows.map((r) => ({
      ...r,
      productName:
        r.productId && productNames[r.productId]
          ? productNames[r.productId]
          : r.productId
            ? `Product #${r.productId}`
            : r.productName || '—',
    }));
  }, [rawRows, productNames]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (typeFilter !== 'All') {
      const target = typeFilter.toLowerCase() as 'warehouse' | 'unit';
      list = list.filter((r) => r.writeOffType === target);
    }
    if (statusFilter !== 'all') {
      list = list.filter(
        (r) => (r.status ?? '').toLowerCase() === statusFilter.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.warehouseName.toLowerCase().includes(q) ||
          r.unitName?.toLowerCase().includes(q) ||
          r.reportedBy.toLowerCase().includes(q)
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
  }, [rows, typeFilter, statusFilter, search, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const total = rows.length;
    const warehouse = rows.filter((r) => r.writeOffType === 'warehouse').length;
    const unit = rows.filter((r) => r.writeOffType === 'unit').length;
    return { total, warehouse, unit };
  }, [rows]);

  const statusOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.status) seen.add(r.status);
    }
    return [
      { value: 'all', label: 'All statuses' },
      ...Array.from(seen)
        .sort()
        .map((s) => ({ value: s, label: s })),
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
            View and create warehouse or unit write-offs for damaged inventory.
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
            label: 'Warehouse write-offs',
            value: totals.warehouse,
            gradient: 'from-[#05807e] to-[#0B5858]',
          },
          {
            label: 'Unit write-offs',
            value: totals.unit,
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
            placeholder="Search by product, warehouse, unit, or reporter…"
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
          <div className="inline-flex gap-1 bg-white border-[1.5px] border-gray-200 rounded-lg p-1">
            {(['All', 'Warehouse', 'Unit'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTypeFilter(option)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  typeFilter === option
                    ? 'bg-[#05807e] text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {option}
              </button>
            ))}
          </div>

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
                  <p className="text-sm text-gray-500">Please try again later.</p>
                </>
              ) : (
                <>
                  <div className="font-semibold mb-2 text-amber-700">Could not load damage reports</div>
                  <p className="text-sm text-gray-600">{fetchError}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Ensure MARKET_API_URL is configured and the damage-incidents API is available.
                  </p>
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
                Create a warehouse or unit write-off when items are damaged using the button
                above.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Desktop Header */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_0.9fr_0.9fr_90px_70px_90px_90px_1.2fr_70px] px-4 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]">
              {[
                'PRODUCT',
                'WAREHOUSE',
                'UNIT / LOCATION',
                'TYPE',
                'QTY',
                'SEVERITY',
                'STATUS',
                'REPORTED',
                '',
              ].map((h, i) => (
                <div
                  key={h}
                  className={`text-[10.5px] font-semibold tracking-wider text-white/70 ${
                    i >= 3 && i <= 5 ? 'text-center' : ''
                  }`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div>
              {filteredRows.map((row, idx) => {
                const isLast = idx === filteredRows.length - 1;
                return (
                  <div
                    key={row.id}
                    className="damage-row grid grid-cols-1 lg:grid-cols-[1fr_0.9fr_0.9fr_90px_70px_90px_90px_1.2fr_70px] gap-3 lg:gap-0 px-4 py-4 border-b border-gray-100 last:border-b-0 bg-white transition-colors"
                  >
                    <div
                      className="font-semibold text-gray-900 text-[13px]"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const invItem = inventoryItems.find((i) => i.id === row.productId);
                          if (invItem) {
                            setAuditItem(invItem);
                          } else {
                            const minimal: ReplenishmentItem = {
                              id: row.productId,
                              sku: row.productId,
                              name: row.productName,
                              type: 'consumable',
                              category: 'Other',
                              unit: 'pcs',
                              currentStock: 0,
                              minStock: 0,
                              shortfall: 0,
                              unitCost: 0,
                              totalValue: 0,
                              warehouseId: '',
                              warehouseName: '—',
                              isActive: true,
                              createdAt: '',
                              updatedAt: '',
                              currentsupplierId: '',
                              supplierName: '',
                            };
                            setAuditItem(minimal);
                          }
                        }}
                        className="text-[#05807e] hover:underline text-left cursor-pointer"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {row.productName}
                      </button>
                    </div>
                    <div
                      className="text-[13px] text-gray-700"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {isNoneLike(row.warehouseName) ? <NoneBadge /> : row.warehouseName}
                    </div>
                    <div
                      className="text-[13px] text-gray-600"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName}
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide ${
                          row.writeOffType === 'warehouse'
                            ? 'bg-[#e8f4f4] text-[#0b5858] border border-[#cce8e8]'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {row.writeOffType === 'warehouse' ? 'Warehouse' : 'Unit'}
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-center text-[14px] font-bold text-[#0b5858]"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {row.quantity}
                    </div>
                    <div className="flex items-center justify-center">
                      {row.severity ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                            SEVERITY_CLASSES[row.severity] ?? 'bg-gray-100 text-gray-700'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {row.severity}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {row.status ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                            STATUS_CLASSES[row.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {row.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                      <div
                        className="text-[12.5px] text-gray-600"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {formatDate(row.reportedAt)}
                      </div>
                      <div
                        className="text-[11px] text-gray-500"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {row.reportedBy}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={async () => {
                          const inc = incidents.find((i) => i.id === row.incidentId);
                          if (inc) {
                            try {
                              const full = await getDamageIncident(inc.id);
                              setEditIncident(full ?? inc);
                            } catch {
                              setEditIncident(inc);
                            }
                            setModalOpen(true);
                          }
                        }}
                        className="text-[#05807e] hover:text-[#0b5858] transition-all duration-150 p-1.5 rounded hover:bg-[#e8f4f4] hover:scale-105 active:scale-95"
                        title="Edit damage report"
                        aria-label="Edit damage report"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.333 2.00004C11.5084 1.82463 11.7163 1.68648 11.9451 1.59347C12.1738 1.50046 12.4191 1.45435 12.6663 1.45435C12.9136 1.45435 13.1589 1.50046 13.3876 1.59347C13.6164 1.68648 13.8243 1.82463 13.9997 2.00004C14.1751 2.17546 14.3132 2.38334 14.4062 2.61209C14.4992 2.84084 14.5453 3.08618 14.5453 3.33337C14.5453 3.58057 14.4992 3.82591 14.4062 4.05466C14.3132 4.28341 14.1751 4.49129 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* Mobile stats */}
                    <div className="lg:hidden grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <div className="bg-[#e8f4f4] rounded-lg p-2">
                        <div
                          className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          Type
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            row.writeOffType === 'warehouse'
                              ? 'bg-[#e8f4f4] text-[#0b5858] border border-[#cce8e8]'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {row.writeOffType === 'warehouse' ? 'Warehouse' : 'Unit'}
                        </span>
                      </div>
                      <div className="bg-[#e8f4f4] rounded-lg p-2">
                        <div
                          className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          Qty
                        </div>
                        <div
                          className="text-[15px] font-bold text-[#0b5858]"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {row.quantity}
                        </div>
                      </div>
                      <div className="bg-[#e8f4f4] rounded-lg p-2">
                        <div
                          className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          Reported
                        </div>
                        <div
                          className="text-[11px] font-semibold text-gray-700"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {formatDate(row.reportedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

      {auditItem && (
        <AuditTrailModal
          item={auditItem}
          onClose={() => setAuditItem(null)}
        />
      )}
    </>
  );
}
