'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { inventoryPurchaseOrders, inventoryItems, inventorySuppliers } from '../../inventory/lib/inventoryDataStore';
import type { PurchaseOrder } from '../../inventory/types';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

type POStatus = PurchaseOrder['status'];

export default function AdminReplenishmentPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => [...inventoryPurchaseOrders]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<'all' | POStatus>('all');
  const [workflowSupplierFilter, setWorkflowSupplierFilter] = useState<'all' | string>('all');
  const [workflowSearch, setWorkflowSearch] = useState('');

  const lowStockItems = useMemo(
    () => inventoryItems.filter((item) => item.shortfall > 0).slice(0, 8),
    []
  );

  const counts = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((entry) => entry.status === 'pending').length,
      partial: orders.filter((entry) => entry.status === 'partially-received').length,
      received: orders.filter((entry) => entry.status === 'received').length,
      cancelled: orders.filter((entry) => entry.status === 'cancelled').length,
    }),
    [orders]
  );

  const createQuickPO = () => {
    const quantity = Number(quickQty);
    const item = inventoryItems.find((entry) => entry.id === selectedItemId);
    if (!item || !selectedSupplierId || !Number.isFinite(quantity) || quantity <= 0) {
      return;
    }

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      supplierId: selectedSupplierId,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'pending',
      totalAmount: quantity * item.unitCost,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setSelectedItemId('');
    setSelectedSupplierId('');
    setQuickQty('');
  };

  const updateStatus = (poId: string, nextStatus: POStatus) => {
    setOrders((prev) => prev.map((entry) => (entry.id === poId ? { ...entry, status: nextStatus } : entry)));
  };

  const resetWorkflowFilters = () => {
    setWorkflowStatusFilter('all');
    setWorkflowSupplierFilter('all');
    setWorkflowSearch('');
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = workflowSearch.trim().toLowerCase();

    return orders.filter((order) => {
      if (workflowStatusFilter !== 'all' && order.status !== workflowStatusFilter) {
        return false;
      }

      if (workflowSupplierFilter !== 'all' && order.supplierId !== workflowSupplierFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const supplierName = inventorySuppliers.find((entry) => entry.id === order.supplierId)?.name ?? '';
      return (
        order.id.toLowerCase().includes(normalizedSearch) ||
        supplierName.toLowerCase().includes(normalizedSearch)
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
    { label: 'Partial', value: counts.partial, accent: 'orange' as const },
    { label: 'Received', value: counts.received, accent: 'green' as const },
    { label: 'Cancelled', value: counts.cancelled, accent: 'red' as const },
  ];

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <AdminPageHeader
          title="Replenishment Control"
          description="Admin handles PO lifecycle: create, edit, cancel, and receive. Only approved receiving should change stock status in operation views."
        />
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/sales-report/inventory/purchase-orders"
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#0B5858]/20"
          >
            Open PO Archive
          </Link>
          <Link
            href="/sales-report/inventory/purchase-orders/create"
            className="px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a]"
          >
            Full PO Create Page
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {statCards.map((entry) => (
          <AdminStatCard
            key={entry.label}
            label={entry.label}
            value={entry.value}
            accent={entry.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-6 mb-6">
        <AdminSection title="Quick PO (MVP)" subtitle="Create a pending PO from low-stock recommendation.">
          <div className="px-5 py-4 space-y-3">
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
            >
              <option value="">Select low-stock item</option>
              {lowStockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (shortfall {item.shortfall})
                </option>
              ))}
            </select>

            <select
              value={selectedSupplierId}
              onChange={(event) => setSelectedSupplierId(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
            >
              <option value="">Select supplier</option>
              {inventorySuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <input
              value={quickQty}
              onChange={(event) => setQuickQty(event.target.value)}
              type="number"
              min={1}
              placeholder="Order quantity"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
            />

            <button
              type="button"
              onClick={createQuickPO}
              disabled={!selectedItemId || !selectedSupplierId || Number(quickQty) <= 0}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Pending PO
            </button>
          </div>
        </AdminSection>

        <AdminSection
          title="PO Workflow Actions"
          subtitle="Use status actions to simulate edit/cancel/receive decisions."
        >
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</span>
                <select
                  value={workflowStatusFilter}
                  onChange={(event) => setWorkflowStatusFilter(event.target.value as 'all' | POStatus)}
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
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Supplier</span>
                <select
                  value={workflowSupplierFilter}
                  onChange={(event) => setWorkflowSupplierFilter(event.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Filter by supplier"
                >
                  <option value="all">All suppliers</option>
                  {inventorySuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Search</span>
                <input
                  value={workflowSearch}
                  onChange={(event) => setWorkflowSearch(event.target.value)}
                  placeholder="PO id or supplier"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Search purchase orders"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold text-gray-800">{filteredOrders.length}</span> of{' '}
                <span className="font-semibold text-gray-800">{orders.length}</span> purchase orders
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
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">PO</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Expected</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const supplier = inventorySuppliers.find((entry) => entry.id === order.supplierId);
                  return (
                    <tr key={order.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{order.id.toUpperCase()}</td>
                      <td className="px-4 py-3 text-gray-600">{supplier?.name ?? 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-600">{order.expectedDelivery}</td>
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
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, 'partially-received')}
                            disabled={order.status === 'cancelled' || order.status === 'received'}
                            className="px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                          >
                            Partial
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, 'received')}
                            disabled={order.status === 'cancelled'}
                            className="px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4] disabled:opacity-40"
                          >
                            Receive
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id, 'cancelled')}
                            disabled={order.status === 'received'}
                            className="px-2.5 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      No purchase orders match the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>Low Stock Replenishment Priority</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {lowStockItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 p-3">
              <div className="text-sm font-semibold text-gray-900">{item.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                Current: {item.currentStock} {item.unit} | Min: {item.minStock} {item.unit}
              </div>
              <div className="text-xs text-amber-700 mt-1 font-semibold">Shortfall: {item.shortfall}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
