'use client';

import React from 'react';
import Link from 'next/link';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

const SECTIONS = [
  {
    href: '/sales-report/inventory',
    title: 'Inventory',
    description: 'Stock, items, warehouses, purchase orders, and movements.',
  },
  {
    href: '/sales-report/finance',
    title: 'Finance',
    description: 'Revenue, bookings, damage impact, and export.',
  },
  {
    href: '/sales-report/admin',
    title: 'Admin',
    description: 'Inventory admin, replenishment, approvals, and access.',
  },
  {
    href: '/sales-report/housekeeping',
    title: 'Housekeeping',
    description: 'Out-of-stock, stock-out, and reports.',
  },
];

export default function SalesReportPage() {
  return (
    <div
      className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET}`}
      style={{ fontFamily: 'Poppins' }}
    >
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Report</h1>
        <p className="text-gray-600 mb-8">
          Choose an area to open.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col p-5 rounded-xl border border-gray-200 bg-white hover:border-[#0B5858] hover:ring-2 hover:ring-[#0B5858]/20 transition-all group"
            >
              <span className="text-lg font-semibold text-gray-900 group-hover:text-[#0B5858]">
                {section.title}
              </span>
              <span className="text-sm text-gray-500 mt-1">{section.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
