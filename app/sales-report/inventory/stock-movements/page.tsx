'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SingleDatePicker from '@/components/SingleDatePicker';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import {
  loadInventoryDataset,
  inventoryItems,
  inventoryStockMovements,
  inventoryUnitStockMovements,
  inventoryWarehouseDirectory,
} from '../lib/inventoryDataStore';
import type { EnhancedMovement } from '../helpers/types';
import { exportStockMovementsToCsv, exportStockMovementsToPdf } from '../helpers/exportHelpers';
import NoneBadge, { isNoneLike } from '../components/NoneBadge';

type MovementView = 'warehouse' | 'unit';
type MovementType = 'in' | 'out' | 'adjustment';
type ReferenceType = 'PO' | 'BOOKING' | 'DAMAGE' | 'MANUAL';

const MOVEMENT_VIEW_STORAGE_KEY = 'inventory.stockMovements.view';

type WarehouseMovementRow = {
  id: string;
  productName: string;
  warehouseName: string;
  unitName?: string;
  type: MovementType; // 'in' | 'out' | 'adjustment' (adjustment: quantity is signed)
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

type UnitMovementRow = (typeof inventoryUnitStockMovements)[number];

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
    : type === 'adjustment'
      ? 'bg-blue-50 text-blue-700 border border-blue-200'
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

type SortKey = 'date' | 'product' | 'location' | 'qty';

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
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const warehouseRows = useMemo<WarehouseMovementRow[]>(() => {
    const byWarehouseId = new Map(inventoryWarehouseDirectory.map((warehouse) => [warehouse.id, warehouse.name]));
    const byProductId = new Map(inventoryItems.map((item) => [item.id, item.name]));

    // Compute before/after by replaying movements chronologically per (warehouse, product)
    const movementsWithDate = inventoryStockMovements
      .filter((m) => m.warehouseId)
      .map((m) => {
        const dt = normalizeDateTime(m.movementDateTime || m.createdAt);
        const parsed = parseDateTime(dt.date || '1970-01-01', dt.time || '00:00');
        const ts = Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        return { movement: m, ts };
      });

    // Current balance per (warehouse, product). Prefer replenishment item's currentStock when
    // the product's default warehouse matches, as it's often more accurate after stock movements.
    const currentBalanceByKey = new Map<string, number>();
    for (const warehouse of inventoryWarehouseDirectory) {
      for (const row of warehouse.inventoryBalances ?? []) {
        currentBalanceByKey.set(`${warehouse.id}::${row.productId}`, row.quantity);
      }
    }
    for (const item of inventoryItems) {
      if (item.warehouseId) {
        const key = `${item.warehouseId}::${item.id}`;
        currentBalanceByKey.set(key, item.currentStock);
      }
    }

    const byKey = new Map<string, typeof movementsWithDate>();
    for (const entry of movementsWithDate) {
      const key = `${entry.movement.warehouseId}::${entry.movement.productId}`;
      const list = byKey.get(key) ?? [];
      list.push(entry);
      byKey.set(key, list);
    }

    const computedBeforeAfter = new Map<string, { before: number; after: number }>();
    for (const [key, list] of byKey) {
      list.sort((a, b) => a.ts - b.ts);
      const currentBalance = currentBalanceByKey.get(key) ?? 0;
      const netDelta = list.reduce(
        (sum, { movement }) =>
          sum +
          (movement.type === 'adjustment'
            ? movement.quantity
            : movement.type === 'in'
              ? movement.quantity
              : -movement.quantity),
        0
      );
      const openingBalance = currentBalance - netDelta;
      let balance = openingBalance;
      for (const { movement } of list) {
        const before = balance;
        const delta =
          movement.type === 'adjustment'
            ? movement.quantity
            : movement.type === 'in'
              ? movement.quantity
              : -movement.quantity;
        balance += delta;
        computedBeforeAfter.set(movement.id, { before, after: balance });
      }
    }

    return inventoryStockMovements.map((movement) => {
      const dateTime = normalizeDateTime(movement.movementDateTime || movement.createdAt);
      const computed = movement.warehouseId
        ? computedBeforeAfter.get(movement.id)
        : undefined;
      return {
        id: movement.id,
        productName: byProductId.get(movement.productId) || 'Unknown Product',
        warehouseName: byWarehouseId.get(movement.warehouseId || '') || 'Unknown Warehouse',
        unitName: movement.unitName,
        type: (String(movement.type).toLowerCase() === 'adjustment' ? 'adjustment' : movement.type === 'in' ? 'in' : 'out') as MovementType,
        quantity: movement.quantity,
        createdBy: movement.createdBy || 'Admin User',
        reason: movement.reason || movement.notes || 'N/A',
        referenceType: movement.referenceType || 'MANUAL',
        referenceId: movement.referenceId,
        beforeQuantity: computed?.before ?? movement.beforeQuantity,
        afterQuantity: computed?.after ?? movement.afterQuantity,
        recordedDate: dateTime.date,
        recordedTime: dateTime.time,
      };
    });
  }, [refreshTick, datasetTick]);

  const unitRows = useMemo<UnitMovementRow[]>(() => [...inventoryUnitStockMovements], [refreshTick, datasetTick]);

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
      { value: 'adjustment', label: 'Adjustment' },
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
    setPage(1);
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

  // Reset to first page when view or filters change
  useEffect(() => {
    setPage(1);
  }, [view, search, warehouseFilter, unitFilter, typeFilter, referenceFilter, dateFrom, dateTo]);

  const sortWarehouseRows = (rows: WarehouseMovementRow[]): WarehouseMovementRow[] => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortKey === 'date') {
        const aDate = parseDateTime(a.recordedDate, a.recordedTime);
        const bDate = parseDateTime(b.recordedDate, b.recordedTime);
        return direction * (aDate.getTime() - bDate.getTime());
      }

      if (sortKey === 'product') {
        aValue = a.productName ?? '';
        bValue = b.productName ?? '';
      } else if (sortKey === 'location') {
        aValue = a.warehouseName;
        bValue = b.warehouseName;
      } else if (sortKey === 'qty') {
        aValue = a.quantity ?? 0;
        bValue = b.quantity ?? 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction * aValue.localeCompare(bValue);
      }

      return direction * (Number(aValue) - Number(bValue));
    });
  };

  const sortedWarehouseRows = useMemo(
    () => sortWarehouseRows(filteredWarehouseRows),
    [filteredWarehouseRows, sortKey, sortDirection]
  );

  const sortUnitRows = (rows: UnitMovementRow[]): UnitMovementRow[] => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortKey === 'date') {
        const aDate = parseDateTime(a.recordedDate, a.recordedTime);
        const bDate = parseDateTime(b.recordedDate, b.recordedTime);
        return direction * (aDate.getTime() - bDate.getTime());
      }

      if (sortKey === 'product') {
        aValue = a.productName ?? '';
        bValue = b.productName ?? '';
      } else if (sortKey === 'location') {
        aValue = a.unitName ?? '';
        bValue = b.unitName ?? '';
      } else if (sortKey === 'qty') {
        aValue = a.quantity ?? 0;
        bValue = b.quantity ?? 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction * aValue.localeCompare(bValue);
      }

      return direction * (Number(aValue) - Number(bValue));
    });
  };

  const sortedUnitRows = useMemo(
    () => sortUnitRows(filteredUnitRows),
    [filteredUnitRows, sortKey, sortDirection]
  );

  const buildExportRows = (): EnhancedMovement[] => {
    if (view === 'warehouse') {
      return sortedWarehouseRows.map(
        (row): EnhancedMovement => ({
          id: row.id,
          productId: '',
          type: row.type,
          quantity: row.quantity,
          warehouseId: '',
          unitId: undefined,
          unitName: row.unitName,
          reason: row.reason,
          referenceType: row.referenceType,
          beforeQuantity: row.beforeQuantity,
          afterQuantity: row.afterQuantity,
          movementDateTime: `${row.recordedDate} ${row.recordedTime || ''}`.trim(),
          notes: '',
          referenceId: row.referenceId,
          createdAt: `${row.recordedDate}T${row.recordedTime || '00:00'}`,
          createdBy: row.createdBy,
          productName: row.productName,
          productSku: '',
          productCategory: '',
          warehouseName: row.warehouseName,
          recordedDate: row.recordedDate,
          recordedTime: row.recordedTime,
        })
      );
    }

    return sortedUnitRows.map(
      (row): EnhancedMovement => ({
        id: row.id,
        productId: row.productId,
        type: 'out',
        quantity: row.quantity,
        warehouseId: row.sourceWarehouseId,
        unitId: row.unitId,
        unitName: row.unitName,
        reason: row.reason,
        referenceType: row.referenceType,
        beforeQuantity: row.beforeQuantity,
        afterQuantity: row.afterQuantity,
        movementDateTime: `${row.recordedDate} ${row.recordedTime || ''}`.trim(),
        notes: '',
        referenceId: row.referenceId,
        createdAt: row.recordedAt,
        createdBy: row.createdBy,
        productName: row.productName,
        productSku: '',
        productCategory: '',
        warehouseName: row.sourceWarehouseName,
        recordedDate: row.recordedDate,
        recordedTime: row.recordedTime,
      })
    );
  };

  const totalWarehouseRecords = sortedWarehouseRows.length;
  const totalUnitRecords = sortedUnitRows.length;
  const totalRecords = view === 'warehouse' ? totalWarehouseRecords : totalUnitRecords;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pageWarehouseRows = sortedWarehouseRows.slice(startIndex, endIndex);
  const pageUnitRows = sortedUnitRows.slice(startIndex, endIndex);

  const handleSortChange = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('desc');
      return key;
    });
  };

  useEffect(() => {
    window.localStorage.setItem(MOVEMENT_VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage, view]);

  const handleExportCsv = () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    exportStockMovementsToCsv(rows);
  };

  const handleExportPdf = async () => {
    const rows = buildExportRows();
    if (!rows.length) return;
    await exportStockMovementsToPdf(rows);
  };

  useEffect(() => {
    const refresh = () => {
      void loadInventoryDataset(true).finally(() => {
        setRefreshTick((tick) => tick + 1);
        setDatasetTick((tick) => tick + 1);
      });
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
      const adjustmentNet = filteredWarehouseRows
        .filter((movement) => movement.type === 'adjustment')
        .reduce((sum, movement) => sum + movement.quantity, 0);

      const stats: Array<{ label: string; value: number | string; gradient: string }> = [
        { label: 'Total Records', value: filteredWarehouseRows.length, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
        { label: 'Stock In', value: `+${stockIn}`, gradient: 'from-green-600 to-green-700' },
        { label: 'Stock Out', value: `-${stockOut}`, gradient: 'from-red-500 to-red-600' },
      ];
      if (adjustmentNet !== 0) {
        stats.push({ label: 'Adjustments', value: adjustmentNet >= 0 ? `+${adjustmentNet}` : `${adjustmentNet}`, gradient: 'from-blue-500 to-blue-600' });
      }
      stats.push({ label: 'Ref Types', value: new Set(filteredWarehouseRows.map((row) => row.referenceType)).size, gradient: 'from-indigo-500 to-indigo-600' });
      return stats;
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
              <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Stock Movements</span>
            </nav>

            <h1 className="text-[32px] font-extrabold text-[#0b5858] mb-2">Stock Movement History</h1>
            <p className="text-sm text-gray-600">Comprehensive audit trail for warehouse and unit inventory movements.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: '#cbd5e1',
                  background: '#ffffff',
                  color: '#0b5858',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'Poppins',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                }}
                onClick={handleExportCsv}
              >
                <span style={{ fontSize: 13 }}>⬇</span>
                CSV
              </button>
              <button
                type="button"
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg,#0b5858,#05807e)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'Poppins',
                  boxShadow: '0 4px 14px rgba(5,128,126,0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none';
                }}
                onClick={handleExportPdf}
              >
                <span style={{ fontSize: 13 }}>⬇</span>
                PDF
              </button>
            </div>
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
            <div className={`relative z-[60] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${view === 'warehouse' ? 'xl:grid-cols-[minmax(220px,1fr)_150px_160px_160px_140px_140px]' : 'xl:grid-cols-[minmax(220px,1fr)_160px_160px_160px_140px_140px]'} gap-2.5 items-center`}>
              <div className="relative sm:col-span-2 md:col-span-3 xl:col-span-1">
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
                <InventoryDropdown
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={typeOptions}
                  fullWidth
                  minWidthClass="min-w-[0]"
                  menuZIndexClass="z-[999]"
                />
              ) : (
                <InventoryDropdown
                  value={unitFilter}
                  onChange={setUnitFilter}
                  options={unitOptions}
                  fullWidth
                  minWidthClass="min-w-[0]"
                  menuZIndexClass="z-[999]"
                />
              )}

              <InventoryDropdown
                value={warehouseFilter}
                onChange={setWarehouseFilter}
                options={warehouseOptions}
                fullWidth
                minWidthClass="min-w-[0]"
                menuZIndexClass="z-[999]"
              />
              <InventoryDropdown
                value={referenceFilter}
                onChange={setReferenceFilter}
                options={referenceOptions}
                fullWidth
                minWidthClass="min-w-[0]"
                menuZIndexClass="z-[999]"
              />
              <SingleDatePicker value={dateFrom} onChange={setDateFrom} placeholder="From date" className="w-full" />
              <SingleDatePicker value={dateTo} onChange={setDateTo} placeholder="To date" className="w-full" />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[13px] text-gray-600">
              Showing{' '}
              <strong style={{ color: '#0b5858' }}>
                {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex}
              </strong>{' '}
              of <strong style={{ color: '#0b5858' }}>{totalRecords}</strong> records
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-3.5 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[12px] font-semibold hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setView('warehouse')}
                  className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                    view === 'warehouse' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Warehouse Records
                </button>
                <button
                  type="button"
                  onClick={() => setView('unit')}
                  className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors ${
                    view === 'unit' ? 'bg-[#0b5858] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Unit Records
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div
          ref={tableRef}
          className="inventory-reveal mt-5 bg-white rounded-lg border border-gray-200 overflow-hidden hidden md:block"
        >
          {/* Horizontal scroll wrapper so columns keep comfortable spacing on smaller screens */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[1100px]">
              <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white">
                <tr>
                  {(view === 'warehouse'
                    ? ['ID', 'DATE / TIME', 'PRODUCT', 'WAREHOUSE', 'UNIT', 'TYPE', 'QTY', 'STOCK', 'REFERENCE', 'REASON', 'BY']
                    : ['ID', 'DATE / TIME', 'PRODUCT', 'UNIT', 'SOURCE WAREHOUSE', 'TYPE', 'QTY', 'STOCK', 'REFERENCE', 'REASON', 'BY']
                  ).map((header) => {
                    const isSortable =
                      header === 'PRODUCT' ||
                      header === 'DATE / TIME' ||
                      header === 'WAREHOUSE' ||
                      header === 'UNIT' ||
                      header === 'SOURCE WAREHOUSE' ||
                      header === 'QTY';

                    let key: SortKey | null = null;
                    if (header === 'PRODUCT') key = 'product';
                    if (header === 'WAREHOUSE' || header === 'UNIT' || header === 'SOURCE WAREHOUSE') key = 'location';
                    if (header === 'QTY') key = 'qty';
                    if (header === 'DATE / TIME') key = 'date';

                    const isActive = key && sortKey === key;

                    return (
                      <th
                        key={header}
                        className={`px-4 py-3 text-left text-xs font-bold tracking-wide text-white/75 ${
                          isSortable ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={key ? () => handleSortChange(key!) : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {header}
                          {isActive && (
                            <span className="text-[9px]">
                              {sortDirection === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`s-${idx}`} className="border-b border-gray-200 last:border-b-0 animate-pulse">
                      {Array.from({ length: 11 }).map((__, cIdx) => (
                        <td key={`c-${idx}-${cIdx}`} className="px-4 py-3">
                          <div className="h-3 w-20 rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : view === 'warehouse' ? (
                  sortedWarehouseRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-sm text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <span>No warehouse movement records found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageWarehouseRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <div className="text-[11px] text-gray-400 break-all" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {row.id}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-700 whitespace-normal break-words align-top">
                          <div>{row.recordedDate || '-'}</div>
                          <div className="text-[11px] text-gray-500">{row.recordedTime || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-gray-700 whitespace-normal break-words align-top">{row.productName}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                          {isNoneLike(row.warehouseName) ? <NoneBadge /> : row.warehouseName}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                          {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 align-top">
                          <Tag
                            label={row.type === 'in' ? 'In' : row.type === 'adjustment' ? 'Adjustment' : 'Out'}
                            className={getTypeBadgeClasses(row.type)}
                          />
                        </td>
                        <td
                          className={`px-4 py-3 align-top text-right text-[12.5px] font-bold ${
                            row.type === 'in'
                              ? 'text-green-600'
                              : row.type === 'adjustment'
                                ? row.quantity >= 0
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {row.type === 'adjustment'
                            ? (row.quantity >= 0 ? '+' : '') + row.quantity
                            : (row.type === 'in' ? '+' : '-') + Math.abs(row.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-gray-700 whitespace-normal break-words align-top">
                          {row.beforeQuantity !== undefined ? (
                            <span className="text-gray-500">{row.beforeQuantity}</span>
                          ) : (
                            <OptionalValueBadge />
                          )}
                          <span className="mx-1 text-[11px] text-gray-400">→</span>
                          {row.afterQuantity !== undefined ? (
                            <span className="font-semibold text-gray-800">{row.afterQuantity}</span>
                          ) : (
                            <OptionalValueBadge />
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 align-top">
                          {row.referenceId ? (
                            <div
                              className="text-[11px] text-gray-500 break-all"
                              style={{ fontFamily: "'DM Mono', monospace" }}
                            >
                              {row.referenceId}
                            </div>
                          ) : (
                            <OptionalValueBadge />
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                          {row.reason ? row.reason : <OptionalValueBadge />}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">{row.createdBy}</td>
                      </tr>
                    ))
                  )
                ) : sortedUnitRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>No unit movement records found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageUnitRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="text-[11px] text-gray-400 break-all" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {row.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-700 whitespace-normal break-words align-top">
                        <div>{row.recordedDate}</div>
                        <div className="text-[11px] text-gray-500">{row.recordedTime}</div>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-gray-700 whitespace-normal break-words align-top">
                        {row.productName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                        {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                        {isNoneLike(row.sourceWarehouseName) ? <NoneBadge /> : row.sourceWarehouseName}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 align-top">
                        <Tag label="Out" className={getTypeBadgeClasses('out')} />
                      </td>
                      <td className="px-4 py-3 align-top text-right text-[12.5px] font-bold text-red-600">
                        -{row.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-gray-700 whitespace-normal break-words align-top">
                        {row.beforeQuantity !== undefined ? (
                          <span className="text-gray-500">{row.beforeQuantity}</span>
                        ) : (
                          <OptionalValueBadge />
                        )}
                        <span className="mx-1 text-[11px] text-gray-400">→</span>
                        {row.afterQuantity !== undefined ? (
                          <span className="font-semibold text-gray-800">{row.afterQuantity}</span>
                        ) : (
                          <OptionalValueBadge />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 align-top">
                        {row.referenceId ? (
                          <div
                            className="text-[11px] text-gray-500 break-all"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            {row.referenceId}
                          </div>
                        ) : (
                          <OptionalValueBadge />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">
                        {row.reason ? row.reason : <OptionalValueBadge />}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-600 whitespace-normal break-words align-top">{row.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards (no drawer, sample-inspired layout) */}
        <div className="mt-5 space-y-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`m-s-${idx}`}
                className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm animate-pulse"
              >
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-48 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-full bg-slate-200 rounded" />
              </div>
            ))
          ) : view === 'warehouse' ? (
            sortedWarehouseRows.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
                No warehouse movement records found
              </div>
            ) : (
              pageWarehouseRows.map((row) => (
                <div
                  key={row.id}
                  className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">
                        {row.productName}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-400 break-all">
                        {row.id}
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        {row.recordedDate || '-'} {row.recordedTime || ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag
                        label={row.type === 'in' ? 'In' : row.type === 'adjustment' ? 'Adjustment' : 'Out'}
                        className={getTypeBadgeClasses(row.type)}
                      />
                      <div
                        className={`text-[13px] font-bold ${
                          row.type === 'in'
                            ? 'text-green-600'
                            : row.type === 'adjustment'
                              ? row.quantity >= 0
                                ? 'text-blue-600'
                                : 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {row.type === 'adjustment'
                          ? (row.quantity >= 0 ? '+' : '') + row.quantity
                          : (row.type === 'in' ? '+' : '-') + Math.abs(row.quantity)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-gray-500">WH:</span>
                      <span className="break-words">
                        {isNoneLike(row.warehouseName) ? <NoneBadge /> : row.warehouseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-gray-500">Unit:</span>
                      <span className="break-words">
                        {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-500">Stock:</span>
                      {row.beforeQuantity !== undefined ? (
                        <span className="text-gray-500">{row.beforeQuantity}</span>
                      ) : (
                        <OptionalValueBadge />
                      )}
                      <span className="mx-1 text-[11px] text-gray-400">→</span>
                      {row.afterQuantity !== undefined ? (
                        <span className="font-semibold text-gray-800">{row.afterQuantity}</span>
                      ) : (
                        <OptionalValueBadge />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-gray-500">Ref:</span>
                      <span className="break-words">
                        {row.referenceId ? row.referenceId : <OptionalValueBadge />}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold text-gray-500">By:</span>
                      <span>{row.createdBy}</span>
                    </span>
                  </div>

                  {row.reason && (
                    <div className="text-[11px] text-gray-500 mt-1 break-words">
                      {row.reason}
                    </div>
                  )}
                </div>
              ))
            )
          ) : sortedUnitRows.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
              No unit movement records found
            </div>
          ) : (
            pageUnitRows.map((row) => (
              <div
                key={row.id}
                className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">
                      {row.productName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-400 break-all">
                      {row.id}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {row.recordedDate} {row.recordedTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag label="Out" className={getTypeBadgeClasses('out')} />
                    <div className="text-[13px] font-bold text-red-600">-{row.quantity}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-gray-500">Unit:</span>
                    <span className="break-words">
                      {isNoneLike(row.unitName) ? <NoneBadge /> : row.unitName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-gray-500">From:</span>
                    <span className="break-words">
                      {isNoneLike(row.sourceWarehouseName) ? <NoneBadge /> : row.sourceWarehouseName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-500">Stock:</span>
                    {row.beforeQuantity !== undefined ? (
                      <span className="text-gray-500">{row.beforeQuantity}</span>
                    ) : (
                      <OptionalValueBadge />
                    )}
                    <span className="mx-1 text-[11px] text-gray-400">→</span>
                    {row.afterQuantity !== undefined ? (
                      <span className="font-semibold text-gray-800">{row.afterQuantity}</span>
                    ) : (
                      <OptionalValueBadge />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-gray-500">Ref:</span>
                    <span className="break-words">
                      {row.referenceId ? row.referenceId : <OptionalValueBadge />}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-gray-500">By:</span>
                    <span>{row.createdBy}</span>
                  </span>
                </div>

                {row.reason && (
                  <div className="text-[11px] text-gray-500 mt-1 break-words">
                    {row.reason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination (bottom of table, like sample UI) */}
        <div className="mt-3 flex items-center justify-between text-[12px] text-gray-600">
          <div>
            Page <span className="font-semibold text-[#0b5858]">{currentPage}</span> of{' '}
            <span className="font-semibold text-[#0b5858]">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-200 rounded-md px-1.5 py-0.5 text-[12px] bg-white"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded-md border border-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
