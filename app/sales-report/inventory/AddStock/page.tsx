'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import InventoryTable from '../components/InventoryTable';
import { mockReplenishmentItems } from '../lib/mockData';
import type { ItemCategory } from '../types';
import AddItemModal from '../components/AddItemModal';

const ALL_CATEGORIES: ItemCategory[] = [
  'Cleaning', 'Hygiene', 'Food & Drinks', 'Cooking', 'Appliances',
  'furniture', 'Cloth & Sheets', 'Kitchenware', 'Other',
];

export default function AddStockPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);


  const itemsByCategory = useMemo(() => {
    if (!selectedCategory) return mockReplenishmentItems;
    return mockReplenishmentItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <nav
          className="flex items-center gap-2 text-sm text-gray-600 mb-2"
          style={{ fontFamily: 'Poppins' }}
        >
          <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
            Inventory
          </Link>
          <span>/</span>
          <Link href="/sales-report/inventory/items" className="text-[#0B5858] hover:underline">
            Items
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Add Stock</span>
        </nav>
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          Add Stock
        </h1>
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
          Select items and add stock to inventory
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <label htmlFor="item-select" className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins' }}>
              Item
            </label>
            <select
              id="item-select"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none bg-white"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="">Select item</option>
              {itemsByCategory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins' }}>
              Category
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedItemId('');
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none bg-white"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="">Select category</option>
              {ALL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1/10 min-w-0">
            <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-1.5" style={{ fontFamily: 'Poppins' }}>
              Quantity
            </label>
            <input
              id="quantity-input"
              type="number"
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none bg-white"
              style={{ fontFamily: 'Poppins' }}
            />
          </div>
          <div className="flex-1/5 min-w-0 flex flex-row items-end gap-2">
            <button type="button" className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-[#0B5858] text-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none hover:bg-[#0a4a4a]" style={{ fontFamily: 'Poppins' }}>Add</button>
            <button type="button" className="w-full px-4 py-2 rounded-lg border border-gray-200 text-gray-700 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none bg-white hover:bg-gray-50" style={{ fontFamily: 'Poppins' }}>Cancel</button>
          </div>
        </div>
      </div>
      <div className="flex justify-end px-0">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-gray-200 bg-[#0B5858] text-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] outline-none hover:bg-[#0a4a4a]"
          style={{ fontFamily: 'Poppins' }}
          onClick={() => setAddModalOpen(true)}
        >
          Add Item
        </button>
      </div>
      <div>
        <InventoryTable items={mockReplenishmentItems} />
      </div>

      <AddItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(data) => {
          // TODO: persist new item; data has name, type, category, quantity
          console.log('Add item:', data);
        }}
      />
    </div>
  );
}
