'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import InventoryTable from './components/InventoryTable';
import InventorySummaryCards from './components/InventorySummaryCards';
import SearchUnits from './components/SearchUnits';
import UnitAlert from './components/UnitAlert';
import type { InventoryDashboardSummary } from './types';
import {
  isInventoryDatasetLoaded,
  loadInventoryDataset,
  mockReplenishmentItems,
  mockUnits,
  mockUnitItems,
} from './lib/mockData';
import InventoryDashboardLinks from './components/InventoryDashboardLinks';

export default function InventoryDashboardPage() {
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoading, setIsLoading] = useState(() => !isInventoryDatasetLoaded());

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    // Force fetch so the dashboard always has data immediately,
    // even if a previous attempt stored an empty fallback dataset.
    void loadInventoryDataset(true)
      .finally(() => {
        if (isMounted) {
          setRefreshTick((tick) => tick + 1);
          setIsLoading(false);
        }
      });

    const onUpdate = () => {
      setIsLoading(true);
      void loadInventoryDataset(true).finally(() => {
        if (!isMounted) return;
        setRefreshTick((tick) => tick + 1);
        setIsLoading(false);
      });
    };
    window.addEventListener('inventory:movement-updated', onUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('inventory:movement-updated', onUpdate);
    };
  }, []);

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
  }, [refreshTick]);

  return (
    <>
      <style>{`
        @keyframes inventoryReveal {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .inventory-reveal {
          opacity: 0;
          animation: inventoryReveal 560ms ease-in-out forwards;
        }
      `}</style>

      <div className="mb-8 inventory-reveal" style={{ animationDelay: '40ms' }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
          Inventory dashboard
        </h1>
        <p className="text-gray-600" style={{ fontFamily: 'Poppins' }}>
          Track consumables and reusables, stock-in/out, unit assignment, and reorder alerts
        </p>
      </div>

      {/* Mobile Layout: Single column with specific order */}
      <div className="lg:hidden flex flex-col gap-6">
        {/* 1. Search Units */}
        <div className="inventory-reveal" style={{ animationDelay: '120ms' }}>
          <SearchUnits units={mockUnits} />
        </div>

        {/* 2. Summary Cards */}
        <div className="inventory-reveal" style={{ animationDelay: '180ms' }}>
          <InventorySummaryCards summary={summary} isLoading={isLoading} />
        </div>

        {/* 3. Unit Alert */}
        <div className="inventory-reveal" style={{ animationDelay: '230ms' }}>
          <UnitAlert units={mockUnits} unitItems={mockUnitItems} />
        </div>

        {/* 4. Inventory Table */}
        <div>
          <div className="mb-4 inventory-reveal" style={{ animationDelay: '280ms' }}>
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Inventory items
            </h3>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
              View all inventory items, stock out, and add new items
            </p>
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '340ms' }}>
            <InventoryTable
              items={mockReplenishmentItems}
              redirectOnClick={true}
              hideEditButton={true}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* 5. Dashboard Links */}
        <div className="inventory-reveal" style={{ animationDelay: '400ms' }}>
          <InventoryDashboardLinks />
        </div>
      </div>

      {/* Desktop Layout: Sidebar + Main Content */}
      <div className="hidden lg:flex lg:flex-row gap-8 lg:items-start">
        <aside className="w-80 flex-shrink-0 inventory-reveal" style={{ animationDelay: '120ms' }}>
          <SearchUnits units={mockUnits} />
          <div className="mt-6">
            <InventoryDashboardLinks />
          </div>
        </aside>
        <div className="flex-1 min-w-0 space-y-6">
          <div className="inventory-reveal" style={{ animationDelay: '180ms' }}>
            <InventorySummaryCards summary={summary} isLoading={isLoading} />
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '240ms' }}>
            <UnitAlert units={mockUnits} unitItems={mockUnitItems} />
          </div>
          <div className="mb-4 inventory-reveal" style={{ animationDelay: '300ms' }}>
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Inventory items
            </h3>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
              View all inventory items, stock out, and add new items
            </p>
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '360ms' }}>
            <InventoryTable
              items={mockReplenishmentItems}
              redirectOnClick={true}
              hideEditButton={true}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
