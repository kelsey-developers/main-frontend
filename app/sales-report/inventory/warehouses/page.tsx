'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SummaryCard from '../components/SummaryCard';
import InventoryDropdown, { type InventoryDropdownOption } from '../components/InventoryDropdown';
import StatusBadge from '../components/StatusBadge';
import NoneBadge from '../components/NoneBadge';
import ActiveStatusToggle from '../components/ActiveStatusToggle';
import { getWarehouseStats } from '../helpers/warehouseHelpers';
import {
  isWarehouseActive,
  loadInventoryDataset,
  inventoryWarehouseDirectory,
  inventoryItems,
  type WarehouseDirectoryRecord,
  type WarehouseInventoryBalanceRow,
  type WarehouseMovementRow,
} from '../lib/inventoryDataStore';
import { processStockOut, recomputeAllInventoryDerivedValues } from '../lib/inventoryLedger';
import { apiClient } from '@/lib/api/client';
import { useToast } from '../hooks/useToast';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';

type Warehouse = WarehouseDirectoryRecord;
type SortKey = 'name' | 'mostStock';

const formatRecordedDateTime = (value?: string) => {
  const base = value ? new Date(value) : new Date();
  const parsed = Number.isNaN(base.getTime()) ? new Date() : base;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const min = String(parsed.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    recordedAt: `${yyyy}-${mm}-${dd} ${hh}:${min}`,
  };
};

const nextWarehouseMovementId = (warehouses: Warehouse[]) => {
  const maxId = warehouses.reduce((max, warehouse) => {
    const warehouseMax = warehouse.stockMovements.reduce((innerMax, movement) => {
      const matched = movement.id.match(/^WM-(\d+)$/i);
      if (!matched) return innerMax;
      return Math.max(innerMax, Number(matched[1]));
    }, 0);
    return Math.max(max, warehouseMax);
  }, 0);

  return `WM-${String(maxId + 1).padStart(3, '0')}`;
};

const WarehouseFormModal = ({
  warehouse,
  existingNames,
  onClose,
  onSave,
}: {
  warehouse: Warehouse | null;
  existingNames: string[];
  onClose: () => void;
  onSave: (data: Omit<Warehouse, 'id' | 'inventoryBalances' | 'stockMovements'>) => void;
}) => {
  const { error } = useToast();
  const isEdit = Boolean(warehouse);
  const [form, setForm] = useState({
    name: warehouse?.name ?? '',
    location: warehouse?.location ?? '',
    description: warehouse?.description ?? '',
    deletedAt: warehouse?.deletedAt ?? undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      name: warehouse?.name ?? '',
      location: warehouse?.location ?? '',
      description: warehouse?.description ?? '',
      deletedAt: warehouse?.deletedAt ?? undefined,
    });
  }, [warehouse?.id, warehouse?.name, warehouse?.location, warehouse?.description, warehouse?.deletedAt]);

  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };

    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = 'Required';
    if (!form.location.trim()) nextErrors.location = 'Required';

    const normalizedName = form.name.trim().toLowerCase();
    const duplicate = existingNames.some((name) => {
      if (warehouse && name.trim().toLowerCase() === warehouse.name.trim().toLowerCase()) return false;
      return name.trim().toLowerCase() === normalizedName;
    });

    if (duplicate) nextErrors.name = 'Warehouse name already exists';

    return nextErrors;
  };

  const submit = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (isEdit && warehouse) {
      const noChanges =
        form.name.trim() === (warehouse.name ?? '').trim() &&
        form.location.trim() === (warehouse.location ?? '').trim() &&
        form.description.trim() === (warehouse.description ?? '').trim() &&
        (form.deletedAt ?? null) === (warehouse.deletedAt ?? null);
      if (noChanges) {
        error('No changes were made. Cancel or close to exit.');
        return;
      }
    }

    onSave({
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      deletedAt: form.deletedAt,
    });
    onClose();
  };

  const handleStatusToggle = (active: boolean) => {
    setForm((prev) => ({ ...prev, deletedAt: active ? undefined : new Date().toISOString().slice(0, 19) + 'Z' }));
  };

  const renderFieldLabel = (label: string, fieldKey: keyof typeof form) => (
    <label
      className={`text-[12px] font-semibold ${errors[fieldKey] ? 'text-red-600' : 'text-gray-700'}`}
      style={{ fontFamily: 'Poppins' }}
    >
      {label}
      {errors[fieldKey] && <span className="font-normal ml-1.5">? {errors[fieldKey]}</span>}
    </label>
  );

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[560px] max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-center rounded-t-2xl">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1" style={{ fontFamily: 'Poppins' }}>
              {isEdit ? 'EDIT WAREHOUSE' : 'NEW WAREHOUSE'}
            </div>
            <h3 className="text-[17px] font-bold text-white" style={{ fontFamily: 'Poppins' }}>
              {isEdit ? warehouse?.name : 'Add Warehouse'}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              {renderFieldLabel('Warehouse Name', 'name')}
              <input
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. Main Storage"
                className={`px-[12px] py-[10px] border-[1.5px] rounded-[10px] text-[14px] text-gray-700 outline-none w-full ${
                  errors.name
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 bg-white focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]'
                }`}
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              {renderFieldLabel('Location', 'location')}
              <input
                value={form.location}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, location: event.target.value }));
                  setErrors((prev) => ({ ...prev, location: '' }));
                }}
                placeholder="Room/floor or physical address"
                className={`px-[12px] py-[10px] border-[1.5px] rounded-[10px] text-[14px] text-gray-700 outline-none w-full ${
                  errors.location
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 bg-white focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]'
                }`}
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-gray-700" style={{ fontFamily: 'Poppins' }}>
                Description <span className="font-normal text-gray-500">? optional</span>
              </label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Capacity, access notes, temperature control, etc."
                rows={3}
                className="px-[12px] py-[10px] border-[1.5px] border-gray-200 rounded-[10px] text-[14px] text-gray-700 bg-white outline-none resize-vertical min-h-[72px] w-full focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            <ActiveStatusToggle
              isActive={!form.deletedAt}
              onToggle={handleStatusToggle}
              entityType="warehouse"
              canDeactivate={
                warehouse
                  ? () => {
                      const stats = getWarehouseStats(warehouse);
                      return stats.totalStockUnits === 0
                        ? true
                        : 'Move or deplete all stock before deactivating this warehouse.';
                    }
                  : undefined
              }
            />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button onClick={submit} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ fontFamily: 'Poppins' }}>
            {isEdit ? 'Save Changes' : 'Add Warehouse'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const WarehouseTransferStockModal = ({
  warehouses,
  sourceWarehouse,
  onClose,
  onTransfer,
}: {
  warehouses: Warehouse[];
  sourceWarehouse: Warehouse;
  onClose: () => void;
  onTransfer: (params: { fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number }) => void | Promise<void>;
}) => {
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const destinationWarehouses = warehouses.filter((warehouse) => warehouse.id !== sourceWarehouse.id && isWarehouseActive(warehouse));
  const transferableProducts = sourceWarehouse.inventoryBalances.filter((row) => row.quantity > 0);

  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const qty = Number(quantity);
    const sourceRow = sourceWarehouse.inventoryBalances.find((row) => row.productId === productId);

    if (!toWarehouseId) {
      setError('Select destination warehouse');
      return;
    }
    if (!productId) {
      setError('Select product');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!sourceRow || qty > sourceRow.quantity) {
      setError('Quantity exceeds available stock in source warehouse');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onTransfer({
        fromWarehouseId: sourceWarehouse.id,
        toWarehouseId,
        productId,
        quantity: qty,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[520px] overflow-visible shadow-2xl"
      >
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-[17px] font-bold text-white" style={{ fontFamily: 'Poppins' }}>Transfer Stock</h3>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3.5">
          <div className="text-[12px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
            Source warehouse: <span className="font-semibold text-gray-700">{sourceWarehouse.name}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700" style={{ fontFamily: 'Poppins' }}>Destination Warehouse</label>
            <InventoryDropdown
              value={toWarehouseId}
              onChange={setToWarehouseId}
              options={[
                { value: '', label: 'Select destination' },
                ...destinationWarehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name })),
              ]}
              placeholder="Select destination"
              placeholderWhen=""
              hideIcon={true}
              fullWidth={true}
              minWidthClass="min-w-0"
              align="left"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700" style={{ fontFamily: 'Poppins' }}>Product</label>
            <InventoryDropdown
              value={productId}
              onChange={setProductId}
              options={[
                { value: '', label: 'Select product' },
                ...transferableProducts.map((row) => ({
                  value: row.productId,
                  label: `${row.productName} (Available: ${row.quantity})`,
                })),
              ]}
              placeholder="Select product"
              placeholderWhen=""
              hideIcon={true}
              fullWidth={true}
              minWidthClass="min-w-0"
              align="left"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700" style={{ fontFamily: 'Poppins' }}>Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Enter quantity"
              className="px-[12px] py-[10px] border-[1.5px] border-gray-200 rounded-[10px] text-[14px] text-gray-700 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
              style={{ fontFamily: 'Poppins' }}
            />
          </div>

          {error && <p className="text-[12px] text-red-600" style={{ fontFamily: 'Poppins' }}>{error}</p>}
        </div>

        <div className="px-6 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Poppins' }}
          >
            {isSubmitting ? 'Transferring…' : 'Transfer Stock'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const WarehouseDetailModal = ({
  warehouse,
  onClose,
  onTransfer,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  onTransfer: () => void;
}) => {
  const router = useRouter();
  const stats = getWarehouseStats(warehouse);

  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';

      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, [onClose]);

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4">
      <div onClick={(event) => event.stopPropagation()} className="bg-white rounded-2xl w-full max-w-[900px] max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-start">
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1" style={{ fontFamily: 'Poppins' }}>
              WAREHOUSE DETAILS
            </div>
            <h2 className="text-[20px] font-bold text-white" style={{ fontFamily: 'Poppins' }}>{warehouse.name}</h2>
            <p className="text-white/80 text-[13px] mt-1" style={{ fontFamily: 'Poppins' }}>{warehouse.location}</p>
            <div className="mt-2"><StatusBadge active={isWarehouseActive(warehouse)} /></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="bg-[#e8f4f4] px-6 py-3 border-b border-[#cce8e8] flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-wide bg-white text-[#0b5858] border border-[#cce8e8]" style={{ fontFamily: 'Poppins' }}>
            Total Items: {stats.totalItems}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-wide bg-white text-gray-700 border border-gray-200" style={{ fontFamily: 'Poppins' }}>
            Stock Units: {stats.totalStockUnits}
          </span>
          <div className="flex-1"></div>
          <button
            onClick={onTransfer}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12px] font-semibold hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'Poppins' }}
          >
            Transfer Stock
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden self-start">
              <div className="px-4 py-3 bg-[#f8fbfb] border-b border-gray-200">
                <h3 className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>Inventory Balance</h3>
                <p className="text-[11px] text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>Warehouses track quantity only; minimum thresholds apply to units.</p>
              </div>
              {warehouse.inventoryBalances.length === 0 ? (
                <div className="px-4 py-8 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                  No stock yet - add stock from the Inventory items page.
                </div>
              ) : (
                <div className="max-h-[640px] overflow-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="text-[10.5px] uppercase tracking-wider text-gray-500 border-b border-gray-100" style={{ fontFamily: 'Poppins' }}>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5 text-center">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouse.inventoryBalances.map((row) => (
                        <tr key={row.productId} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-[13px] text-gray-800" style={{ fontFamily: 'Poppins' }}>{row.productName}</td>
                          <td className="px-4 py-2.5 text-[13px] text-center text-gray-700" style={{ fontFamily: 'Poppins' }}>{row.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#f8fbfb] border-b border-gray-200">
                  <h3 className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>Stock Movement History</h3>
                </div>
                {warehouse.stockMovements.length === 0 ? (
                  <div className="px-4 py-8 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    No movements yet for this warehouse.
                  </div>
                ) : (
                  <ul className="max-h-[180px] overflow-auto divide-y divide-gray-100">
                    {warehouse.stockMovements.slice(0, 8).map((movement) => (
                      <li key={movement.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12.5px] font-medium text-gray-800" style={{ fontFamily: 'Poppins' }}>{movement.productName}</p>
                          <span className="text-[11px] text-gray-500" style={{ fontFamily: 'Poppins' }}>{movement.date} {movement.time}</span>
                        </div>
                        <p className="text-[11.5px] text-gray-600" style={{ fontFamily: 'Poppins' }}>
                          {movement.type.toUpperCase()} - {movement.quantity} units - {movement.note}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#f8fbfb] border-b border-gray-200">
                  <h3 className="text-[14px] font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>Assigned Products</h3>
                </div>
                {warehouse.inventoryBalances.length === 0 ? (
                  <div className="px-4 py-8 text-[13px] text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    No assigned products yet.
                  </div>
                ) : (
                  <div className="px-4 py-3 flex flex-wrap gap-2">
                    {warehouse.inventoryBalances.map((row) => (
                      <button
                        onClick={() => router.push(`/sales-report/inventory/items?itemId=${row.productId}`)}
                        key={`tag-${row.productId}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#e8f4f4] text-[#0b5858] text-[11px] font-semibold hover:bg-[#cce8e8] transition-colors cursor-pointer"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {row.productName} ({row.quantity})
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const WarehousesSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <div className="px-4 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e] hidden lg:grid grid-cols-[1.45fr_1.25fr_100px_120px_130px_120px_340px]">
      {['WAREHOUSE NAME', 'LOCATION', 'TOTAL ITEMS', 'TOTAL STOCK UNITS', 'LOW STOCK ITEMS', 'STATUS', 'ACTIONS'].map((header) => (
        <div key={header} className="text-[10.5px] font-semibold tracking-wider text-white/70" style={{ fontFamily: 'Poppins' }}>
          {header}
        </div>
      ))}
    </div>
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="grid grid-cols-1 lg:grid-cols-[1.45fr_1.25fr_100px_120px_130px_120px_340px] gap-3 lg:gap-0 px-4 py-4 border-b border-gray-100 last:border-b-0"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-3 w-32 rounded bg-slate-200" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-6 w-12 rounded bg-slate-200" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-6 w-12 rounded bg-slate-200" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-6 w-12 rounded bg-slate-200" />
          </div>
          <div className="flex items-center">
            <div className="h-6 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 rounded-lg bg-slate-200" />
            <div className="h-8 w-24 rounded-lg bg-slate-200" />
            <div className="h-8 w-8 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function WarehousesPage() {
  const router = useRouter();
  const { error, success, warning } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  const [transferTarget, setTransferTarget] = useState<Warehouse | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const sortOptions: InventoryDropdownOption<SortKey>[] = [
    { value: 'name', label: 'Name A-Z' },
    { value: 'mostStock', label: 'Most stock units' },
  ];

  const filtered = useMemo(() => {
    return [...warehouses]
      .filter((warehouse) => {
        const q = search.trim().toLowerCase();
        const matchesSearch =
          warehouse.name.toLowerCase().includes(q) ||
          warehouse.location.toLowerCase().includes(q);
        const matchesFilter =
          filter === 'All' ||
          (filter === 'Active' ? isWarehouseActive(warehouse) : !isWarehouseActive(warehouse));
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        return getWarehouseStats(b).totalStockUnits - getWarehouseStats(a).totalStockUnits;
      });
  }, [warehouses, search, filter, sortKey]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null,
    [warehouses, selectedWarehouseId]
  );

  const totals = useMemo(() => {
    const totalWarehouses = warehouses.length;
    const activeCount = warehouses.filter((warehouse) => isWarehouseActive(warehouse)).length;
    const inactiveCount = totalWarehouses - activeCount;
    return { totalWarehouses, activeCount, inactiveCount };
  }, [warehouses]);

  const applyWarehouseList = () => {
    setWarehouses([...inventoryWarehouseDirectory]);
  };

  const handleSaveWarehouse = (data: Omit<Warehouse, 'id' | 'inventoryBalances' | 'stockMovements'> & { deletedAt?: string | null }) => {
    if (editTarget) {
      const run = async () => {
        const statusChanged = (data.deletedAt ?? null) !== (editTarget.deletedAt ?? null);
        const isActive = !data.deletedAt;
        const detailsChanged =
          data.name.trim() !== (editTarget.name ?? '').trim() ||
          data.location.trim() !== (editTarget.location ?? '').trim() ||
          (data.description ?? '').trim() !== (editTarget.description ?? '').trim();

        if (statusChanged) {
          await apiClient.patch(`/api/inventory/warehouses/${editTarget.id}/status`, { isActive });
        }
        if (detailsChanged) {
          await apiClient.patch(`/api/inventory/warehouses/${editTarget.id}`, {
            name: data.name,
            location: data.location ?? '',
            description: data.description ?? '',
          });
        }
        await loadInventoryDataset(true);
        applyWarehouseList();
        setFormOpen(false);
        setEditTarget(null);
        success('Warehouse updated successfully.');
      };
      void run().catch((err) => {
        if (process.env.NODE_ENV !== 'production') console.error('Warehouse update error:', err);
        error("We couldn't update the warehouse. Please try again.");
      });
      return;
    }

    const run = async () => {
      const response = await apiClient.post<{
        warehouse: { id: string; name: string; location: string; createdAt: string };
      }>('/api/inventory/warehouses', {
        name: data.name,
        location: data.location ?? '',
      });

      await loadInventoryDataset(true);
      applyWarehouseList();
      setSelectedWarehouseId(response.warehouse.id);
      success('Warehouse created successfully.');
    };

    run().catch((err) => {
      if (process.env.NODE_ENV !== 'production') console.error('Warehouse create error:', err);
      error("We couldn't create the warehouse. Please try again.");
    });
  };

  useEffect(() => {
    let isMounted = true;

    void loadInventoryDataset()
      .finally(() => {
        if (!isMounted) return;
        applyWarehouseList();
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void loadInventoryDataset(true).finally(() => {
        applyWarehouseList();
      });
    };

    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const hasShownOutOfStockToast = React.useRef(false);
  useEffect(() => {
    if (isLoading || warehouses.length === 0) return;
    const warehousesWithOutOfStock = warehouses.filter((wh) => {
      if (!isWarehouseActive(wh)) return false;
      const stats = getWarehouseStats(wh);
      return stats.lowStockItems > 0;
    });
    if (warehousesWithOutOfStock.length > 0 && !hasShownOutOfStockToast.current) {
      hasShownOutOfStockToast.current = true;
      const names = warehousesWithOutOfStock.map((w) => w.name).join(', ');
      warning(
        warehousesWithOutOfStock.length === 1
          ? `${warehousesWithOutOfStock[0].name} has items out of stock (0 quantity)`
          : `${warehousesWithOutOfStock.length} warehouses have items out of stock: ${names}`
      );
    }
  }, [isLoading, warehouses, warning]);

  const handleTransferStock = async ({
    fromWarehouseId,
    toWarehouseId,
    productId,
    quantity,
  }: {
    fromWarehouseId: string;
    toWarehouseId: string;
    productId: string;
    quantity: number;
  }) => {
    const product = inventoryItems.find((p) => p.id === productId);
    const productName = product?.name ?? 'Item';
    const destName = inventoryWarehouseDirectory.find((w) => w.id === toWarehouseId)?.name ?? 'destination';

    await processStockOut({
      productId,
      warehouseId: fromWarehouseId,
      quantity,
      reason: 'Inter-warehouse Transfer',
      date: getTodayInPhilippineTime(),
      notes: `Transfer to ${destName}`,
      transferToWarehouseId: toWarehouseId,
    });

    await loadInventoryDataset(true);
    applyWarehouseList();
    success(`${quantity} ${productName} transferred successfully.`);
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
        .add-warehouse-btn:hover {
          background: #0b5858 !important;
          color: #ffffff !important;
          border-color: #0b5858 !important;
        }
        .warehouse-row:hover {
          background: #e8f4f4 !important;
        }
      `}</style>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Warehouses</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>Warehouse Directory</h1>
          <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            Manage warehouse locations, stock balances, and transfer operations
          </p>
        </div>

        <button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
          className="add-warehouse-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-[1.5px] border-[#05807e] bg-white text-[#05807e] text-[13px] font-semibold transition-all"
          style={{ fontFamily: 'Poppins' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add Warehouse
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 inventory-reveal">
        {[
          { label: 'Total Warehouses', value: totals.totalWarehouses, gradient: 'from-[#0B5858] to-[#0a4a4a]' },
          { label: 'Active', value: totals.activeCount, gradient: 'from-green-600 to-green-700' },
          { label: 'Inactive', value: totals.inactiveCount, gradient: 'from-gray-500 to-gray-600' },
        ].map((stat, index) => (
          <SummaryCard
            key={index}
            label={stat.label}
            value={stat.value}
            gradient={stat.gradient}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 inventory-reveal">
        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by warehouse name or location"
            className="w-full pl-10 pr-4 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white text-gray-900 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
            style={{ fontFamily: 'Poppins' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">x</button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="inline-flex gap-1 bg-white border-[1.5px] border-gray-200 rounded-lg p-1">
            {(['All', 'Active', 'Inactive'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  filter === option
                    ? 'bg-[#05807e] text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="relative z-[60]">
            <InventoryDropdown
              value={sortKey}
              onChange={setSortKey}
              options={sortOptions}
              minWidthClass="min-w-[220px]"
              menuZIndexClass="z-[999]"
            />
          </div>
        </div>
      </div>

      <div className="inventory-reveal">
        {isLoading ? (
          <WarehousesSkeleton />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-[1.45fr_1.25fr_100px_120px_130px_120px_340px] px-4 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]">
            {['WAREHOUSE NAME', 'LOCATION', 'TOTAL ITEMS', 'TOTAL STOCK UNITS', 'LOW STOCK ITEMS', 'STATUS', 'ACTIONS'].map((header, index) => (
              <div
                key={header}
                className={`text-[10.5px] font-semibold tracking-wider text-white/70 ${index >= 2 && index <= 3 ? 'text-center' : ''}`}
                style={{ fontFamily: 'Poppins' }}
              >
                {header}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
          <div className="py-12 px-6 text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>
            <div className="flex justify-center mb-3">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="font-semibold text-gray-900 mb-1">No warehouse found</div>
            <p className="text-sm">Add a warehouse to start tracking inventory locations</p>
          </div>
        ) : (
          <div>
            {filtered.map((warehouse, index) => {
              const isLast = index === filtered.length - 1;
              const stats = getWarehouseStats(warehouse);

              return (
                <div
                  key={warehouse.id}
                  className={`warehouse-row grid grid-cols-1 lg:grid-cols-[1.45fr_1.25fr_100px_120px_130px_120px_340px] gap-3 lg:gap-0 px-4 py-4 ${
                    !isLast ? 'border-b border-gray-100' : ''
                  } ${isWarehouseActive(warehouse) ? 'bg-white' : 'bg-gray-50 opacity-80'} transition-colors`}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between lg:block">
                      <div>
                        <div
                          className="text-[13.5px] font-semibold text-gray-900 whitespace-normal break-words"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {warehouse.name}
                        </div>
                        <div
                          className="text-[11px] text-gray-400 mt-0.5 whitespace-normal break-words"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {warehouse.description || 'No description'}
                        </div>
                      </div>
                      {/* Mobile status badge in top-right */}
                      <div className="ml-3 lg:hidden">
                        <StatusBadge active={isWarehouseActive(warehouse)} />
                      </div>
                    </div>
                  </div>

                  <div className="lg:flex lg:flex-col lg:justify-center">
                    <div className="text-[13px] font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>{warehouse.location}</div>
                  </div>

                  <div className="hidden lg:flex items-center justify-center text-[14px] font-bold text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>{stats.totalItems}</div>
                  <div className="hidden lg:flex items-center justify-center text-[14px] font-bold text-gray-700" style={{ fontFamily: 'Poppins' }}>{stats.totalStockUnits}</div>
                  <div className="hidden lg:flex items-center justify-center">
                    {stats.lowStockItems === 0 ? <NoneBadge /> : (
                      <span className="text-[14px] font-bold text-gray-700" style={{ fontFamily: 'Poppins' }}>{stats.lowStockItems}</span>
                    )}
                  </div>
                  <div className="hidden lg:flex items-center"><StatusBadge active={isWarehouseActive(warehouse)} /></div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedWarehouseId(warehouse.id);
                        setDetailModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#cce8e8] bg-[#e8f4f4] text-[#0b5858] text-[11.5px] font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => {
                        router.push(
                          `/sales-report/inventory/items?warehouseId=${encodeURIComponent(warehouse.id)}&warehouseName=${encodeURIComponent(warehouse.name)}`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-[11.5px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      View Inventory
                    </button>

                    <button
                      onClick={() => {
                        setEditTarget(warehouse);
                        setFormOpen(true);
                      }}
                      className="text-[#05807e] hover:text-[#0b5858] transition-all duration-150 p-1.5 rounded hover:bg-[#e8f4f4] hover:scale-105 active:scale-95"
                      title="Edit warehouse"
                      aria-label="Edit warehouse"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.333 2.00004C11.5084 1.82463 11.7163 1.68648 11.9451 1.59347C12.1738 1.50046 12.4191 1.45435 12.6663 1.45435C12.9136 1.45435 13.1589 1.50046 13.3876 1.59347C13.6164 1.68648 13.8243 1.82463 13.9997 2.00004C14.1751 2.17546 14.3132 2.38334 14.4062 2.61209C14.4992 2.84084 14.5453 3.08618 14.5453 3.33337C14.5453 3.58057 14.4992 3.82591 14.4062 4.05466C14.3132 4.28341 14.1751 4.49129 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  <div className="lg:hidden grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Items</div>
                      <div className="text-[15px] font-bold text-[#0b5858]" style={{ fontFamily: 'Poppins' }}>{stats.totalItems}</div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Stock Units</div>
                      <div className="text-[15px] font-bold text-gray-700" style={{ fontFamily: 'Poppins' }}>{stats.totalStockUnits}</div>
                    </div>
                    <div className="bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Low Stock</div>
                      {stats.lowStockItems === 0 ? <NoneBadge /> : <div className="text-[15px] font-bold text-gray-700" style={{ fontFamily: 'Poppins' }}>{stats.lowStockItems}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </div>

      <div className="mt-3 text-[12px] text-gray-400" style={{ fontFamily: 'Poppins' }}>
        Showing <span className="font-semibold text-[#05807e]">{filtered.length}</span> of {warehouses.length} warehouses
        {search && <span> - &quot;<em>{search}</em>&quot;</span>}
      </div>

      {formOpen && (
        <WarehouseFormModal
          warehouse={editTarget}
          existingNames={warehouses.map((warehouse) => warehouse.name)}
          onClose={() => {
            setFormOpen(false);
            setEditTarget(null);
          }}
          onSave={handleSaveWarehouse}
        />
      )}

      {transferTarget && (
        <WarehouseTransferStockModal
          warehouses={warehouses}
          sourceWarehouse={transferTarget}
          onClose={() => setTransferTarget(null)}
          onTransfer={handleTransferStock}
        />
      )}

      {detailModalOpen && selectedWarehouse && (
        <WarehouseDetailModal
          warehouse={selectedWarehouse}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedWarehouseId(null);
          }}
          onTransfer={() => {
            setTransferTarget(selectedWarehouse);
            setDetailModalOpen(false);
          }}
        />
      )}
    </>
  );
}
