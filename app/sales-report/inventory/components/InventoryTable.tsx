
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReplenishmentItem } from '../types';
import AuditTrailModal from './AuditTrailModal';
import EditItemModal from './EditItemModal';
import InventoryDropdown, { type InventoryDropdownOption } from './InventoryDropdown';

interface ReplenishmentTableProps {
  items: ReplenishmentItem[];
  limitRows?: boolean;
  onItemClick?: (item: ReplenishmentItem) => void;
  redirectOnClick?: boolean;
  hideEditButton?: boolean;
  isUnitView?: boolean;
  isLoading?: boolean;
}

type StockStatus = 'out' | 'critical' | 'low' | 'ok';
type SortKey = '' | 'name' | 'stock' | 'shortfall' | 'category';

interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

const SORT_OPTIONS: InventoryDropdownOption<SortKey>[] = [
  { value: '', label: 'Default' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'category', label: 'Category' },
  { value: 'stock', label: 'Stock (low -> high)' },
  { value: 'shortfall', label: 'Shortfall (high -> low)' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const getStockStatus = (current: number, min: number): StockStatus => {
  if (current === 0) return 'out';
  if (min <= 0) return 'ok';
  const ratio = current / min;
  if (ratio < 0.4) return 'critical';
  if (ratio < 1) return 'low';
  return 'ok';
};

const getShortfall = (current: number, min: number) => {
  if (min <= 0) return 0;
  return Math.max(0, min - current);
};

const STATUS_CONFIG: Record<StockStatus, StatusConfig> = {
  out: { label: 'Out of Stock', color: '#f10e3b', bg: '#fef2f2' },
  critical: { label: 'Critical', color: '#f18b0e', bg: '#fff7ed' },
  low: { label: 'Low Stock', color: '#e0b819', bg: '#fffbeb' },
  ok: { label: 'In Stock', color: '#15803d', bg: '#f0fdf4' },
};

// ── Icons ──────────────────────────────────────────────────────────────────
const ArrowDownIcon = ({ color, size = 12 }: { color: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    className="inline-block align-middle flex-shrink-0"
  >
    <path
      d="M6 2v8M6 10L3 7M6 10L9 7"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = ({ color }: { color: string }) => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="flex-shrink-0">
    <path
      d="M2 5.5L4.5 8L9 3"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InventoryTableSkeleton = () => {
  return (
    <div className="px-3 py-2 sm:py-3">
      <div className="animate-pulse space-y-2 sm:space-y-2.5">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={`skeleton-row-${rowIndex}`}
            className="grid items-center border-b border-[#e8f4f4] pb-2 sm:pb-2.5"
            style={{ gridTemplateColumns: '100px 1fr 120px 110px 190px 150px', minWidth: 'max(100%, 600px)' }}
          >
            <div className="px-2 sm:px-3 py-3 sm:py-5">
              <div className="h-2.5 sm:h-3 w-16 rounded bg-slate-200" />
            </div>
            <div className="px-2 sm:px-3 py-3 sm:py-5">
              <div className="h-3 sm:h-3.5 w-28 sm:w-40 rounded bg-slate-200" />
            </div>
            <div className="px-2 sm:px-3 py-3 sm:py-5">
              <div className="h-2.5 sm:h-3 w-20 sm:w-24 rounded bg-slate-200" />
            </div>
            <div className="px-2 sm:px-3 py-3 sm:py-5">
              <div className="h-5 w-16 rounded bg-slate-200" />
            </div>
            <div className="px-2 sm:px-3 py-3 sm:py-4">
              <div className="h-3 sm:h-4 w-14 rounded bg-slate-200 mb-2" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
            </div>
            <div className="px-2 sm:px-3 py-3 sm:py-4">
              <div className="h-6 w-20 rounded-full bg-slate-200 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StockCell = ({ item, isUnitView = false }: { item: ReplenishmentItem; isUnitView?: boolean }) => {
  const [hovered, setHovered] = useState(false);
  const status = getStockStatus(item.currentStock, isUnitView ? 0 : item.minStock);
  const cfg = STATUS_CONFIG[status];
  const ratio = isUnitView
    ? item.currentStock > 0
      ? 1
      : 0
    : Math.min(item.currentStock / Math.max(item.minStock, 1), 1);
  const pct = Math.round(ratio * 100);

  return (
    <div
      className="px-2 py-3 sm:px-3 sm:py-4 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Count row: big number + unit chip */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[13px] sm:text-[15px] font-semibold leading-none"
          style={{
            fontFamily: "'DM Mono', monospace",
            color: status === 'ok' ? '#0f172a' : cfg.color,
          }}
        >
          {item.currentStock}
        </span>
        <span
          className="text-[9.5px] sm:text-[10.5px] font-semibold px-1.5 py-0.5 rounded tracking-wide"
          style={{
            color: status === 'ok' ? '#0B5858' : cfg.color,
            background: status === 'ok' ? '#e8f4f4' : cfg.bg,
          }}
        >
          {item.unit}
        </span>
      </div>

      {/* Bar row: fill bar + "of N unit" right-anchored */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-[#e8f4f4] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-400 ease-out"
            style={{
              width: `${pct}%`,
              background: status === 'ok' ? '#05807e' : cfg.color,
            }}
          />
        </div>
        {!isUnitView && (
          <span
            className="text-[9px] sm:text-[10px] whitespace-nowrap"
            style={{ fontFamily: "'DM Mono', monospace", color: '#b0bcc8' }}
          >
            of {item.minStock}
          </span>
        )}
      </div>

      {/* Hover tooltip */}
      {hovered && !isUnitView && (
        <div
          className="absolute bottom-full left-2 sm:left-3 mb-2 bg-gray-800 text-white text-[10px] sm:text-[11px] px-2 py-1.5 rounded-md whitespace-nowrap z-30 pointer-events-none shadow-lg"
          style={{ fontFamily: 'Poppins' }}
        >
          Min. threshold: <strong>{item.minStock} {item.unit}</strong>
          <span className="text-gray-400 ml-1.5">({pct}% filled)</span>
        </div>
      )}
    </div>
  );
};

// ── ShortfallCell ─────────────────────────────────────────────────────────
const ShortfallCell = ({ 
  item, 
  onStartOrder, 
  isUnitView = false 
}: { 
  item: ReplenishmentItem; 
  onStartOrder: (item: ReplenishmentItem) => void;
  isUnitView?: boolean;
}) => {
  if (isUnitView) {
    return (
      <div className="px-2 py-3 sm:px-3 sm:py-4 flex justify-center">
        <span
          className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11.5px] font-semibold rounded-full px-2.5 sm:px-3 py-1"
          style={{ color: '#64748b', background: '#f1f5f9' }}
        >
          N/A
        </span>
      </div>
    );
  }

  const status = getStockStatus(item.currentStock, item.minStock);
  const cfg = STATUS_CONFIG[status];
  const shortfall = getShortfall(item.currentStock, item.minStock);

  if (shortfall === 0) {
    return (
      <div className="px-2 py-3 sm:px-3 sm:py-4 flex justify-center">
        <span
          className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11.5px] font-semibold rounded-full px-2.5 sm:px-3 py-1"
          style={{ color: '#15803d', background: '#f0fdf4' }}
        >
          <CheckIcon color="#15803d" />
          OK
        </span>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 sm:px-3 sm:py-4 flex flex-col items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[11.5px] font-semibold rounded-full px-2.5 sm:px-3 py-1 whitespace-nowrap"
        style={{ color: cfg.color, background: cfg.bg }}
      >
        <ArrowDownIcon color={cfg.color} size={12} />
        {shortfall} {item.unit}
      </span>
      {!isUnitView && (status === 'low' || status === 'critical') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartOrder(item);
          }}
          className="text-[10.5px] font-semibold px-2.5 py-1 rounded-md bg-[#0B5858] text-white hover:bg-[#05807e] transition-colors whitespace-nowrap"
          style={{ fontFamily: 'Poppins' }}
          title="Create purchase order for this item"
        >
          Start Order
        </button>
      )}
    </div>
  );
};

// ── Restock Alert ─────────────────────────────────────────────────────────
const RestockAlert = ({ count }: { count: number }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);
  if (count === 0 || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border-[1.5px] border-amber-300 border-l-[3px] rounded-lg mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2.5L14 13H2L8 2.5Z"
              fill="#fde68a"
              stroke="#a16207"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M8 7v2.5" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.2" r="0.8" fill="#a16207" />
          </svg>
        </div>
        <div>
          <span className="text-[13px] font-semibold text-amber-900" style={{ fontFamily: 'Poppins' }}>
            {count} item{count !== 1 ? 's' : ''} need restocking
          </span>
          <span className="text-[12px] text-amber-800 ml-1.5" style={{ fontFamily: 'Poppins' }}>
            Review shortfalls below and raise a purchase order.
          </span>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        className="p-1.5 rounded-md hover:bg-amber-200 transition-colors flex items-center flex-shrink-0"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 2l9 9M11 2L2 11" stroke="#a16207" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const ReplenishmentTable: React.FC<ReplenishmentTableProps> = ({ 
  items, 
  limitRows = true,
  onItemClick,
  redirectOnClick = false,
  hideEditButton = false,
  isUnitView = false,
  isLoading = false,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortKey>('');
  const [selectedAuditItem, setSelectedAuditItem] = useState<ReplenishmentItem | null>(null);
  const [editItem, setEditItem] = useState<ReplenishmentItem | null>(null);

  const filtered: ReplenishmentItem[] = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const result = items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        if (sortBy === 'stock') return a.currentStock - b.currentStock;
        if (sortBy === 'shortfall') {
          return getShortfall(b.currentStock, isUnitView ? 0 : b.minStock) - getShortfall(a.currentStock, isUnitView ? 0 : a.minStock);
        }
        return 0;
      });
    return result;
  }, [items, searchQuery, sortBy, isUnitView]);

  const needsRestockCount: number = useMemo(() => {
    if (isUnitView) {
      return items.filter((i) => i.currentStock === 0).length;
    }
    return items.filter((i) => getStockStatus(i.currentStock, i.minStock) !== 'ok').length;
  }, [items, isUnitView]);

  const handleStartOrder = (item: ReplenishmentItem) => {
    router.push(`/sales-report/inventory/purchase-orders/create?itemId=${item.id}`);
  };

  return (
    <div>
      {/* ── Restock Alert ────────────────────────────────────────────── */}
      {!isUnitView && <RestockAlert count={needsRestockCount} />}

      {/* ── Search + Sort ────────────────────────────────────────────── */}
      <div className="flex gap-2.5 mb-3.5 items-center">
        <div className="flex-1 relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="6" cy="6" r="4.5" stroke="#b0bcc8" strokeWidth="1.4" />
            <path d="M9.5 9.5l2.5 2.5" stroke="#b0bcc8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, or category…"
            className="w-full px-3.5 py-2.5 pl-10 border-[1.5px] border-gray-200 rounded-lg text-[13px] text-gray-900 bg-white focus:border-[#0B5858] focus:ring-2 focus:ring-[#cce8e8] outline-none transition-all"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <InventoryDropdown
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          placeholder="Sort by"
          placeholderWhen=""
          minWidthClass="min-w-[180px]"
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-h-[60vh] md:max-h-[600px] flex flex-col">
        {/* Horizontal scroll wrapper for mobile */}
        <div className="overflow-x-auto overflow-y-auto scroll-smooth flex-1 min-h-0">
          <div style={{ minWidth: 'fit-content' }}>
            {/* Column headers */}
            <div
              className="grid px-3 bg-gradient-to-r from-[#0b5858] to-[#05807e] rounded-t-xl sticky top-0 z-10"
              style={{ gridTemplateColumns: hideEditButton ? '100px 1fr 120px 110px 190px 150px' : '100px 1fr 120px 110px 190px 150px 70px', minWidth: 'max(100%, 600px)' }}
            >
              {[
                { label: 'SKU', align: 'left' },
                { label: 'ITEM', align: 'left' },
                { label: 'CATEGORY', align: 'left' },
                { label: 'TYPE', align: 'center' },
                { label: 'STOCK', align: 'left' },
                { label: 'SHORTFALL', align: 'center' },
                ...(hideEditButton ? [] : [{ label: 'ACTIONS', align: 'center' }]),
              ].map((col, i) => (
                <div
                  key={i}
                  className={`px-2 sm:px-3 py-2.5 sm:py-3 text-[9.5px] sm:text-[10.5px] font-semibold tracking-[0.12em] text-white/65 text-${col.align}`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Rows container with optional vertical scroll */}
            {isLoading ? (
              <InventoryTableSkeleton />
            ) : filtered.length === 0 ? (
              <div className="px-6 py-14 text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-semibold text-gray-900">No items match your search</span>
                </div>
              </div>
            ) : (
              <div>
                <style>{`
                  div::-webkit-scrollbar {
                    width: 0;
                    height: 0;
                  }
                `}</style>
                {filtered.map((item, idx) => {
                  const status = getStockStatus(item.currentStock, isUnitView ? 0 : item.minStock);

                  const handleRowClick = () => {
                    if (onItemClick) {
                      onItemClick(item);
                    } else if (isUnitView || redirectOnClick) {
                      router.push(`/sales-report/inventory/items?itemId=${item.id}`);
                    } else {
                      setSelectedAuditItem(item);
                    }
                  };

                  const handleEditClick = (e: React.MouseEvent) => {
                    e.stopPropagation(); // Prevent row click
                    setEditItem(item);
                  };

                  return (
                    <div
                      key={item.id}
                      className={`grid px-3 items-center transition-colors cursor-pointer hover:bg-[#e8f4f4] ${
                        idx < filtered.length - 1 ? 'border-b border-[#e8f4f4]' : ''
                      }`}
                      style={{ gridTemplateColumns: hideEditButton ? '100px 1fr 120px 110px 190px 150px' : '100px 1fr 120px 110px 190px 150px 70px', minWidth: 'max(100%, 600px)' }}
                      onClick={handleRowClick}
                    >
                      {/* SKU */}
                      <div className="px-2 sm:px-3 py-3 sm:py-5">
                        <div
                          className="text-align-center text-[10px] sm:text-[11px] text-gray-400 transition-colors hover:text-[#05807e]"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {item.sku}
                        </div>
                      </div>

                      {/* Item */}
                      <div className="px-2 sm:px-3 py-3 sm:py-5">
                        <div className="text-[12.5px] sm:text-[13.5px] font-medium text-gray-900 transition-colors hover:text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>
                          {item.name}
                        </div>
                      </div>

                      {/* Category */}
                      <div className="px-2 sm:px-3 py-3 sm:py-5">
                        <span className="text-[11px] sm:text-[12px] font-medium text-gray-600" style={{ fontFamily: 'Poppins' }}>
                          {item.category}
                        </span>
                      </div>

                      {/* Type badge */}
                      <div className="px-2 sm:px-3 py-3 sm:py-5">
                        <span
                          className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wide"
                          style={{
                            background: status === 'ok' ? '#e8f4f4' : '#f8fafc',
                            color: status === 'ok' ? '#0b5858' : '#475569',
                            fontFamily: 'Poppins',
                          }}
                        >
                          {item.type}
                        </span>
                      </div>

                      {/* Stock — bar + count + unit, threshold in hover tooltip */}
                      <StockCell item={item} isUnitView={isUnitView} />

                      {/* Shortfall */}
                      <ShortfallCell item={item} onStartOrder={handleStartOrder} isUnitView={isUnitView} />

                      {/* Actions */}
                      {!hideEditButton && (
                        <div className="px-2 sm:px-3 py-3 sm:py-5 flex items-center justify-center">
                          <button
                            onClick={handleEditClick}
                            className="text-[#05807e] hover:text-[#0b5858] transition-colors p-1.5 rounded hover:bg-[#e8f4f4]"
                            title="Edit item"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.333 2.00004C11.5084 1.82463 11.7163 1.68648 11.9451 1.59347C12.1738 1.50046 12.4191 1.45435 12.6663 1.45435C12.9136 1.45435 13.1589 1.50046 13.3876 1.59347C13.6164 1.68648 13.8243 1.82463 13.9997 2.00004C14.1751 2.17546 14.3132 2.38334 14.4062 2.61209C14.4992 2.84084 14.5453 3.08618 14.5453 3.33337C14.5453 3.58057 14.4992 3.82591 14.4062 4.05466C14.3132 4.28341 14.1751 4.49129 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="mt-3 flex justify-end">
        <span className="text-[12px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
          Warehouse inventory items with thresholds, restock alerts, and stock-out options -{' '}
          <span className="font-semibold text-[#05807e]">{filtered.length}</span> item
          {filtered.length !== 1 ? 's' : ''} across{' '}
          <span className="font-semibold text-[#05807e]">
            {new Set(filtered.map((i) => i.category)).size}
          </span>{' '}
          categor{new Set(filtered.map((i) => i.category)).size !== 1 ? 'ies' : 'y'}
          {searchQuery && <span className="text-gray-400"> — filtered by "{searchQuery}"</span>}
        </span>
      </div>

      {/* ── Audit Modal ──────────────────────────────────────────────── */}
      {!redirectOnClick && !onItemClick && (
        <AuditTrailModal item={selectedAuditItem} onClose={() => setSelectedAuditItem(null)} />
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      <EditItemModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(updatedData) => {
          console.log('Item updated:', updatedData);
          // TODO(backend): Update item in the items array or refetch from API
        }}
      />
    </div>
  );
};

export default ReplenishmentTable;
