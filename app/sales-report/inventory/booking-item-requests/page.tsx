'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../../admin/components';

type ApprovalRisk = 'low' | 'medium' | 'high';
type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'partially_fulfilled'
  | 'fulfilled';

interface BookingItemRequestLineApi {
  id: string;
  productId: string;
  productName: string;
  productSku?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityFulfilled: number;
  quantityRemaining?: number;
  notes?: string | null;
}

interface BookingItemRequestApi {
  id: string;
  bookingCode: string;
  unitId?: string | null;
  status: ApprovalStatus;
  reason?: string | null;
  notes?: string | null;
  requestedBy?: string | null;
  requestedByName?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  fulfilledBy?: string | null;
  fulfilledByName?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  fulfilledAt?: string | null;
  lines: BookingItemRequestLineApi[];
  totals?: {
    requested?: number;
    approved?: number;
    fulfilled?: number;
    remaining?: number;
  };
}

interface InventoryBalanceRowApi {
  productId: string;
  warehouseId: string;
  quantity: number;
  warehouse?: {
    id: string;
    code?: string | null;
    name?: string | null;
  };
}

interface InventoryDatasetApi {
  inventory?: InventoryBalanceRowApi[];
}

interface WarehouseStockOption {
  warehouseId: string;
  label: string;
  code: string | null;
  available: number;
}

interface FulfillmentDraftLine {
  quantityToFulfill: string;
  warehouseId: string;
}

type FulfillmentDraftByLineId = Record<string, FulfillmentDraftLine>;

function getLineRemainingQuantity(line: BookingItemRequestLineApi): number {
  const approved = line.quantityApproved ?? line.quantityRequested;
  return Math.max(0, approved - (line.quantityFulfilled ?? 0));
}

function getRequestTotalRequested(request: BookingItemRequestApi): number {
  return request.lines.reduce((sum, line) => sum + line.quantityRequested, 0);
}

function computeRiskFromQuantity(quantity: number): ApprovalRisk {
  if (quantity >= 40) return 'high';
  if (quantity >= 20) return 'medium';
  return 'low';
}

function buildFulfillmentDraft(
  request: BookingItemRequestApi,
  previous: FulfillmentDraftByLineId
): FulfillmentDraftByLineId {
  const draft: FulfillmentDraftByLineId = {};
  for (const line of request.lines) {
    const remaining = getLineRemainingQuantity(line);
    if (remaining <= 0) continue;
    const prev = previous[line.id];
    draft[line.id] = {
      quantityToFulfill: prev?.quantityToFulfill ?? '',
      warehouseId: prev?.warehouseId ?? (line.warehouseId ?? ''),
    };
  }
  return draft;
}

export default function BookingItemRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requests, setRequests] = useState<BookingItemRequestApi[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('pending');
  const [riskFilter, setRiskFilter] = useState<'all' | ApprovalRisk>('all');
  const [approvalSearch, setApprovalSearch] = useState('');
  const [actioningKey, setActioningKey] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<BookingItemRequestApi | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [inventoryRows, setInventoryRows] = useState<InventoryBalanceRowApi[]>([]);
  const [fulfillmentDraft, setFulfillmentDraft] = useState<FulfillmentDraftByLineId>({});
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const bookingData = await apiClient.get<BookingItemRequestApi[]>(
        '/api/market/booking-item-requests?status=all'
      );
      setRequests(Array.isArray(bookingData) ? bookingData : []);
    } catch (err) {
      setRequests([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load booking item requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequestDetailWorkspace = useCallback(
    async (requestId: string, preserveDraft: boolean) => {
      setSelectedRequestId(requestId);
      setDetailLoading(true);
      setDetailError(null);
      setFulfillmentError(null);

      try {
        const [request, inventoryData] = await Promise.all([
          apiClient.get<BookingItemRequestApi>(`/api/market/booking-item-requests/${requestId}`),
          apiClient.get<InventoryDatasetApi>('/api/market/inventory'),
        ]);

        setDetailRequest(request);
        setInventoryRows(Array.isArray(inventoryData?.inventory) ? inventoryData.inventory : []);
        setFulfillmentDraft((previous) =>
          buildFulfillmentDraft(request, preserveDraft ? previous : {})
        );
      } catch (error) {
        setDetailRequest(null);
        setDetailError(error instanceof Error ? error.message : 'Unable to load request details.');
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedRequestId || detailLoading) return;
    const lightweight = requests.find((r) => r.id === selectedRequestId);
    if (!lightweight) return;

    setDetailRequest((current) => {
      if (!current || current.id !== lightweight.id) return current;
      return {
        ...current,
        status: lightweight.status,
        reviewedBy: lightweight.reviewedBy,
        reviewedByName: lightweight.reviewedByName,
        reviewedAt: lightweight.reviewedAt,
        fulfilledBy: lightweight.fulfilledBy,
        fulfilledByName: lightweight.fulfilledByName,
        fulfilledAt: lightweight.fulfilledAt,
        totals: lightweight.totals,
      };
    });
  }, [requests, selectedRequestId, detailLoading]);

  const reviewRequest = async (
    entry: BookingItemRequestApi,
    status: Extract<ApprovalStatus, 'approved' | 'rejected'>
  ) => {
    setActioningKey(entry.id);
    try {
      if (status === 'approved') {
        await apiClient.patch(`/api/market/booking-item-requests/${entry.id}/approve`, {});
      } else {
        await apiClient.patch(`/api/market/booking-item-requests/${entry.id}/reject`, {});
      }
      await loadRequests();
      if (selectedRequestId === entry.id) {
        await loadRequestDetailWorkspace(entry.id, true);
      }
    } catch {
      // keep UI state on error
    } finally {
      setActioningKey(null);
    }
  };

  const openRequestLineDetails = async (entry: BookingItemRequestApi) => {
    setFulfillmentNotes('');
    await loadRequestDetailWorkspace(entry.id, false);
  };

  const closeRequestLineDetails = () => {
    setSelectedRequestId(null);
    setDetailRequest(null);
    setDetailError(null);
    setFulfillmentError(null);
    setFulfillmentNotes('');
    setFulfillmentDraft({});
  };

  const setDraftWarehouseForLine = (line: BookingItemRequestLineApi, warehouseId: string) => {
    setFulfillmentDraft((previous) => ({
      ...previous,
      [line.id]: {
        quantityToFulfill: previous[line.id]?.quantityToFulfill ?? '',
        warehouseId,
      },
    }));
  };

  const setDraftQuantityForLine = (line: BookingItemRequestLineApi, quantityInput: string) => {
    const normalized = quantityInput.replace(/[^\d]/g, '');
    setFulfillmentDraft((previous) => ({
      ...previous,
      [line.id]: {
        quantityToFulfill: normalized,
        warehouseId: previous[line.id]?.warehouseId ?? (line.warehouseId ?? ''),
      },
    }));
  };

  const setDraftQuantityToRemaining = (line: BookingItemRequestLineApi) => {
    const remaining = getLineRemainingQuantity(line);
    setFulfillmentDraft((previous) => ({
      ...previous,
      [line.id]: {
        quantityToFulfill: String(remaining),
        warehouseId: previous[line.id]?.warehouseId ?? (line.warehouseId ?? ''),
      },
    }));
  };

  const clearDraftLine = (line: BookingItemRequestLineApi) => {
    setFulfillmentDraft((previous) => ({
      ...previous,
      [line.id]: {
        quantityToFulfill: '',
        warehouseId: previous[line.id]?.warehouseId ?? (line.warehouseId ?? ''),
      },
    }));
  };

  const submitPartialFulfillment = async () => {
    if (!detailRequest) return;

    const canFulfillRequest =
      detailRequest.status === 'approved' || detailRequest.status === 'partially_fulfilled';
    if (!canFulfillRequest) {
      setFulfillmentError('Only approved requests can be fulfilled.');
      return;
    }

    const items: Array<{
      lineId: string;
      quantityFulfilled: number;
      warehouseId: string;
    }> = [];

    for (const line of detailRequest.lines) {
      const remaining = getLineRemainingQuantity(line);
      if (remaining <= 0) continue;

      const draftLine = fulfillmentDraft[line.id];
      const qtyText = (draftLine?.quantityToFulfill ?? '').trim();
      if (!qtyText) continue;

      const quantity = Number(qtyText);
      if (!Number.isInteger(quantity) || quantity < 0) {
        setFulfillmentError(`Quantity must be a whole number for ${line.productName}.`);
        return;
      }
      if (quantity === 0) continue;

      if (quantity > remaining) {
        setFulfillmentError(
          `Line ${line.productName} exceeds remaining quantity (${remaining}).`
        );
        return;
      }

      const warehouseId = (draftLine?.warehouseId ?? line.warehouseId ?? '').trim();
      if (!warehouseId) {
        setFulfillmentError(`Select a warehouse for ${line.productName}.`);
        return;
      }

      items.push({
        lineId: line.id,
        quantityFulfilled: quantity,
        warehouseId,
      });
    }

    if (items.length === 0) {
      setFulfillmentError('Enter at least one line quantity to fulfill.');
      return;
    }

    const detailKey = `detail:${detailRequest.id}`;
    setActioningKey(detailKey);
    setFulfillmentError(null);

    try {
      await apiClient.post(`/api/market/booking-item-requests/${detailRequest.id}/fulfill`, {
        notes: fulfillmentNotes.trim() || undefined,
        items,
      });

      await loadRequests();
      await loadRequestDetailWorkspace(detailRequest.id, false);
    } catch (error) {
      setFulfillmentError(error instanceof Error ? error.message : 'Unable to fulfill request.');
    } finally {
      setActioningKey(null);
    }
  };

  const stockByProductWarehouseKey = useMemo(() => {
    const map = new Map<string, number>();
    inventoryRows.forEach((row) => {
      const key = `${row.productId}:${row.warehouseId}`;
      map.set(key, Number(row.quantity ?? 0));
    });
    return map;
  }, [inventoryRows]);

  const warehouseOptionsByProduct = useMemo(() => {
    const map = new Map<string, WarehouseStockOption[]>();
    inventoryRows.forEach((row) => {
      const current = map.get(row.productId) ?? [];
      const label = row.warehouse?.name?.trim() || row.warehouseId;
      const code = typeof row.warehouse?.code === 'string' ? row.warehouse.code : null;
      current.push({
        warehouseId: row.warehouseId,
        label,
        code,
        available: Number(row.quantity ?? 0),
      });
      map.set(row.productId, current);
    });
    map.forEach((options, productId) => {
      const deduped = Array.from(
        options.reduce((acc, option) => acc.set(option.warehouseId, option), new Map<string, WarehouseStockOption>()).values()
      ).sort((a, b) => b.available - a.available);
      map.set(productId, deduped);
    });
    return map;
  }, [inventoryRows]);

  const getWarehouseOptionsForLine = useCallback(
    (line: BookingItemRequestLineApi): WarehouseStockOption[] => {
      const base = [...(warehouseOptionsByProduct.get(line.productId) ?? [])];
      const fallbackWarehouseId = (line.warehouseId ?? '').trim();
      if (fallbackWarehouseId && !base.some((option) => option.warehouseId === fallbackWarehouseId)) {
        base.push({
          warehouseId: fallbackWarehouseId,
          label: line.warehouseName?.trim() || fallbackWarehouseId,
          code: null,
          available: Number(
            stockByProductWarehouseKey.get(`${line.productId}:${fallbackWarehouseId}`) ?? 0
          ),
        });
      }
      return base.sort((a, b) => b.available - a.available);
    },
    [warehouseOptionsByProduct, stockByProductWarehouseKey]
  );

  const filteredRequests = useMemo(() => {
    const normalizedSearch = approvalSearch.trim().toLowerCase();
    return requests.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      const totalQty = entry.totals?.requested ?? getRequestTotalRequested(entry);
      const risk = computeRiskFromQuantity(totalQty);
      if (riskFilter !== 'all' && risk !== riskFilter) return false;
      if (!normalizedSearch) return true;
      return (
        entry.id.toLowerCase().includes(normalizedSearch) ||
        entry.bookingCode.toLowerCase().includes(normalizedSearch) ||
        (entry.requestedByName ?? entry.requestedBy ?? '').toLowerCase().includes(normalizedSearch) ||
        entry.lines.some((l) => l.productName.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [requests, statusFilter, riskFilter, approvalSearch]);

  const hasActiveFilters =
    statusFilter !== 'pending' ||
    riskFilter !== 'all' ||
    approvalSearch.trim().length > 0;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const highRiskPending = requests.filter((r) => {
    if (r.status !== 'pending') return false;
    const total = r.totals?.requested ?? getRequestTotalRequested(r);
    return computeRiskFromQuantity(total) === 'high';
  }).length;
  const approvedCount = requests.filter(
    (r) =>
      r.status === 'approved' ||
      r.status === 'partially_fulfilled' ||
      r.status === 'fulfilled'
  ).length;

  const detailCanFulfill =
    detailRequest?.status === 'approved' || detailRequest?.status === 'partially_fulfilled';
  const detailActionKey = detailRequest ? `detail:${detailRequest.id}` : null;
  const detailActionInProgress = detailActionKey !== null && actioningKey === detailActionKey;

  const resetFilters = () => {
    setStatusFilter('pending');
    setRiskFilter('all');
    setApprovalSearch('');
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link href="/sales-report" className="text-[#0B5858] hover:underline">
          Sales Report
        </Link>
        <span className="text-gray-400">/</span>
        <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
          Inventory
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Booking Item Requests</span>
      </nav>

      <AdminPageHeader
        title="Booking Item Requests"
        description="Review and fulfill inventory requests linked to guest bookings. Approve or reject requests, then fulfill approved items by selecting warehouse stock and quantities."
      />

      {loadError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <strong>Failed to load:</strong> {loadError}
          <span className="ml-2 text-red-600">
            Ensure market-backend is running (e.g. <code className="rounded bg-red-100 px-1">npm run dev</code> on port 4000).
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Pending Requests" value={loading ? '—' : pendingCount} accent="amber" />
        <AdminStatCard label="High Risk Pending" value={loading ? '—' : highRiskPending} accent="red" />
        <AdminStatCard label="Approved / Fulfilled" value={loading ? '—' : approvedCount} accent="teal" />
      </div>

      <AdminSection title="Requests">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | ApprovalStatus)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="partially_fulfilled">Partially Fulfilled</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Risk</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as 'all' | ApprovalRisk)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
              >
                <option value="all">All risk</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Search</span>
              <input
                value={approvalSearch}
                onChange={(e) => setApprovalSearch(e.target.value)}
                placeholder="Booking, requester, product"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                aria-label="Search requests"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-600">
              {loading ? 'Loading…' : (
                <>
                  Showing <span className="font-semibold text-gray-800">{filteredRequests.length}</span> of{' '}
                  <span className="font-semibold text-gray-800">{requests.length}</span> requests
                </>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadRequests()}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset filters
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 960, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
              <tr>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Booking</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Items</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Qty</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Risk</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Requested By</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((entry) => {
                const totalQty = entry.totals?.requested ?? getRequestTotalRequested(entry);
                const risk = computeRiskFromQuantity(totalQty);
                const itemSummary =
                  entry.lines.length === 1
                    ? `${entry.lines[0].productName} x${entry.lines[0].quantityRequested}`
                    : `${entry.lines[0]?.productName ?? 'Items'} (+${entry.lines.length - 1} more)`;
                const isBusy = actioningKey === entry.id;
                const canApprove = entry.status === 'pending';
                const canReject = entry.status === 'pending';
                const detailsLabel =
                  entry.status === 'approved' || entry.status === 'partially_fulfilled'
                    ? 'Fulfill details'
                    : 'Line details';

                return (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-b-0 align-top">
                    <td className="px-4 py-3 overflow-hidden">
                      <div className="font-semibold text-gray-900 truncate">{entry.bookingCode}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{entry.id.toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">{entry.reason ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 overflow-hidden">
                      <div className="font-medium text-gray-800 truncate">{itemSummary}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800 tabular-nums">{totalQty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold shrink-0 ${
                          risk === 'high'
                            ? 'bg-red-100 text-red-700'
                            : risk === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 overflow-hidden">
                      <div className="truncate">{entry.requestedByName ?? entry.requestedBy ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(entry.requestedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 overflow-hidden">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold shrink-0 ${
                          entry.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : entry.status === 'fulfilled'
                            ? 'bg-teal-100 text-teal-700'
                            : entry.status === 'partially_fulfilled'
                            ? 'bg-cyan-100 text-cyan-700'
                            : entry.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.status.replace('_', ' ')}
                      </span>
                      {entry.reviewedBy && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {entry.reviewedBy} at{' '}
                          {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : '—'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 flex-nowrap">
                        <button
                          type="button"
                          disabled={!canApprove || isBusy}
                          onClick={() => void reviewRequest(entry, 'approved')}
                          className="shrink-0 px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4] disabled:opacity-40"
                        >
                          {isBusy ? '...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={!canReject || isBusy}
                          onClick={() => void reviewRequest(entry, 'rejected')}
                          className="shrink-0 px-2.5 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          {isBusy ? '...' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void openRequestLineDetails(entry)}
                          className="shrink-0 px-2.5 py-1.5 rounded border border-cyan-200 text-xs text-cyan-700 hover:bg-cyan-50 disabled:opacity-40"
                        >
                          {detailsLabel}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                    No booking item requests match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection
        title="Request Line Details"
        subtitle="Per-product and per-warehouse view for controlled partial fulfillment."
        className="mt-6"
        headerAction={
          selectedRequestId ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectedRequestId && void loadRequestDetailWorkspace(selectedRequestId, true)}
                disabled={detailLoading || detailActionInProgress}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Refresh details
              </button>
              <button
                type="button"
                onClick={closeRequestLineDetails}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          ) : undefined
        }
      >
        {!selectedRequestId ? (
          <div className="px-5 py-6 text-sm text-gray-600">
            Select a booking item request from the table to view per-line remaining quantity,
            inspect warehouse stock, and submit partial fulfillment with explicit warehouse picks.
          </div>
        ) : null}

        {selectedRequestId && detailLoading ? (
          <div className="px-5 py-6 text-sm text-gray-600">Loading line details...</div>
        ) : null}

        {selectedRequestId && !detailLoading && detailError ? (
          <div className="px-5 py-6">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {detailError}
            </div>
          </div>
        ) : null}

        {selectedRequestId && !detailLoading && detailRequest ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-5 border-b border-gray-100 bg-gray-50/60">
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Booking</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{detailRequest.bookingCode}</div>
                <div className="text-xs text-gray-500 mt-0.5">Request {detailRequest.id.toUpperCase()}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Status</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 capitalize">{detailRequest.status.replace('_', ' ')}</div>
                <div className="text-xs text-gray-500 mt-0.5">Requested by {detailRequest.requestedByName ?? detailRequest.requestedBy ?? '—'}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Requested Qty</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">
                  {Number(detailRequest.totals?.requested ?? getRequestTotalRequested(detailRequest))}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Approved Qty</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">
                  {Number(detailRequest.totals?.approved ?? 0)}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Remaining Qty</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 tabular-nums">
                  {Number(
                    detailRequest.totals?.remaining ??
                      detailRequest.lines.reduce((sum, line) => sum + getLineRemainingQuantity(line), 0)
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 1240, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Product</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Req</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Appr</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Done</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Remain</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Warehouse Pick</th>
                    <th className="px-4 py-3 text-left text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Warehouse Stock</th>
                    <th className="px-4 py-3 text-right text-gray-600 uppercase tracking-wider text-[10px] font-semibold">Fulfill Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRequest.lines.map((line) => {
                    const remaining = getLineRemainingQuantity(line);
                    const approved = Number(line.quantityApproved ?? line.quantityRequested);
                    const options = getWarehouseOptionsForLine(line);
                    const draftLine = fulfillmentDraft[line.id] ?? {
                      quantityToFulfill: '',
                      warehouseId: line.warehouseId ?? '',
                    };
                    const selectedWarehouseId = (draftLine.warehouseId ?? line.warehouseId ?? '').trim();
                    const selectedSnapshot = selectedWarehouseId
                      ? stockByProductWarehouseKey.get(`${line.productId}:${selectedWarehouseId}`)
                      : undefined;
                    const canEditLine = detailCanFulfill && remaining > 0 && !detailActionInProgress;
                    const maxHint =
                      selectedWarehouseId && typeof selectedSnapshot === 'number'
                        ? `Snapshot: ${selectedSnapshot} available`
                        : 'Snapshot unavailable for selected warehouse';

                    return (
                      <tr key={line.id} className="border-b border-gray-100 last:border-b-0 align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{line.productName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {line.productSku ? `SKU ${line.productSku}` : 'No SKU'}
                          </div>
                          {line.notes ? <div className="text-xs text-gray-500 mt-1">{line.notes}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-gray-700 tabular-nums">{line.quantityRequested}</td>
                        <td className="px-4 py-3 text-gray-700 tabular-nums">{approved}</td>
                        <td className="px-4 py-3 text-gray-700 tabular-nums">{line.quantityFulfilled}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                              remaining > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {remaining}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={draftLine.warehouseId}
                            onChange={(e) => setDraftWarehouseForLine(line, e.target.value)}
                            disabled={!canEditLine}
                            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] disabled:opacity-60"
                          >
                            <option value="">Select warehouse</option>
                            {options.map((option) => (
                              <option key={option.warehouseId} value={option.warehouseId}>
                                {option.label}
                                {option.code ? ` (${option.code})` : ''}
                                {` - ${option.available}`}
                              </option>
                            ))}
                          </select>
                          <div className="text-[11px] text-gray-500 mt-1">{maxHint}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {options.slice(0, 4).map((option) => (
                              <span
                                key={`${line.id}:${option.warehouseId}`}
                                className="inline-flex rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600"
                              >
                                {option.label}: {option.available}
                              </span>
                            ))}
                            {options.length === 0 ? (
                              <span className="text-xs text-gray-500">No warehouse balances found</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={draftLine.quantityToFulfill}
                              onChange={(e) => setDraftQuantityForLine(line, e.target.value)}
                              disabled={!canEditLine}
                              placeholder="0"
                              className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-xs bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setDraftQuantityToRemaining(line)}
                              disabled={!canEditLine}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Max
                            </button>
                            <button
                              type="button"
                              onClick={() => clearDraftLine(line)}
                              disabled={!canEditLine}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Clear
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/60 space-y-3">
              {!detailCanFulfill ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {detailRequest.status === 'pending'
                    ? 'Approve this request first before submitting fulfillment quantities.'
                    : detailRequest.status === 'rejected'
                    ? 'Rejected requests cannot be fulfilled.'
                    : 'This request is fully fulfilled.'}
                </div>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  Fulfillment Notes
                </span>
                <textarea
                  rows={2}
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  disabled={!detailCanFulfill || detailActionInProgress}
                  placeholder="Optional note for this partial fulfillment"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] disabled:opacity-60"
                />
              </label>

              {fulfillmentError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {fulfillmentError}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    selectedRequestId && void loadRequestDetailWorkspace(selectedRequestId, false)
                  }
                  disabled={detailLoading || detailActionInProgress}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Reset draft
                </button>
                <button
                  type="button"
                  onClick={() => void submitPartialFulfillment()}
                  disabled={!detailCanFulfill || detailActionInProgress}
                  className="px-3 py-2 rounded-lg border border-cyan-200 bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {detailActionInProgress ? 'Submitting...' : 'Submit Partial Fulfillment'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </AdminSection>
    </div>
  );
}
