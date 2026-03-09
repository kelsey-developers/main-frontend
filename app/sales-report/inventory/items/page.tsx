'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import InventoryTable from '../components/InventoryTable';
import AuditTrailModal from '../components/AuditTrailModal';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import { buildWarehouseOptions, filterItemsByWarehouse } from '../helpers/itemsHelpers';
import { mockReplenishmentItems, mockWarehouseDirectoryData } from '../lib/mockData';

export default function InventoryItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const warehouseIdFromQuery = searchParams.get('warehouseId');
  const warehouseNameFromQuery = searchParams.get('warehouseName');
  const itemIdFromQuery = searchParams.get('itemId');
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(warehouseIdFromQuery);
  const [selectedItem, setSelectedItem] = useState<typeof mockReplenishmentItems[number] | null>(
    itemIdFromQuery ? mockReplenishmentItems.find((item) => item.id === itemIdFromQuery) || null : null
  );

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

          <button
            type="button"
            onClick={() => router.push('/sales-report/inventory/AddStock')}
            className="add-btn"
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1.5px solid #05807e',
              background: 'white',
              color: '#05807e',
              fontFamily: 'Poppins',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V3.5M7 3.5L4 6.5M7 3.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 2h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Stock In
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-2.5 inventory-reveal">
        <div className="relative flex-1 max-w-[300px]">
          <InventoryDropdown
            value={activeWarehouseId ?? 'all'}
            onChange={handleWarehouseChange}
            options={warehouseOptions}
            fullWidth={true}
            align="left"
            minWidthClass="min-w-[220px]"
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
      </div>

      <div className="inventory-reveal">
        <InventoryTable items={filteredItems} limitRows={true} onItemClick={setSelectedItem} />
      </div>

      <AuditTrailModal 
        item={selectedItem} 
        onClose={() => {
          setSelectedItem(null);
          // Clean up the query parameter
          router.push('/sales-report/inventory/items');
        }} 
      />
    </>
  );
}
