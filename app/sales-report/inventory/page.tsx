'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import InventoryTable from './components/InventoryTable';
import InventorySummaryCards from './components/InventorySummaryCards';
import SearchUnits from './components/SearchUnits';
import UnitAlert from './components/UnitAlert';
import type { InventoryDashboardSummary } from './types';
import { mockReplenishmentItems, mockUnits, mockUnitItems } from './lib/mockData';

export default function InventoryDashboardPage() {
  const summary = useMemo((): InventoryDashboardSummary => {
    const items = mockReplenishmentItems;
    const totalStocks = items.reduce((sum, item) => sum + item.currentStock, 0);
    const lowStockCount = items.filter((item) => item.currentStock < item.minStock).length;
    return {
      totalItems: items.length,
      totalStocks,
      lowStockCount,
      replenishmentNeeded: lowStockCount,
    };
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
          Inventory dashboard
        </h1>
        <p className="text-gray-600" style={{ fontFamily: 'Poppins' }}>
          Track consumables and reusables, stock-in/out, unit assignment, and reorder alerts
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
        <aside className="w-full lg:w-80 flex-shrink-0">
          <SearchUnits units={mockUnits} />
        </aside>
        <div className="flex-1 min-w-0 space-y-6">
          <InventorySummaryCards summary={summary} />
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Inventory items
            </h3>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
              View all inventory items, stock out, and add new items
            </p>    
          </div>
          <InventoryTable items={mockReplenishmentItems} />
          <Link
            href="/sales-report/inventory/items"
            className="block p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-[#0B5858]/30 hover:shadow-md transition-all text-left"
          >
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Inventory items
            </h3>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
              View all inventory items, stock out, and add new items
            </p>
            <span className="inline-flex items-center gap-1 text-[#0B5858] text-sm font-medium mt-2" style={{ fontFamily: 'Poppins' }}>
              View items
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
          <UnitAlert units={mockUnits} unitItems={mockUnitItems} />
        </div>
      </div>
    </>
  );
}
