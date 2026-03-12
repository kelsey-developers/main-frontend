'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadInventoryDataset,
  inventoryPurchaseOrders,
  inventoryItems,
  inventorySuppliers,
} from '../../inventory/lib/inventoryDataStore';
import { apiClient } from '@/lib/api/client';
import type { PurchaseOrder } from '../../inventory/types';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';
import { useToast } from '../../inventory/hooks/useToast';

type POStatus = PurchaseOrder['status'];

export default function AdminReplenishmentPage() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<'all' | POStatus>('all');
  const [workflowSupplierFilter, setWorkflowSupplierFilter] = useState<'all' | string>('all');
  const [workflowSearch, setWorkflowSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    loadInventoryDataset(true)
      .then(() => {
        if (mounted) setOrders([...inventoryPurchaseOrders]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const refresh = () => {
      void loadInventoryDataset(true).then(() => {
        if (mounted) setOrders([...inventoryPurchaseOrders]);
      });
    };
    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('inventory:dataset-updated', refresh);

    return () => {
      mounted = false;
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('inventory:dataset-updated', refresh);
    };
  }, []);

  const lowStockItems = useMemo(
    () => inventoryItems.filter((item) => item.shortfall > 0).slice(0, 8),
    [orders]
  );

  const counts = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((e) => e.status === 'pending').length,
      partial: orders.filter((e) => e.status === 'partially-received').length,
      received: orders.filter((e) => e.status === 'received').length,
      cancelled: orders.filter((e) => e.status === 'cancelled').length,
    }),
    [orders]
  );

  const handleCancelPO = async (order: PurchaseOrder) => {
    if (
      !confirm(
        `Cancel Purchase Order ${order.id.toUpperCase()}? This cannot be undone.`
      )
    ) {
      return;
    }
    setCancellingId(order.id);
    try {
      await apiClient.patch(`/api/purchase-orders/${order.id}`, {
        status: 'CANCELLED',
      });
      await loadInventoryDataset(true);
      setOrders([...inventoryPurchaseOrders]);
      success(`PO ${order.id.toUpperCase()} cancelled.`);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Cancel PO error:', err);
      }
      error('Could not cancel the purchase order. Try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const resetWorkflowFilters = () => {
    setWorkflowStatusFilter('all');
    setWorkflowSupplierFilter('all');
    setWorkflowSearch('');
  };

  const filteredOrders = useMemo(() => {
    const q = workflowSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (workflowStatusFilter !== 'all' && order.status !== workflowStatusFilter)
        return false;
      if (workflowSupplierFilter !== 'all' && order.supplierId !== workflowSupplierFilter)
        return false;
      if (!q) return true;
      const supplierName =
        inventorySuppliers.find((s) => s.id === order.supplierId)?.name ?? '';
      return (
        order.id.toLowerCase().includes(q) ||
        supplierName.toLowerCase().includes(q)
      );
    });
  }, [orders, workflowSearch, workflowStatusFilter, workflowSupplierFilter]);

  const hasActiveWorkflowFilters =
    workflowStatusFilter !== 'all' ||
    workflowSupplierFilter !== 'all' ||
    workflowSearch.trim().length > 0;

  const statCards = [
    { label: 'Total', value: counts.total, accent: 'teal' as const },
    { label: 'Pending', value: counts.pending, accent: 'amber' as const },
    { label: 'Partially Received', value: counts.partial, accent: 'orange' as const },
    { label: 'Received', value: counts.received, accent: 'green' as const },
    { label: 'Cancelled', value: counts.cancelled, accent: 'red' as const },
  ];

  const firstLowStockItemId = lowStockItems[0]?.id;

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <AdminPageHeader
          title="Replenishment Control"
          description="Admin view of PO lifecycle. Create and receive (including partial) in Inventory → Purchase Orders so quantities and evidence are recorded correctly."
        />
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/sales-report/inventory/purchase-orders"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#0B5858]/20"
          >
            Open PO list
          </Link>
          <Link
            href={
              firstLowStockItemId
                ? `/sales-report/inventory/purchase-orders/create?itemId=${firstLowStockItemId}`
                : '/sales-report/inventory/purchase-orders/create'
            }
            className="px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a]"
          >
            {firstLowStockItemId ? 'Create PO (from low-stock)' : 'Create PO'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((entry) => (
          <AdminStatCard
            key={entry.label}
            label={entry.label}
            value={loading ? '—' : entry.value}
            accent={entry.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-6 mb-6">
        <AdminSection
          title="Low-stock items"
          subtitle="Create a PO from Inventory to record quantities and receipts."
        >
          <div className="px-5 py-4 space-y-3">
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-gray-500">
                No low-stock items. Use Inventory → Purchase Orders to create POs.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Quick link to create a PO for a low-stock item:
                </p>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  <option value="">Select item</option>
                  {lowStockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (shortfall {item.shortfall})
                    </option>
                  ))}
                </select>
                <Link
                  href={
                    selectedItemId
                      ? `/sales-report/inventory/purchase-orders/create?itemId=${selectedItemId}`
                      : '/sales-report/inventory/purchase-orders/create'
                  }
                  className="block w-full px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a] text-center"
                >
                  Create PO in Inventory
                </Link>
              </>
            )}
          </div>
        </AdminSection>

        <AdminSection
          title="PO workflow"
          subtitle="Receive and cancel. Receiving is done in Inventory so quantities and evidence are saved."
        >
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </span>
                <select
                  value={workflowStatusFilter}
                  onChange={(e) =>
                    setWorkflowStatusFilter(e.target.value as 'all' | POStatus)
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Filter by PO status"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partially-received">Partially received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Supplier
                </span>
                <select
                  value={workflowSupplierFilter}
                  onChange={(e) => setWorkflowSupplierFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Filter by supplier"
                >
                  <option value="all">All suppliers</option>
                  {inventorySuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Search
                </span>
                <input
                  value={workflowSearch}
                  onChange={(e) => setWorkflowSearch(e.target.value)}
                  placeholder="PO id or supplier"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Search purchase orders"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-gray-600">
                Showing{' '}
                <span className="font-semibold text-gray-800">
                  {filteredOrders.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-800">{orders.length}</span>{' '}
                purchase orders
              </p>
              <button
                type="button"
                onClick={resetWorkflowFilters}
                disabled={!hasActiveWorkflowFilters}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
                <tr>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">
                    PO
                  </th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const supplier = inventorySuppliers.find(
                    (s) => s.id === order.supplierId
                  );
                  const canReceive =
                    order.status === 'pending' ||
                    order.status === 'partially-received';
                  const canCancel =
                    order.status !== 'cancelled' && order.status !== 'received';
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {order.id.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {supplier?.name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.expectedDelivery}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                            order.status === 'received'
                              ? 'bg-green-100 text-green-700'
                              : order.status === 'partially-received'
                              ? 'bg-orange-100 text-orange-700'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {canReceive && (
                            <Link
                              href={`/sales-report/inventory/purchase-orders?poId=${order.id}`}
                              className="px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4]"
                            >
                              Receive
                            </Link>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelPO(order)}
                              disabled={cancellingId === order.id}
                              className="px-2.5 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancellingId === order.id ? 'Cancelling…' : 'Cancel PO'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      {loading
                        ? 'Loading…'
                        : 'No purchase orders match the selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Low stock replenishment priority
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full">
              No low-stock items right now.
            </p>
          ) : (
            lowStockItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-3"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {item.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Current: {item.currentStock} {item.unit} | Min: {item.minStock}{' '}
                  {item.unit}
                </div>
                <div className="text-xs text-amber-700 mt-1 font-semibold">
                  Shortfall: {item.shortfall}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
