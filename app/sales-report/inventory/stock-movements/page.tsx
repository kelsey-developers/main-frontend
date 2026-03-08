'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import StockMovementsTable from '../components/StockMovementsTable';
import type { StockMovementType } from '../types';
import { buildEnhancedMovements } from '../helpers/movementHelpers';
import { exportStockMovementsToCsv, exportStockMovementsToPdf } from '../helpers/exportHelpers';
import { useStockMovementFilters } from './hooks/useStockMovementFilters';
import type { EnhancedMovement } from '../helpers/types';

// ─── Filter bar ────────────────────────────────────────────────────
function FilterBar({
  filters,
  movements,
}: {
  filters: ReturnType<typeof useStockMovementFilters>;
  movements: EnhancedMovement[];
}) {
  const typeOptions = useMemo<InventoryDropdownOption<StockMovementType | 'all'>[]>(
    () => [
      { value: 'all', label: 'All Types' },
      { value: 'in', label: 'Stock In' },
      { value: 'out', label: 'Stock Out' },
      { value: 'adjustment', label: 'Adjustment' },
      { value: 'damage', label: 'Damage' },
    ],
    []
  );

  const warehouseOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const options: InventoryDropdownOption<string>[] = [{ value: 'all', label: 'All Warehouses' }];
    filters.warehouses.forEach((warehouse) => {
      options.push({ value: warehouse, label: warehouse });
    });
    return options;
  }, [filters.warehouses]);

  const hasActiveFilters =
    filters.search ||
    filters.typeFilter !== 'all' ||
    filters.warehouseFilter !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-[#f3f4f6] border border-gray-200 rounded-xl p-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_170px_190px_150px_20px_150px] gap-2.5 items-center">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={filters.search}
              onChange={(event) => filters.setSearch(event.target.value)}
              placeholder="Product, SKU, ID, user..."
              className="w-full pl-10 pr-8 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white text-gray-900 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
              style={{ fontFamily: 'Poppins' }}
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => filters.setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                aria-label="Clear search"
              >
                x
              </button>
            )}
          </div>

          <InventoryDropdown
            value={filters.typeFilter}
            onChange={filters.setTypeFilter}
            options={typeOptions}
            fullWidth
            minWidthClass="min-w-[0]"
          />

          <InventoryDropdown
            value={filters.warehouseFilter}
            onChange={filters.setWarehouseFilter}
            options={warehouseOptions}
            fullWidth
            minWidthClass="min-w-[0]"
          />

          <SingleDatePicker
            value={filters.dateFrom}
            onChange={filters.setDateFrom}
            placeholder="From date"
            className="w-full"
          />

          <span className="hidden lg:inline text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>
            -
          </span>

          <SingleDatePicker
            value={filters.dateTo}
            onChange={filters.setDateTo}
            placeholder="To date"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="text-[13px] text-gray-600" style={{ fontFamily: 'Poppins' }}>
          Showing <strong style={{ color: '#0b5858' }}>{filters.filtered.length}</strong> of{' '}
          <strong>{movements.length}</strong> movements
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={filters.clearFilters}
            className="px-3.5 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'Poppins' }}
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function StockMovementsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const movements = useMemo(() => buildEnhancedMovements(), []);
  const filters = useStockMovementFilters(movements);
  
  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);
  
  const summaryStats = useMemo(() => {
    const stockIn = filters.filtered
      .filter((movement) => movement.type === 'in')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const stockOut = filters.filtered
      .filter((movement) => movement.type === 'out' || movement.type === 'damage')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const adjustments = filters.filtered
      .filter((movement) => movement.type === 'adjustment')
      .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
    const damage = filters.filtered
      .filter((movement) => movement.type === 'damage')
      .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);

    return [
      { label: 'Total Records', value: filters.filtered.length, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
      { label: 'Stock In', value: `+${stockIn}`, gradient: 'from-green-600 to-green-700' },
      { label: 'Stock Out', value: `-${stockOut}`, gradient: 'from-red-500 to-red-600' },
      { label: 'Adjustments', value: adjustments, gradient: 'from-amber-500 to-amber-600' },
      { label: 'Damage', value: damage, gradient: 'from-gray-500 to-gray-600' },
    ];
  }, [filters.filtered]);

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
        .export-csv-btn:hover {
          background: #1e293b !important;
          color: #ffffff !important;
          border-color: #1e293b !important;
        }
        .export-pdf-btn:hover {
          background: #0b5858 !important;
          color: #ffffff !important;
          border-color: #0b5858 !important;
        }
      `}</style>
      <div style={{ fontFamily: 'Poppins' }}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal">
          <div>
            <nav
              className="flex items-center gap-2 text-sm text-gray-600 mb-2"
              style={{ fontFamily: 'Poppins' }}
            >
              <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Stock Movements</span>
            </nav>

            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0b5858',
                marginBottom: 8,
              }}
            >
              Stock Movement History
            </h1>
            <p
              style={{
                color: '#6b7280',
                fontSize: 14,
                marginBottom: 0,
              }}
            >
              Comprehensive audit trail of all inventory transactions and adjustments
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => exportStockMovementsToCsv(filters.filtered)}
              className="export-csv-btn"
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
              CSV Download
            </button>

            <button
              type="button"
              onClick={() => exportStockMovementsToPdf(filters.filtered)}
              className="export-pdf-btn"
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
                <path d="M3 1.75h6.5L12 4.25v8A1.75 1.75 0 0 1 10.25 14h-7.5A1.75 1.75 0 0 1 1 12.25v-8A1.75 1.75 0 0 1 2.75 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.5 1.75v2.5H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 8h5.5M4 10h5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              PDF Download
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 inventory-reveal">
          {summaryStats.map((stat) => (
            <div key={stat.label} className={`relative bg-gradient-to-br ${stat.gradient} rounded-xl shadow-md p-4 overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-wider text-white/70 uppercase mb-2" style={{ fontFamily: 'Poppins' }}>
                  {stat.label}
                </div>
                <div className="text-3xl font-bold text-white leading-none" style={{ fontFamily: 'Poppins' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 inventory-reveal">
          <FilterBar filters={filters} movements={movements} />
        </div>

        {/* Table */}
        <div className="inventory-reveal">
          <StockMovementsTable movements={filters.filtered} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
