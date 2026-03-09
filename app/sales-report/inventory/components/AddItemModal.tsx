'use client';

import React, { useState } from 'react';
import type { ItemType, ItemCategory } from '../types';
import { ITEM_CATEGORIES } from '../lib/mockData';
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
  onAdd?: (data: { name: string; type: ItemType; category: ItemCategory; quantity: number }) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ItemType | ''>('');
  const [category, setCategory] = useState<ItemCategory | ''>('');
  const [quantity, setQuantity] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !category) return;
    const num = parseInt(quantity, 10);
    if (quantity === '' || isNaN(num) || num < 0) return;
    onAdd?.({ name: name.trim(), type, category, quantity: num });
    setName('');
    setType('');
    setCategory('');
    setQuantity('');
    onClose();
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === '') {
      setQuantity(v);
      return;
    }
    if (/^\d+$/.test(v)) setQuantity(v);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
      style={{
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
            <label htmlFor="add-item-quantity" className={labelClass}>
              Quantity
            </label>
            <input
              id="add-item-quantity"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={handleQuantityChange}
              onBlur={() => {
                if (quantity === '') return;
                const num = parseInt(quantity, 10);
                if (isNaN(num) || num < 0) setQuantity('0');
              }}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-gray-200 bg-[#0B5858] text-white font-medium focus:ring-2 focus:ring-[#0B5858]/20 outline-none hover:bg-[#0a4a4a]"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
