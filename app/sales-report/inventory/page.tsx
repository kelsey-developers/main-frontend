'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import InventoryTable from './components/InventoryTable';
import InventorySummaryCards from './components/InventorySummaryCards';
import SearchUnits from './components/SearchUnits';
import UnitAlert from './components/UnitAlert';
import type { InventoryDashboardSummary } from './types';
import { mockReplenishmentItems, mockUnits, mockUnitItems } from './lib/mockData';
import InventoryDashboardLinks from './components/InventoryDashboardLinks';

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
          <div className="mt-6">
            <InventoryDashboardLinks />
          </div>
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
          <UnitAlert units={mockUnits} unitItems={mockUnitItems} />
        </div>
      </div>
    </>
  );
}
