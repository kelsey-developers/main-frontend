'use client';

import React from 'react';
import InventoryDropdown from '@/app/sales-report/inventory/components/InventoryDropdown';

/** One row: item name + either loss or broken (mutually exclusive) */
export type ItemRow = { item: string; type: 'loss' | 'broken' | null };

const emptyRow: ItemRow = { item: '', type: null };

// Fallback list for report items when no itemOptions are provided
const REPORT_ITEMS: string[] = [];

interface LostBrokenItemsTableProps {
  rows: ItemRow[];
  onRowsChange: (rows: ItemRow[]) => void;
  itemOptions: { value: string; label: string }[];
  disabled?: boolean;
}

export function LostBrokenItemsTable({
  rows,
  onRowsChange,
  itemOptions,
  disabled = false,
}: LostBrokenItemsTableProps) {
  const addRow = () => onRowsChange([...rows, { ...emptyRow }]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ItemRow, value: ItemRow['item'] | ItemRow['type']) => {
    onRowsChange(
      rows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const setRowType = (index: number, type: 'loss' | 'broken' | null) => {
    updateRow(index, 'type', type);
  };

  const options =
    itemOptions && itemOptions.length > 0
      ? itemOptions
      : [{ value: '', label: 'Select item' }, ...REPORT_ITEMS.map((name) => ({ value: name, label: name }))];

  return (
    <div
      className={`border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-sm border border-gray-100 ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <div className="max-h-40 overflow-y-auto overflow-x-auto flex-1 min-h-40">
        <table className="min-w-full divide-y divide-gray-200 min-w-[420px]">
          <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] rounded-t-xl sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white uppercase">
                Item
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider w-24">
                Loss
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white uppercase tracking-wider w-24">
                Broken
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-white uppercase w-12" aria-label="Remove row">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50/50">
                <td className="px-3 py-2">
                  <InventoryDropdown
                    value={row.item}
                    onChange={(value) => updateRow(index, 'item', value)}
                    options={options}
                    placeholder="Select item"
                    placeholderWhen=""
                    fullWidth
                    align="left"
                    minWidthClass="min-w-0"
                    hideIcon
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name={`item-type-${index}`}
                    checked={row.type === 'loss'}
                    onChange={() => setRowType(index, row.type === 'loss' ? null : 'loss')}
                    className="w-4 h-4 border-gray-300 text-[#0B5858] focus:ring-[#0B5858]"
                    aria-label="Loss"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name={`item-type-${index}`}
                    checked={row.type === 'broken'}
                    onChange={() => setRowType(index, row.type === 'broken' ? null : 'broken')}
                    className="w-4 h-4 border-gray-300 text-[#0B5858] focus:ring-[#0B5858]"
                    aria-label="Broken"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                    aria-label="Remove row"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 bg-gray-50/50 px-3 py-2 flex-shrink-0">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-2 text-sm font-medium text-[#0B5858] hover:text-[#0a4a4a] transition-colors"
        >
          <span className="w-6 h-6 rounded-full border-2 border-[#0B5858] flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          Add item
        </button>
      </div>
    </div>
  );
}
