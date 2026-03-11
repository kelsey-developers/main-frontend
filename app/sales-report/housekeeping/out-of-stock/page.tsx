'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import InventoryDropdown from '@/app/sales-report/inventory/components/InventoryDropdown';
import {
  inventoryItems,
  inventoryWarehouseDirectory,
  loadInventoryDataset,
} from '@/app/sales-report/inventory/lib/inventoryDataStore';

/** One line: product (from inventory) */
type OutOfStockLine = { id: string; productId: string };

function createEmptyLine(): OutOfStockLine {
  return { id: crypto.randomUUID(), productId: '' };
}

export default function HousekeepingOutOfStockPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [refreshTick, setRefreshTick] = useState(0);

  const itemSelectOptions = useMemo(
    () => [
      { value: '', label: 'Select item…' },
      ...inventoryItems.map((p) => ({
        value: p.id,
        label: `${p.sku} — ${p.name} (${p.currentStock} ${p.unit} available)`,
      })),
    ],
    [refreshTick]
  );

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'Select warehouse…' },
      ...inventoryWarehouseDirectory
        .filter((wh) => wh.isActive)
        .map((w) => ({ value: w.id, label: w.name })),
    ],
    [refreshTick]
  );

  useEffect(() => {
    void loadInventoryDataset();
    const onUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener('inventory:movement-updated', onUpdate);
    return () => window.removeEventListener('inventory:movement-updated', onUpdate);
  }, []);

  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(todayStr);
  const [lines, setLines] = useState<OutOfStockLine[]>(() => [createEmptyLine()]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateLine = (id: string, field: keyof OutOfStockLine, value: string) => {
    setLines((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addLine = () => setLines((prev) => [...prev, createEmptyLine()]);
  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((row) => row.id !== id));
  };

  const hasValidEntry = lines.some((r) => r.productId.trim() !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidEntry) return;
    setSubmitted(true);
    setWarehouseId('');
    setDate(todayStr);
    setLines([createEmptyLine()]);
    setNotes('');
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <div className="mb-2">
        <Link
          href="/sales-report/housekeeping"
          className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Housekeeping
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Out of stock</h1>
      <p className="text-gray-600 mb-6">
        Note items that are missing or out of stock in a warehouse but are not yet reflected in inventory. This report helps reconcile discrepancies.
      </p>

      {submitted && (
        <div className="mb-6 p-4 rounded-xl bg-[#0B5858]/10 border border-[#0B5858]/20 text-[#0B5858]">
          <p className="font-medium">Report submitted.</p>
          <p className="text-sm mt-1">Thank you. The out-of-stock report has been recorded for follow-up.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-4xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Warehouse <span className="text-red-500">*</span>
            </label>
            <InventoryDropdown
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouseOptions}
              placeholder="Select warehouse…"
              placeholderWhen=""
              hideIcon
              fullWidth
              minWidthClass="min-w-0"
              align="left"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-[13px] text-gray-900 outline-none transition-all focus:border-[#0B5858] focus:ring-2 focus:ring-[#cce8e8]"
              style={{ fontFamily: 'Poppins' }}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">
            Items out of stock <span className="text-red-500">*</span>
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            List items you noticed are missing or out of stock that are not reflected in inventory.
          </p>
          <div className="space-y-3">
            {lines.map((line) => {
              const product = inventoryItems.find((p) => p.id === line.productId);
              return (
                <div
                  key={line.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_40px] gap-3 items-start p-3 rounded-lg border border-gray-200 bg-gray-50/50"
                >
                  <div>
                    <InventoryDropdown
                      value={line.productId}
                      onChange={(v) => updateLine(line.id, 'productId', v)}
                      options={itemSelectOptions}
                      placeholder="Select item…"
                      placeholderWhen=""
                      fullWidth
                      align="left"
                    />
                    {product && (
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {product.currentStock} {product.unit}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 1}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remove row"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-2 flex items-center gap-2 text-sm font-medium text-[#0B5858] hover:text-[#0a4a4a]"
          >
            <span className="w-6 h-6 rounded-full border-2 border-[#0B5858] flex items-center justify-center">+</span>
            Add another item
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Where you noticed (e.g. bathroom, kitchen), or any context for the report…"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!hasValidEntry}
            className="px-5 py-2.5 rounded-lg font-medium text-white bg-[#0B5858] hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit report
          </button>
          <Link
            href="/sales-report/housekeeping"
            className="px-5 py-2.5 rounded-lg font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

    </div>
  );
}
