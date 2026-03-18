'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InventoryUnit, ReplenishmentItem } from '../types';
import SearchUnits from './SearchUnits';
import InventoryTable from './InventoryTable';
import AuditTrailModal from './AuditTrailModal';
import { loadInventoryDataset, inventoryUnits, inventoryUnitItems, inventoryItems } from '../lib/inventoryDataStore';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { useToast } from '../hooks/useToast';

interface UnitPageProps {
  unit: InventoryUnit;
}

const UnitPage: React.FC<UnitPageProps> = ({ unit }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAllocations = searchParams.get('from') === 'allocations';
  const { user, userProfile, userRole } = useMockAuth();
  const { warning } = useToast();
  const [refreshTick, setRefreshTick] = useState(0);

  // Listen for inventory movement updates to refresh unit items
  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        setRefreshTick((tick) => tick + 1);
      });

    const handleInventoryUpdate = () => setRefreshTick((tick) => tick + 1);
    window.addEventListener('inventory:movement-updated', handleInventoryUpdate);
    return () => {
      window.removeEventListener('inventory:movement-updated', handleInventoryUpdate);
    };
  }, []);

  const [auditItem, setAuditItem] = useState<ReplenishmentItem | null>(null);

  // Filter items for this unit and transform to ReplenishmentItem format
  const unitInventoryItems = useMemo<ReplenishmentItem[]>(() => {
    return inventoryUnitItems
      .filter((item) => item.assignedToUnit === unit.id)
      .map((item) => {
        const minStock = item.minStock ?? 0;
        const shortfall = minStock > 0 ? Math.max(0, minStock - item.currentStock) : 0;
        const productId = (item as { productId?: string }).productId ?? item.id;
        const product =
          inventoryItems.find((p) => p.id === productId) ??
          inventoryItems.find((p) => p.name?.toLowerCase() === item.name?.toLowerCase());
        const sku = product?.sku ?? item.id;
        return {
          id: item.id,
          productId,
          sku,
          name: item.name,
          type: product?.type ?? 'consumable',
          category: product?.category ?? 'Other',
          unit: item.unit,
          currentStock: item.currentStock,
          minStock,
          shortfall,
          unitCost: 150, // Default cost for unit items
          totalValue: item.currentStock * 150,
          warehouseId: 'unit-storage',
          warehouseName: unit.name,
          isActive: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-03-08',
          lastModifiedBy: 'System',
          currentsupplierId: 's1',
          supplierName: 'Clean & Co',
        };
      });
  }, [unit.id, unit.name, refreshTick, inventoryItems]);

  // Units that have items in unit allocation (for SearchUnits suggestions)
  const unitsWithAllocations = useMemo(() => {
    const unitIdsWithItems = new Set(
      inventoryUnitItems.filter((i) => i.assignedToUnit).map((i) => i.assignedToUnit!)
    );
    return inventoryUnits.filter((u) => unitIdsWithItems.has(u.id));
  }, [refreshTick]);

  // Low stock alert toast for this unit
  const lowStockCount = useMemo(() => {
    return unitInventoryItems.filter((i) => i.minStock > 0 && i.currentStock < i.minStock).length;
  }, [unitInventoryItems]);

  const hasShownLowStockToast = useRef(false);
  const hasShownNoItemsToast = useRef(false);
  useEffect(() => {
    if (lowStockCount > 0 && !hasShownLowStockToast.current) {
      hasShownLowStockToast.current = true;
      warning(
        `${unit.name} has ${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} below threshold`
      );
    }
  }, [lowStockCount, unit.name, warning]);
  useEffect(() => {
    if (unitInventoryItems.length === 0 && !hasShownNoItemsToast.current) {
      hasShownNoItemsToast.current = true;
      warning(`${unit.name} has no items assigned. Allocate items from Items → Allocations.`);
    }
  }, [unitInventoryItems.length, unit.name, warning]);

  const handleRestockClick = (item: ReplenishmentItem) => {
    const confirmedBy = userProfile?.fullname || userRole?.fullname || 'Admin User';
    const idNumber = user?.id || 'mock-1';
    const productId = (item as ReplenishmentItem & { productId?: string }).productId ?? item.id;
    const params = new URLSearchParams({
      mode: 'unit',
      unitId: unit.id,
      confirmedBy,
      idNumber,
      itemId: productId,
      returnTo: `/sales-report/inventory/units/${unit.id}`,
    });
    router.push(`/sales-report/inventory/StockOut?${params.toString()}`);
  };

  const handleRowClick = (item: ReplenishmentItem) => {
    const productId = (item as ReplenishmentItem & { productId?: string }).productId ?? item.id;
    const product = inventoryItems.find((p) => p.id === productId);
    setAuditItem(product ?? item);
  };

  return (
    <div className="mx-auto">
      <style>{`
        @keyframes inventoryReveal {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
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
      <div className="flex flex-wrap items-center gap-3 mb-6 inventory-reveal" style={{ fontFamily: 'Poppins', animationDelay: '30ms' }}>
        {fromAllocations ? (
          <Link
            href="/sales-report/inventory/items?view=allocations"
            className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Item Allocation
          </Link>
        ) : (
          <Link
            href="/sales-report/inventory"
            className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Inventory
          </Link>
        )}
        {fromAllocations && (
          <span className="text-gray-400">|</span>
        )}
        {fromAllocations && (
          <Link
            href="/sales-report/inventory"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0B5858] hover:underline"
          >
            Inventory Dashboard
          </Link>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
        <aside className="w-full lg:w-80 flex-shrink-0 inventory-reveal" style={{ animationDelay: '90ms' }}>
          <SearchUnits units={unitsWithAllocations} fromAllocations={fromAllocations} />
        </aside>
        <div className="flex-1 flex-col min-w-0 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-6 flex flex-row gap-6 inventory-reveal" style={{ animationDelay: '140ms' }}>
            <div className="w-1/2 h-60 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={unit.imageUrl || '/heroimage.png'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                  {unit.name}
                </h1>
                {unit.type && (
                  <span
                    className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-amber-100 text-amber-800"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                  </span>
                )}
              </div>
              {unit.location && (
                <p className="text-gray-600 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 21.75c2.5-2.5 6.75-7.02 6.75-11.25a6.75 6.75 0 10-13.5 0c0 4.23 4.25 8.75 6.75 11.25z"
                      />
                      <circle cx="12" cy="10.5" r="2.25" strokeWidth={2} />
                    </svg>
                  </span>
                  {unit.location}
                </p>
              )}
              {unitInventoryItems.length > 0 && (
                <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Poppins' }}>
                  {unitInventoryItems.length} items assigned
                </p>
              )}
            </div>
          </div>
          
          {/* Unit Inventory Header */}
          <div className="mb-6 mt-6 inventory-reveal" style={{ animationDelay: '190ms' }}>
            <div className="mb-3">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                Unit Inventory
              </h2>
              <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                Items currently stocked in this unit. Stock levels reflect items moved or stocked out to {unit.name}.
              </p>
            </div>
            
            {/* Alert when unit has no items — still allow viewing */}
            {unitInventoryItems.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg mb-4">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-amber-900" style={{ fontFamily: 'Poppins' }}>
                    No items assigned to this unit
                  </p>
                  <p className="text-xs text-amber-800 mt-1" style={{ fontFamily: 'Poppins' }}>
                    This unit has no inventory items. Allocate items from the <Link href="/sales-report/inventory/items?view=allocations" className="underline font-medium hover:text-amber-900">Items → Allocations</Link> view to start tracking stock here.
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            {unitInventoryItems.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-blue-900" style={{ fontFamily: 'Poppins' }}>
                  Unit-Specific Stock Tracking
                </p>
                <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Poppins' }}>
                  These stock numbers show only items currently in <strong>{unit.name}</strong>. Stock below the inventory threshold triggers low-stock alerts. Edit threshold from the Allocations view on the Items page.
                </p>
              </div>
            </div>
            )}
          </div>
          
          <div className="inventory-reveal" style={{ animationDelay: '240ms' }}>
            <InventoryTable
              items={unitInventoryItems}
              hideEditButton={true}
              isUnitView={true}
              onItemClick={handleRowClick}
              onRestockClick={handleRestockClick}
            />
          </div>
        </div>
        
      </div>

      {auditItem && (
        <AuditTrailModal item={auditItem} onClose={() => setAuditItem(null)} />
      )}
    </div>
  );
};

export default UnitPage;
