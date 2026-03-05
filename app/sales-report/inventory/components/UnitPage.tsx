'use client';

import React from 'react';
import Link from 'next/link';
import type { InventoryUnit } from '../types';
import SearchUnits from './SearchUnits';
import InventoryTable from './InventoryTable';
import { mockUnits, mockReplenishmentItems } from '../lib/mockData';

interface UnitPageProps {
  unit: InventoryUnit;
}

const UnitPage: React.FC<UnitPageProps> = ({ unit }) => {
  return (
    <div className="mx-auto">
      <Link
        href="/sales-report/inventory"
        className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline mb-6"
        style={{ fontFamily: 'Poppins' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Inventory
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
        <aside className="w-full lg:w-80 flex-shrink-0">
          <SearchUnits units={mockUnits} />
        </aside>
        <div className="flex-1 flex-col min-w-0 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden p-6 flex flex-row gap-6">
            <div className="w-1/2 h-60 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={unit.imageUrl || '/heroimage.png'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                  {unit.name}
                </h1>
                {unit.type && (
                  <span
                    className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-amber-100 text-amber-800"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {unit.type.charAt(0).toUpperCase() + unit.type.slice(1)}
                  </span>
                )}
              </div>
              {unit.location && (
                <p className="text-gray-600 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 21.75c2.5-2.5 6.75-7.02 6.75-11.25a6.75 6.75 0 10-13.5 0c0 4.23 4.25 8.75 6.75 11.25z"
                      />
                      <circle cx="12" cy="10.5" r="2.25" strokeWidth={2} />
                    </svg>
                  </span>
                  {unit.location}
                </p>
              )}
              {unit.itemCount != null && (
                <p className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Poppins' }}>
                  {unit.itemCount} items assigned
                </p>
              )}
            </div>
          </div>
          <div className="mb-4"></div>
          <InventoryTable items={mockReplenishmentItems} />
        </div>
        
      </div>
    </div>
  );
};

export default UnitPage;
