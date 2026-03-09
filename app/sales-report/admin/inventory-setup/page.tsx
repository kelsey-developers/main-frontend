'use client';

import React, { useState } from 'react';
import {
  ITEM_CATEGORIES,
  mockReplenishmentItems,
  mockSupplierDirectoryData,
  mockWarehouseDirectoryData,
  mockUnits,
} from '../../inventory/lib/mockData';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

const STOCK_OUT_REASONS = [
  'Room preparation',
  'Guest turnover',
  'Damage replacement',
  'Manual adjustment',
  'Disposal and expired',
  'Inter-warehouse transfer',
];

export default function AdminInventorySetupPage() {
  const activeWarehouses = mockWarehouseDirectoryData.filter((entry) => entry.isActive);
  const fallbackWarehouseId = activeWarehouses[0]?.id ?? '';

  const [allowedReasons, setAllowedReasons] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    STOCK_OUT_REASONS.forEach((reason) => {
      initial[reason] = true;
    });
    return initial;
  });

  const [sourceWarehouseByUnit, setSourceWarehouseByUnit] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    mockUnits.forEach((unit) => {
      initial[unit.id] = fallbackWarehouseId;
    });
    return initial;
  });

  const toggleReason = (reason: string) => {
    setAllowedReasons((prev) => ({ ...prev, [reason]: !prev[reason] }));
  };

  const lowStockItems = mockReplenishmentItems.filter((item) => item.currentStock < item.minStock);

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Inventory Setup"
        description="Configure master data and rule controls. This is where admin controls what can be stocked, where it comes from, and why stock can be deducted."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Items with Reorder Rule" value={mockReplenishmentItems.length} accent="teal" />
        <AdminStatCard label="Low Stock Right Now" value={lowStockItems.length} accent="amber" />
        <AdminStatCard label="Active Warehouses" value={activeWarehouses.length} accent="teal" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 mb-6">
        <AdminSection title="Master Data Snapshot">
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="font-semibold text-gray-900 mb-1">Categories</div>
              <div className="text-gray-600">{ITEM_CATEGORIES.join(', ')}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="font-semibold text-gray-900 mb-1">Suppliers</div>
              <div className="text-gray-600">{mockSupplierDirectoryData.length} suppliers configured</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="font-semibold text-gray-900 mb-1">Warehouses</div>
              <div className="text-gray-600">{mockWarehouseDirectoryData.length} storage locations</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <div className="font-semibold text-gray-900 mb-1">Units</div>
              <div className="text-gray-600">{mockUnits.length} units mapped to inventory usage</div>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Allowed Stock-Out Reasons">
          <div className="px-5 py-4 space-y-2.5">
            {STOCK_OUT_REASONS.map((reason) => (
              <label key={reason} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <span className="text-sm text-gray-700">{reason}</span>
                <input
                  type="checkbox"
                  checked={allowedReasons[reason]}
                  onChange={() => toggleReason(reason)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0B5858] focus:ring-[#0B5858]"
                />
              </label>
            ))}
          </div>
        </AdminSection>
      </div>

      <AdminSection
        title="Source Warehouse by Unit"
        subtitle="This controls default stock source when housekeeping or operations records unit stock-out."
        className="mb-6"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
              <tr>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Unit</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Location</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Default Source Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {mockUnits.slice(0, 10).map((unit) => (
                <tr key={unit.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-gray-800 font-medium">{unit.name}</td>
                  <td className="px-4 py-3 text-gray-600">{unit.location ?? 'N/A'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={sourceWarehouseByUnit[unit.id] ?? fallbackWarehouseId}
                      onChange={(event) =>
                        setSourceWarehouseByUnit((prev) => ({
                          ...prev,
                          [unit.id]: event.target.value,
                        }))
                      }
                      className="w-full max-w-[260px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                    >
                      {activeWarehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title="Reorder Level Governance">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
              <tr>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Item</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Current</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Min Stock</th>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {mockReplenishmentItems.slice(0, 10).map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-gray-800 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.currentStock} {item.unit}</td>
                  <td className="px-4 py-3 text-gray-600">{item.minStock} {item.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${item.shortfall > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {item.shortfall > 0 ? item.shortfall : 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
