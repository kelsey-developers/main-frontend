'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import InventoryTable from '../components/InventoryTable';
import AuditTrailModal from '../components/AuditTrailModal';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import { buildWarehouseOptions, filterItemsByWarehouse } from '../helpers/itemsHelpers';
import { mockReplenishmentItems, mockWarehouseDirectoryData, getWarehouseUnitAllocations } from '../lib/mockData';
import { recomputeAllInventoryDerivedValues } from '../lib/inventoryLedger';
import StockInModal from '../components/StockInModal';

function InventoryItemsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseIdFromQuery = searchParams.get('warehouseId');
  const warehouseNameFromQuery = searchParams.get('warehouseName');
  const itemIdFromQuery = searchParams.get('itemId');
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAddNewItemModal, setShowAddNewItemModal] = useState(false);
  const [view, setView] = useState<'items' | 'unitAllocations'>('items');
  const [unitFilter, setUnitFilter] = useState<'all' | string>('all');

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(warehouseIdFromQuery);
  const [selectedItem, setSelectedItem] = useState<typeof mockReplenishmentItems[number] | null>(
    itemIdFromQuery ? mockReplenishmentItems.find((item) => item.id === itemIdFromQuery) || null : null
  );

  useEffect(() => {
    const refresh = () => {
      void recomputeAllInventoryDerivedValues()
        .finally(() => {
          if (itemIdFromQuery) {
            setSelectedItem(mockReplenishmentItems.find((item) => item.id === itemIdFromQuery) || null);
          }
          setRefreshTick((tick) => tick + 1);
        });
    };

    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Combine query param with local state (query param takes precedence)
  const activeWarehouseId = warehouseIdFromQuery || selectedWarehouseId;
  const activeWarehouse = mockWarehouseDirectoryData.find((wh) => wh.id === activeWarehouseId);
  const activeWarehouseName = warehouseNameFromQuery || activeWarehouse?.name;

  const filteredItems = useMemo(() => {
    return filterItemsByWarehouse(mockReplenishmentItems, activeWarehouseId);
  }, [activeWarehouseId]);

  const warehouseOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    return buildWarehouseOptions(mockWarehouseDirectoryData);
  }, []);

  const unitAllocations = useMemo(() => {
    if (!activeWarehouseId) return [];
    return getWarehouseUnitAllocations(activeWarehouseId);
  }, [activeWarehouseId, refreshTick]);

  const unitFilterOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    if (!activeWarehouseId) return [];
    if (unitAllocations.length === 0) return [];
    return [
      { value: 'all', label: 'All units' },
      ...unitAllocations.map((unit) => ({ value: unit.unitId, label: unit.unitName })),
    ];
  }, [activeWarehouseId, unitAllocations]);

  const filteredUnitAllocations = useMemo(() => {
    if (!activeWarehouseId) return [];
    if (unitFilter === 'all') return unitAllocations;
    return unitAllocations.filter((unit) => unit.unitId === unitFilter);
  }, [activeWarehouseId, unitAllocations, unitFilter]);

  const handleWarehouseChange = (value: string) => {
    if (value === 'all') {
      setSelectedWarehouseId(null);
      if (warehouseIdFromQuery) {
        router.push('/sales-report/inventory/items');
      }
      return;
    }

    setSelectedWarehouseId(value);
    if (warehouseIdFromQuery) {
      router.push('/sales-report/inventory/items');
    }
  };

  return (
    <>
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
        .stock-btn:hover {
          background: #1e293b !important;
          color: #ffffff !important;
          border-color: #1e293b !important;
        }
        .add-btn:hover {
          background: #0b5858 !important;
          color: #ffffff !important;
          border-color: #0b5858 !important;
        }
      `}</style>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Inventory</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Inventory items
          </h1>
          <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            {activeWarehouseId ? `Viewing inventory for ${activeWarehouseName ?? 'selected warehouse'}` : 'View and manage all inventory items'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowAddNewItemModal(true)}
            className="stock-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1.5px solid #0B5858',
              background: 'linear-gradient(135deg, #0b5858, #05807e)',
              color: '#ffffff',
              fontFamily: 'Poppins',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Add New Item
          </button>

          <button
            type="button"
            onClick={() => router.push('/sales-report/inventory/StockOut')}
            className="stock-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              background: 'white',
              color: '#334155',
              fontFamily: 'Poppins',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8.5M7 9.5L4 6.5M7 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Stock Out
          </button>
        </div>
      </div>

      {/* Warehouse filter + view toggle */}
      <div className="mb-4 flex flex-col gap-2 inventory-reveal">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="relative z-[999] flex-1 max-w-[300px]">
            <InventoryDropdown
              value={activeWarehouseId ?? 'all'}
              onChange={handleWarehouseChange}
              options={warehouseOptions}
              fullWidth={true}
              align="left"
              minWidthClass="min-w-[220px]"
              menuZIndexClass="z-[999]"
              leadingIcon={
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 11h9M2.5 5.5h8M6.5 2L2.5 5.5v5.5h8V5.5L6.5 2z" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>

          {activeWarehouseId && warehouseIdFromQuery && (
            <div className="flex items-center rounded-lg border border-[#cce8e8] bg-[#e8f4f4] px-4 py-2.5 gap-3">
              <p className="text-[12.5px] text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>
                Filtered from warehouse link
              </p>
              <button
                type="button"
                onClick={() => router.push('/sales-report/inventory/warehouses')}
                className="text-[12.5px] font-semibold text-[#0b5858] hover:underline"
                style={{ fontFamily: 'Poppins' }}
              >
                Back to Warehouse Directory
              </button>
              <span className="text-[#0b5858]/40">|</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedWarehouseId(null);
                  router.push('/sales-report/inventory/items');
                }}
                className="text-[12.5px] font-semibold text-[#0b5858] hover:underline"
                style={{ fontFamily: 'Poppins' }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setView('items')}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                view === 'items' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              Items View
            </button>
            <button
              type="button"
              onClick={() => setView('unitAllocations')}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                view === 'unitAllocations' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={{ fontFamily: 'Poppins' }}
            >
              Unit Allocation Summary
            </button>
          </div>
        </div>
      </div>

      {view === 'items' ? (
        <>
          <div className="inventory-reveal">
            <InventoryTable items={filteredItems} limitRows={true} onItemClick={setSelectedItem} />
          </div>
        </>
      ) : (
        <div className="inventory-reveal">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#f8fbfb] border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                  Item allocations to units
                </h3>
              </div>

              {activeWarehouseId && unitFilterOptions.length > 0 && (
                <div className="w-full sm:w-auto">
                  <InventoryDropdown
                    value={unitFilter}
                    onChange={setUnitFilter}
                    options={unitFilterOptions}
                    minWidthClass="min-w-[200px]"
                  />
                </div>
              )}
            </div>

            {!activeWarehouseId ? (
              <div className="px-4 py-8 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                Select a warehouse from the dropdown above to see which units have items allocated from that location.
              </div>
            ) : unitAllocations.length === 0 ? (
              <div className="px-4 py-8 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                No items have been allocated to units yet for this warehouse.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto divide-y divide-gray-100">
                {filteredUnitAllocations.map((unit) => {
                  const totalQuantity = unit.items.reduce((sum, row) => sum + row.quantity, 0);
                  const itemCount = unit.items.length;
                  return (
                    <button
                      key={unit.unitId}
                      onClick={() => router.push(`/sales-report/inventory/units/${unit.unitId}`)}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] font-semibold text-[#0b5858] group-hover:text-[#05807e] transition-colors"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {unit.unitName}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f4f4] text-[#0b5858]"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {itemCount} item{itemCount !== 1 ? 's' : ''} · {totalQuantity} unit
                            {totalQuantity !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <svg
                          className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0b5858] group-hover:translate-x-0.5 transition-all"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.items.map((item) => (
                          <span
                            key={`${unit.unitId}-${item.productId}`}
                            className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {item.productName} ({item.quantity})
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <AuditTrailModal 
        item={selectedItem} 
        onClose={() => {
          setSelectedItem(null);
          // Clean up the query parameter
          router.push('/sales-report/inventory/items');
        }} 
      />

      {showAddNewItemModal && (
        <StockInModal
          mode="new"
          onClose={() => setShowAddNewItemModal(false)}
        />
      )}
    </>
  );
}

export default function InventoryItemsPage() {
  return (
    <Suspense fallback={null}>
      <InventoryItemsPageContent />
    </Suspense>
  );
}
