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
  getDisplayableInventoryItems,
  inventoryItems,
  inventoryUnits,
  inventoryUnitItems,
  inventoryWarehouseDirectory,
  isWarehouseActive,
} from './lib/inventoryDataStore';
import { filterItemsByWarehouse, getItemQuantityForWarehouse } from './helpers/itemsHelpers';
import InventoryDropdown, { type InventoryDropdownOption } from './components/InventoryDropdown';
import InventoryDashboardLinks from './components/InventoryDashboardLinks';
import { useToast } from './hooks/useToast';

export default function InventoryDashboardPage() {
  const { error: showError } = useToast();
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !isInventoryDatasetLoaded());
  const [initialLoadDone, setInitialLoadDone] = useState(() => isInventoryDatasetLoaded());
  const allItems = useMemo(() => [...getDisplayableInventoryItems()], [refreshTick]);
  const itemsSnapshot = useMemo(
    () => filterItemsByWarehouse(allItems, selectedWarehouseId),
    [allItems, selectedWarehouseId]
  );
  const warehouseOptions: InventoryDropdownOption<string>[] = useMemo(
    () => [
      { value: 'all', label: 'All Warehouses' },
      ...inventoryWarehouseDirectory
        .filter((w) => isWarehouseActive(w))
        .map((w) => ({ value: w.id, label: w.name })),
    ],
    []
  );
  const unitsSnapshot = useMemo(() => [...inventoryUnits], [refreshTick]);
  const unitItemsSnapshot = useMemo(() => [...inventoryUnitItems], [refreshTick]);
  const unitsWithAllocations = useMemo(() => {
    const unitIdsWithItems = new Set(
      inventoryUnitItems.filter((i) => i.assignedToUnit).map((i) => i.assignedToUnit!)
    );
    return inventoryUnits.filter((u) => unitIdsWithItems.has(u.id));
  }, [refreshTick]);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async (showBlockingLoader: boolean) => {
      if (showBlockingLoader) setIsLoading(true);
      try {
        await loadInventoryDataset(true);
        if (isMounted && inventoryItems.length === 0 && inventoryUnits.length === 0) {
          await loadInventoryDataset(true);
        }
      } catch (err) {
        if (isMounted) {
          showError('Could not load inventory data. Check that the backend is running and MARKET_API_URL is correct.');
        }
      } finally {
        if (isMounted) {
          setRefreshTick((tick) => tick + 1);
          setInitialLoadDone(true);
          if (showBlockingLoader) setIsLoading(false);
        }
      }
    };

    void loadDashboardData(!isInventoryDatasetLoaded());

    const onUpdate = () => {
      void loadDashboardData(false);
    };
    const onLoadFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      if (isMounted && detail?.message) {
        showError(detail.message);
      }
    };
    window.addEventListener('inventory:movement-updated', onUpdate);
    window.addEventListener('inventory:dataset-load-failed', onLoadFailed);

    return () => {
      isMounted = false;
      window.removeEventListener('inventory:movement-updated', onUpdate);
      window.removeEventListener('inventory:dataset-load-failed', onLoadFailed);
    };
  }, []);

  const summary = useMemo((): InventoryDashboardSummary => {
    const items = itemsSnapshot;
    const totalStocks = items.reduce((sum, item) => sum + getItemQuantityForWarehouse(item.id, selectedWarehouseId), 0);
    // Low stock is unit-level only (units have minStock; warehouses do not)
    const lowStockCount = unitItemsSnapshot.filter(
      (item) => item.currentStock < item.minStock && item.assignedToUnit
    ).length;
    return {
      totalItems: items.length,
      totalStocks,
      lowStockCount,
      replenishmentNeeded: lowStockCount,
    };
  }, [itemsSnapshot, selectedWarehouseId, unitItemsSnapshot]);

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
        .inventory-panel-skeleton {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          padding: 14px;
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
          {isLoading && !initialLoadDone ? (
            <div className="inventory-panel-skeleton animate-pulse h-24" />
          ) : (
            <SearchUnits units={unitsSnapshot} />
          )}
        </div>

        {/* 2. Summary Cards */}
        <div className="inventory-reveal" style={{ animationDelay: '180ms' }}>
          <InventorySummaryCards summary={summary} isLoading={isLoading} />
        </div>

        {/* 3. Unit Alert */}
        <div className="inventory-reveal" style={{ animationDelay: '230ms' }}>
          {isLoading && !initialLoadDone ? (
            <div className="inventory-panel-skeleton animate-pulse h-40" />
          ) : (
            <UnitAlert units={unitsSnapshot} unitItems={unitItemsSnapshot} />
          )}
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
            <div className="mt-3 max-w-[280px]">
              <InventoryDropdown
                value={selectedWarehouseId ?? 'all'}
                onChange={(v) => setSelectedWarehouseId(v === 'all' ? null : v)}
                options={warehouseOptions}
                fullWidth={true}
                leadingIcon={
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2 11h9M2.5 5.5h8M6.5 2L2.5 5.5v5.5h8V5.5L6.5 2z" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            </div>
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '340ms' }}>
            <InventoryTable
              items={itemsSnapshot}
              redirectOnClick={true}
              hideEditButton={true}
              isLoading={isLoading && !initialLoadDone}
              warehouseId={selectedWarehouseId}
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
          {isLoading && !initialLoadDone ? (
            <div className="inventory-panel-skeleton animate-pulse h-24" />
          ) : (
            <SearchUnits units={unitsWithAllocations} />
          )}
          <div className="mt-6">
            <InventoryDashboardLinks />
          </div>
        </aside>
        <div className="flex-1 min-w-0 space-y-6">
          <div className="inventory-reveal" style={{ animationDelay: '180ms' }}>
            <InventorySummaryCards summary={summary} isLoading={isLoading} />
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '240ms' }}>
            {isLoading && !initialLoadDone ? (
              <div className="inventory-panel-skeleton animate-pulse h-40" />
            ) : (
              <UnitAlert units={unitsSnapshot} unitItems={unitItemsSnapshot} />
            )}
          </div>
          <div className="mb-4 inventory-reveal" style={{ animationDelay: '300ms' }}>
            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
              Inventory items
            </h3>
            <p className="text-gray-600 text-sm mt-1" style={{ fontFamily: 'Poppins' }}>
              View all inventory items, stock out, and add new items
            </p>
            <div className="mt-3 max-w-[280px]">
              <InventoryDropdown
                value={selectedWarehouseId ?? 'all'}
                onChange={(v) => setSelectedWarehouseId(v === 'all' ? null : v)}
                options={warehouseOptions}
                fullWidth={true}
                leadingIcon={
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2 11h9M2.5 5.5h8M6.5 2L2.5 5.5v5.5h8V5.5L6.5 2z" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            </div>
          </div>
          <div className="inventory-reveal" style={{ animationDelay: '360ms' }}>
            <InventoryTable
              items={itemsSnapshot}
              redirectOnClick={true}
              hideEditButton={true}
              isLoading={isLoading && !initialLoadDone}
              warehouseId={selectedWarehouseId}
            />
          </div>
        </div>
      </div>
    </>
  );
}
