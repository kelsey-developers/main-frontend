'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import {
  loadInventoryDataset,
  mockReplenishmentItems,
  mockStockMovements,
  mockUnitStockMovements,
  mockWarehouseDirectoryData,
} from '../lib/mockData';

type MovementView = 'warehouse' | 'unit';
type MovementType = 'in' | 'out';
type ReferenceType = 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';

const MOVEMENT_VIEW_STORAGE_KEY = 'inventory.stockMovements.view';

type WarehouseMovementRow = {
  id: string;
  productName: string;
  warehouseName: string;
  unitName?: string;
  type: MovementType;
  quantity: number;
  createdBy: string;
  reason: string;
  referenceType: ReferenceType;
  referenceId?: string;
  beforeQuantity?: number;
  afterQuantity?: number;
  recordedDate: string;
  recordedTime: string;
};

type UnitMovementRow = (typeof mockUnitStockMovements)[number];

const pad2 = (value: number) => String(value).padStart(2, '0');
const parseDateTime = (date: string, time: string) => new Date(`${date}T${time || '00:00'}`);

const normalizeDateTime = (value?: string) => {
  if (!value) return { date: '', time: '00:00' };
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(value)) {
    const [date, time] = value.split(' ');
    return { date, time };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { date: value, time: '00:00' };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '00:00' };

  return {
    date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`,
    time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
  };
};

const getTypeBadgeClasses = (type: MovementType) =>
  type === 'in'
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-red-50 text-red-700 border border-red-200';

const Tag = ({ label, className }: { label: string; className: string }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${className}`}>
    {label}
  </span>
);

const OptionalValueBadge = () => (
  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-gray-100 text-gray-600 border border-gray-200">
    None
  </span>
);

export default function StockMovementsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<MovementView>(() => {
    if (typeof window === 'undefined') return 'warehouse';
    const saved = window.localStorage.getItem(MOVEMENT_VIEW_STORAGE_KEY);
    return saved === 'warehouse' || saved === 'unit' ? saved : 'warehouse';
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [referenceFilter, setReferenceFilter] = useState<'all' | ReferenceType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datasetTick, setDatasetTick] = useState(0);

  const warehouseRows = useMemo<WarehouseMovementRow[]>(() => {
    const byWarehouseId = new Map(mockWarehouseDirectoryData.map((warehouse) => [warehouse.id, warehouse.name]));
    const byProductId = new Map(mockReplenishmentItems.map((item) => [item.id, item.name]));

    return mockStockMovements.map((movement) => {
      const dateTime = normalizeDateTime(movement.movementDateTime || movement.createdAt);
      return {
        id: movement.id,
        productName: byProductId.get(movement.productId) || 'Unknown Product',
        warehouseName: byWarehouseId.get(movement.warehouseId || '') || 'Unknown Warehouse',
        unitName: movement.unitName,
        type: movement.type,
        quantity: movement.quantity,
        createdBy: movement.createdBy || 'Admin User',
        reason: movement.reason || movement.notes || 'N/A',
        referenceType: movement.referenceType || 'MANUAL',
        referenceId: movement.referenceId,
        beforeQuantity: movement.beforeQuantity,
        afterQuantity: movement.afterQuantity,
        recordedDate: dateTime.date,
        recordedTime: dateTime.time,
      };
    });
  }, [refreshTick, datasetTick]);

  const unitRows = useMemo<UnitMovementRow[]>(() => [...mockUnitStockMovements], [refreshTick, datasetTick]);

  const warehouseOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const source = view === 'warehouse'
      ? warehouseRows.map((row) => row.warehouseName)
      : unitRows.map((row) => row.sourceWarehouseName);
    const names = Array.from(new Set(source)).sort();
    return [{ value: 'all', label: 'All Warehouses' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [view, warehouseRows, unitRows]);

  const unitOptions = useMemo<InventoryDropdownOption<string>[]>(() => {
    const names = Array.from(new Set(unitRows.map((row) => row.unitName))).sort();
    return [{ value: 'all', label: 'All Units' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [unitRows]);

  const typeOptions = useMemo<InventoryDropdownOption<'all' | MovementType>[]>(
    () => [
      { value: 'all', label: 'All Types' },
      { value: 'in', label: 'In' },
      { value: 'out', label: 'Out' },
    ],
    []
  );

  const referenceOptions = useMemo<InventoryDropdownOption<'all' | ReferenceType>[]>(
    () => [
      { value: 'all', label: 'All References' },
      { value: 'PO', label: 'PO' },
      { value: 'BOOKING', label: 'Booking' },
      { value: 'DAMAGE', label: 'Damage' },
      { value: 'MANUAL', label: 'Manual' },
    ],
    []
  );

  const filteredWarehouseRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return warehouseRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.id.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.warehouseName.toLowerCase().includes(query) ||
        (row.unitName ?? '').toLowerCase().includes(query) ||
        row.createdBy.toLowerCase().includes(query) ||
        row.reason.toLowerCase().includes(query) ||
        (row.referenceId ?? '').toLowerCase().includes(query);

      const matchesWarehouse = warehouseFilter === 'all' || row.warehouseName === warehouseFilter;
      const matchesType = typeFilter === 'all' || row.type === typeFilter;
      const matchesReference = referenceFilter === 'all' || row.referenceType === referenceFilter;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const dateValue = parseDateTime(row.recordedDate, row.recordedTime);
        if (dateFrom) matchesDate = matchesDate && dateValue >= new Date(dateFrom);
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && dateValue <= to;
        }
      }

      return matchesSearch && matchesWarehouse && matchesType && matchesReference && matchesDate;
    });
  }, [warehouseRows, search, warehouseFilter, typeFilter, referenceFilter, dateFrom, dateTo]);

  const filteredUnitRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return unitRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.id.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.unitName.toLowerCase().includes(query) ||
        row.sourceWarehouseName.toLowerCase().includes(query) ||
        row.createdBy.toLowerCase().includes(query) ||
        row.reason.toLowerCase().includes(query) ||
        (row.referenceId ?? '').toLowerCase().includes(query);

      const matchesWarehouse = warehouseFilter === 'all' || row.sourceWarehouseName === warehouseFilter;
      const matchesUnit = unitFilter === 'all' || row.unitName === unitFilter;
      const matchesReference = referenceFilter === 'all' || row.referenceType === referenceFilter;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const dateValue = parseDateTime(row.recordedDate, row.recordedTime);
        if (dateFrom) matchesDate = matchesDate && dateValue >= new Date(dateFrom);
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && dateValue <= to;
        }
      }

      return matchesSearch && matchesWarehouse && matchesUnit && matchesReference && matchesDate;
    });
  }, [unitRows, search, warehouseFilter, unitFilter, referenceFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setWarehouseFilter('all');
    setUnitFilter('all');
    setTypeFilter('all');
    setReferenceFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  useEffect(() => {
    let isMounted = true;
    void loadInventoryDataset()
      .finally(() => {
        if (isMounted) {
          setDatasetTick((tick) => tick + 1);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MOVEMENT_VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    const refresh = () => {
      setRefreshTick((tick) => tick + 1);
      setDatasetTick((tick) => tick + 1);
    };
    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const summaryStats = useMemo(() => {
    if (view === 'warehouse') {
      const stockIn = filteredWarehouseRows
        .filter((movement) => movement.type === 'in')
        .reduce((sum, movement) => sum + movement.quantity, 0);
      const stockOut = filteredWarehouseRows
        .filter((movement) => movement.type === 'out')
        .reduce((sum, movement) => sum + movement.quantity, 0);

      return [
        { label: 'Total Records', value: filteredWarehouseRows.length, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
        { label: 'Stock In', value: `+${stockIn}`, gradient: 'from-green-600 to-green-700' },
        { label: 'Stock Out', value: `-${stockOut}`, gradient: 'from-red-500 to-red-600' },
        { label: 'Ref Types', value: new Set(filteredWarehouseRows.map((row) => row.referenceType)).size, gradient: 'from-indigo-500 to-indigo-600' },
      ];
    }

    const totalOut = filteredUnitRows.reduce((sum, row) => sum + row.quantity, 0);
    return [
      { label: 'Total Records', value: filteredUnitRows.length, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
      { label: 'Stock Out to Units', value: `-${totalOut}`, gradient: 'from-red-500 to-red-600' },
      { label: 'Units Impacted', value: new Set(filteredUnitRows.map((row) => row.unitId)).size, gradient: 'from-emerald-500 to-emerald-600' },
      { label: 'Ref Types', value: new Set(filteredUnitRows.map((row) => row.referenceType)).size, gradient: 'from-indigo-500 to-indigo-600' },
    ];
  }, [view, filteredWarehouseRows, filteredUnitRows]);

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
      `}</style>

      <div style={{ fontFamily: 'Poppins' }}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
              <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Stock Movements</span>
            </nav>

            <h1 className="text-[32px] font-extrabold text-[#0b5858] mb-2">Stock Movement History</h1>
            <p className="text-sm text-gray-600">Comprehensive audit trail for warehouse and unit inventory movements.</p>
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView('warehouse')}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${view === 'warehouse' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Warehouse Records
            </button>
            <button
              type="button"
              onClick={() => setView('unit')}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${view === 'unit' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Unit Records
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 inventory-reveal">
          {summaryStats.map((stat) => (
            <div key={stat.label} className={`relative bg-gradient-to-br ${stat.gradient} rounded-xl shadow-md p-4 overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-wider text-white/70 uppercase mb-2">{stat.label}</div>
                <div className="text-3xl font-bold text-white leading-none">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 inventory-reveal flex flex-col gap-2.5">
          <div className="bg-[#f3f4f6] border border-gray-200 rounded-xl p-2.5">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${view === 'warehouse' ? 'lg:grid-cols-[minmax(260px,1fr)_170px_190px_190px_150px_150px]' : 'lg:grid-cols-[minmax(260px,1fr)_190px_190px_190px_150px_150px]'} gap-2.5 items-center`}>
              <div className="relative">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={view === 'warehouse' ? 'Product, warehouse, done by, reason, ref, ID...' : 'Product, unit, warehouse, done by, reason, ref, ID...'}
                  className="w-full pl-10 pr-8 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white text-gray-900 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
                />
              </div>

              {view === 'warehouse' ? (
                <InventoryDropdown value={typeFilter} onChange={setTypeFilter} options={typeOptions} fullWidth minWidthClass="min-w-[0]" />
              ) : (
                <InventoryDropdown value={unitFilter} onChange={setUnitFilter} options={unitOptions} fullWidth minWidthClass="min-w-[0]" />
              )}

              <InventoryDropdown value={warehouseFilter} onChange={setWarehouseFilter} options={warehouseOptions} fullWidth minWidthClass="min-w-[0]" />
              <InventoryDropdown value={referenceFilter} onChange={setReferenceFilter} options={referenceOptions} fullWidth minWidthClass="min-w-[0]" />
              <SingleDatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" className="w-full" />
              <SingleDatePicker value={dateTo} onChange={setDateTo} placeholder="To date" className="w-full" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[13px] text-gray-600">
              Showing <strong style={{ color: '#0b5858' }}>{view === 'warehouse' ? filteredWarehouseRows.length : filteredUnitRows.length}</strong> records
            </div>
            <button type="button" onClick={clearFilters} className="px-3.5 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 transition-colors">
              Clear Filters
            </button>
          </div>
        </div>

        <div className="inventory-reveal mt-5 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1200px]">
              <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white">
                <tr>
                  {(view === 'warehouse'
                    ? ['ID', 'PRODUCT', 'WAREHOUSE', 'UNIT', 'TYPE', 'QTY', 'DONE BY', 'REASON', 'REFERENCE', 'BEFORE QTY', 'AFTER QTY', 'DATE', 'TIME']
                    : ['ID', 'PRODUCT', 'UNIT', 'SOURCE WAREHOUSE', 'TYPE', 'QTY', 'DONE BY', 'REASON', 'REFERENCE', 'BEFORE QTY', 'AFTER QTY', 'DATE', 'TIME']
                  ).map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-bold tracking-wide text-white/75">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`s-${idx}`} className="border-b border-gray-200 last:border-b-0 animate-pulse">
                      {Array.from({ length: view === 'warehouse' ? 13 : 13 }).map((__, cIdx) => (
                        <td key={`c-${idx}-${cIdx}`} className="px-4 py-3"><div className="h-3 w-20 rounded bg-slate-200" /></td>
                      ))}
                    </tr>
                  ))
                ) : view === 'warehouse' ? (
                  filteredWarehouseRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-10 text-center text-sm text-gray-400">No warehouse movement records found</td>
                    </tr>
                  ) : (
                    filteredWarehouseRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{row.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.warehouseName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.unitName ? row.unitName : <OptionalValueBadge />}</td>
                        <td className="px-4 py-3"><Tag label={row.type === 'in' ? 'In' : 'Out'} className={getTypeBadgeClasses(row.type)} /></td>
                        <td className={`px-4 py-3 text-sm font-bold ${row.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{row.type === 'in' ? '+' : '-'}{row.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.createdBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.reason ? row.reason : <OptionalValueBadge />}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.referenceId ? row.referenceId : <OptionalValueBadge />}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.beforeQuantity !== undefined ? row.beforeQuantity : <OptionalValueBadge />}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.afterQuantity !== undefined ? row.afterQuantity : <OptionalValueBadge />}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.recordedDate || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.recordedTime || '-'}</td>
                      </tr>
                    ))
                  )
                ) : filteredUnitRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-10 text-center text-sm text-gray-400">No unit movement records found</td>
                  </tr>
                ) : (
                  filteredUnitRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{row.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.unitName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.sourceWarehouseName}</td>
                      <td className="px-4 py-3"><Tag label="Out" className={getTypeBadgeClasses('out')} /></td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600">-{row.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.createdBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.reason ? row.reason : <OptionalValueBadge />}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.referenceId ? row.referenceId : <OptionalValueBadge />}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.beforeQuantity !== undefined ? row.beforeQuantity : <OptionalValueBadge />}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.afterQuantity !== undefined ? row.afterQuantity : <OptionalValueBadge />}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.recordedDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.recordedTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
