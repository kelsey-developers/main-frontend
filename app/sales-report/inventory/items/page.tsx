'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AddModal from '../components/AddModal';
import type { AddModalChoice } from '../components/AddModal';
import InventoryTable from '../components/InventoryTable';
import { mockReplenishmentItems } from '../lib/mockData';

export default function InventoryItemsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
              Inventory
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Inventory items</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Inventory items
          </h1>
          <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            View and manage all inventory items
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-gray-200 bg-yellow-400 text-white text-md font-medium hover:bg-yellow-500 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none inline-flex items-center gap-2"
            style={{ fontFamily: 'Poppins' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Stock Out
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-green-400 text-white text-md font-medium hover:bg-green-500 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none inline-flex items-center gap-2"
            style={{ fontFamily: 'Poppins' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>

      <InventoryTable items={mockReplenishmentItems} />


      <AddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelect={(choice: AddModalChoice) => {
          setAddModalOpen(false);
          if (choice === 'item') {
            // TODO: open add-new-item flow
          }
          if (choice === 'stock') {
            // TODO: open add-new-stock flow
          }
        }}
      />
    </>
  );
}
