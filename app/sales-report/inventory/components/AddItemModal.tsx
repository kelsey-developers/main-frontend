'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api/client';
import type { ItemType, ItemCategory } from '../types';
import { ITEM_CATEGORIES, loadInventoryDataset } from '../lib/mockData';
import InventoryDropdown, { type InventoryDropdownOption } from './InventoryDropdown';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

const ITEM_TYPE_OPTIONS: InventoryDropdownOption<ItemType | ''>[] = [
  { value: '', label: 'Select type' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'reusable', label: 'Reusable' },
];

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [type, setType] = useState<ItemType | ''>('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [reorderLevel, setReorderLevel] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !category) return;
    void (async () => {
      setIsSaving(true);
      try {
        const reorder = Math.max(0, Math.floor(Number(reorderLevel || 0)));
        const skuValue = sku.trim() || `SKU-${Date.now()}`;

        // Ensure category exists (backend will validate categoryId if required by implementation).
        const { categories } = await apiClient.get<{ categories: Array<{ id: string; name: string; code: string }> }>(
          '/api/product-categories'
        );
        const normalized = category.toLowerCase();
        const existing = categories.find((c) => c.name.toLowerCase() === normalized);
        const categoryId =
          existing?.id ??
          (await apiClient.post<{ id: string }>('/api/product-categories', {
            code: category.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
            name: category,
            description: `Auto-created for category ${category}`,
          })).id;

        await apiClient.post('/api/products', {
          sku: skuValue,
          name: name.trim(),
          unit,
          itemType: type === 'consumable' ? 'consumable' : 'non_consumable',
          reorderLevel: reorder,
          categoryId,
        });

        await loadInventoryDataset(true);
        setName('');
        setSku('');
        setUnit('pcs');
        setType('');
        setCategory('');
        setReorderLevel('');
        onClose();
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleReorderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      setReorderLevel(v);
      return;
    }
    if (/^\d+$/.test(v)) setReorderLevel(v);
  };

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.38)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="add-modal-title" className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Add Item
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ fontFamily: 'Poppins' }}>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-900">
            Stock will <strong>not</strong> be added here. Use <strong>Purchase Order → Goods Receipt</strong> to increase inventory.
          </div>
          <div>
            <label htmlFor="add-item-name" className={labelClass}>
              Item name
            </label>
            <input
              id="add-item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-item-sku" className={labelClass}>
              SKU (optional)
            </label>
            <input
              id="add-item-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. TWL-001 (auto-generated if blank)"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-item-type" className={labelClass}>
              Type
            </label>
            <InventoryDropdown
              value={type}
              onChange={(value) => setType(value as ItemType | '')}
              options={ITEM_TYPE_OPTIONS}
              placeholder="Select type"
              placeholderWhen=""
              fullWidth={true}
              minWidthClass="min-w-0"
            />
          </div>
          <div>
            <label htmlFor="add-item-category" className={labelClass}>
              Category
            </label>
            <InventoryDropdown
              value={category}
              onChange={(value) => setCategory(value as ItemCategory | '')}
              options={[
                { value: '', label: 'Select category' },
                ...ITEM_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
              ]}
              placeholder="Select category"
              placeholderWhen=""
              fullWidth={true}
              minWidthClass="min-w-0"
            />
          </div>
          <div>
            <label htmlFor="add-item-unit" className={labelClass}>
              Unit of measure
            </label>
            <input
              id="add-item-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="pcs"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-item-reorder" className={labelClass}>
              Reorder level (min stock)
            </label>
            <input
              id="add-item-reorder"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={reorderLevel}
              onChange={handleReorderChange}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-[#0B5858] text-white font-medium focus:ring-2 focus:ring-[#0B5858]/20 outline-none hover:bg-[#0a4a4a] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Create item'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddItemModal;
