'use client';

import React, { useState } from 'react';
import {
  ITEM_CATEGORIES,
  inventoryItems,
  inventorySupplierDirectory,
  inventoryWarehouseDirectory,
  inventoryUnits,
  inventoryUnitItems,
} from '../../inventory/lib/inventoryDataStore';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

const STOCK_OUT_REASONS = [
  { label: 'Room preparation',        icon: '🛏️' },
  { label: 'Guest turnover',           icon: '🔄' },
  { label: 'Damage replacement',       icon: '🔧' },
  { label: 'Manual adjustment',        icon: '✏️' },
  { label: 'Disposal and expired',     icon: '🗑️' },
  { label: 'Inter-warehouse transfer', icon: '🏭' },
];

export default function AdminInventorySetupPage() {
  const activeWarehouses = inventoryWarehouseDirectory.filter((w) => w.isActive);
  const lowStockItems = inventoryItems.filter((item) => item.currentStock < item.minStock);

  const [allowedReasons, setAllowedReasons] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STOCK_OUT_REASONS.map((r) => [r.label, true]))
  );
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  const toggleReason = (reason: string) =>
    setAllowedReasons((prev) => ({ ...prev, [reason]: !prev[reason] }));

  const enabledCount = Object.values(allowedReasons).filter(Boolean).length;

  // Group unit items by unit id for quick lookup
  const itemsByUnit = React.useMemo(() => {
    const map = new Map<string, typeof inventoryUnitItems>();
    for (const item of inventoryUnitItems) {
      if (!item.assignedToUnit) continue;
      const list = map.get(item.assignedToUnit) ?? [];
      list.push(item);
      map.set(item.assignedToUnit, list);
    }
    return map;
  }, []);

  return (
    <div style={{ fontFamily: 'Poppins' }} className="space-y-8 pb-10">

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Inventory Setup"
        description="Configure master data and rule controls — what can be stocked, where it comes from, and why stock can be deducted."
      />

      {/* ── STAT CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard label="Items with Reorder Rule" value={inventoryItems.length} accent="teal" />
        <AdminStatCard label="Low Stock Right Now"     value={lowStockItems.length}  accent="red"  />
        <AdminStatCard label="Active Warehouses"       value={activeWarehouses.length} accent="teal" />
      </div>

      {/* ── ROW 1: MASTER DATA + STOCK-OUT REASONS ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">

        {/* MASTER DATA SNAPSHOT */}
        <AdminSection title="Master Data Snapshot" subtitle="Configured reference data powering inventory operations">
          <div className="p-5 grid grid-cols-2 gap-3">

            {/* Categories */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-7 h-7 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-sm">📦</span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ITEM_CATEGORIES.map((cat) => (
                  <span key={cat} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700 shadow-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Suppliers */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-sm">🏪</span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suppliers</p>
              </div>
              <p className="text-2xl font-bold text-[#0b5858] tabular-nums">{inventorySupplierDirectory.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">active suppliers</p>
              {inventorySupplierDirectory.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {inventorySupplierDirectory.slice(0, 3).map((s) => (
                    <li key={s.id} className="text-xs text-gray-600 truncate">· {s.name}</li>
                  ))}
                  {inventorySupplierDirectory.length > 3 && (
                    <li className="text-xs text-gray-400">+{inventorySupplierDirectory.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>

            {/* Warehouses */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-sm">🏭</span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Warehouses</p>
              </div>
              <p className="text-2xl font-bold text-[#0b5858] tabular-nums">{inventoryWarehouseDirectory.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">storage locations · {activeWarehouses.length} active</p>
              {inventoryWarehouseDirectory.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {inventoryWarehouseDirectory.slice(0, 3).map((w) => (
                    <li key={w.id} className="text-xs text-gray-600 truncate">
                      · {w.name}
                      {!w.isActive && <span className="ml-1 text-gray-400">(inactive)</span>}
                    </li>
                  ))}
                  {inventoryWarehouseDirectory.length > 3 && (
                    <li className="text-xs text-gray-400">+{inventoryWarehouseDirectory.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>

            {/* Units */}
            <div className="col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-sm">🏠</span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Units mapped to inventory</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold text-[#0b5858] tabular-nums">{inventoryUnits.length}</p>
                <p className="text-xs text-gray-500">unit{inventoryUnits.length !== 1 ? 's' : ''} connected to stock operations</p>
              </div>
            </div>
          </div>
        </AdminSection>

        {/* ALLOWED STOCK-OUT REASONS */}
        <AdminSection
          title="Allowed Stock-Out Reasons"
          subtitle={`${enabledCount} of ${STOCK_OUT_REASONS.length} reasons enabled`}
        >
          <div className="p-5 space-y-2">
            {STOCK_OUT_REASONS.map(({ label, icon }) => {
              const active = allowedReasons[label];
              return (
                <label
                  key={label}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                    active ? 'border-[#0b5858]/30 bg-[#f0fafa]' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <span className={`text-sm font-medium truncate ${active ? 'text-[#0b5858]' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <div
                      onClick={() => toggleReason(label)}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${active ? 'bg-[#0b5858]' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </AdminSection>
      </div>

      {/* ── UNIT INVENTORY ALLOCATIONS ───────────────────────────────── */}
      <AdminSection
        title="Unit Inventory Allocations"
        subtitle="Products allocated per unit and their minimum stock levels. Warehouse is selected at the time of each stock-out."
      >
        {inventoryUnits.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No units synced yet. Units appear here once loaded from the Auth Service.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {inventoryUnits.map((unit) => {
              const items = itemsByUnit.get(unit.id) ?? [];
              const isExpanded = expandedUnit === unit.id;
              const lowCount = items.filter((i) => (i.currentStock ?? 0) < (i.minStock ?? 0)).length;

              return (
                <div key={unit.id}>
                  {/* Unit row / accordion header */}
                  <button
                    type="button"
                    onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8fffe] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-sm flex-shrink-0">🏠</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{unit.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-sm">{unit.location || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {items.length} product{items.length !== 1 ? 's' : ''} allocated
                      </span>
                      {lowCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                          {lowCount} LOW
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded product list */}
                  {isExpanded && (
                    <div className="bg-gray-50/60 border-t border-gray-100 px-5 pb-4">
                      {items.length === 0 ? (
                        <p className="py-4 text-sm text-gray-400 text-center">No products allocated to this unit yet.</p>
                      ) : (
                        <table className="w-full text-sm mt-3">
                          <thead>
                            <tr className="text-left">
                              <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                              <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">On Hand</th>
                              <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Stock</th>
                              <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((item) => {
                              const onHand = item.currentStock;
                              const min = item.minStock;
                              const isLow = onHand < min;
                              return (
                                <tr key={item.id} className="align-middle">
                                  <td className="py-2.5 pr-4">
                                    <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-400">{item.category} · {item.unit}</p>
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums">
                                    <span className={isLow ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                                      {onHand}
                                    </span>
                                    <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                                  </td>
                                  <td className="py-2.5 text-right tabular-nums text-gray-500">
                                    {min} <span className="text-xs">{item.unit}</span>
                                  </td>
                                  <td className="py-2.5 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isLow ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      {isLow ? 'LOW' : 'OK'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                      <p className="mt-3 text-[11px] text-gray-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Source warehouse is selected at the time of each stock-out — not fixed here.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>

      {/* ── REORDER LEVEL GOVERNANCE ─────────────────────────────────── */}
      <AdminSection
        title="Reorder Level Governance"
        subtitle="Stock levels vs minimums — items below minimum are flagged for replenishment"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 520 }}>
            <colgroup>
              <col />
              <col style={{ width: 120 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr className="bg-gradient-to-r from-[#0b5858] to-[#05807e]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Item</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Current</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Min Stock</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Shortfall</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No items tracked yet. Add items via Goods Receipts.
                  </td>
                </tr>
              ) : (
                inventoryItems.map((item) => {
                  const isLow = item.currentStock < item.minStock;
                  const shortfall = Math.max(0, item.minStock - item.currentStock);
                  const pct = item.minStock > 0
                    ? Math.min(100, Math.round((item.currentStock / item.minStock) * 100))
                    : 100;
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50/60 transition-colors align-middle ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-semibold tabular-nums ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                          {item.currentStock}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-gray-600 tabular-nums">{item.minStock}</span>
                        <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {shortfall > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-red-600 tabular-nums">
                            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            -{shortfall}
                          </span>
                        ) : (
                          <span className="text-gray-400 tabular-nums">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold ${isLow ? 'text-red-500' : 'text-emerald-600'}`}>
                            {isLow ? 'LOW' : 'OK'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {lowStockItems.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-red-50/50 flex items-center gap-2 text-xs text-red-600 font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {lowStockItems.length} item{lowStockItems.length !== 1 ? 's are' : ' is'} below minimum stock and need replenishment.
          </div>
        )}
      </AdminSection>

    </div>
  );
}
