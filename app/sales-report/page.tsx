'use client';

import React from 'react';
import Link from 'next/link';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { useAuth, type NormalizedRole } from '@/contexts/AuthContext';

type Section = {
  href: string;
  title: string;
  description: string;
  icon: string;
  roles: NormalizedRole[]; // roles that can see this tile (admin always sees all)
};

const SECTIONS: Section[] = [
  {
    href: '/sales-report/inventory',
    title: 'Inventory',
    description: 'Stock, items, warehouses, purchase orders, and movements.',
    icon: '📦',
    roles: ['inventory'],
  },
  {
    href: '/sales-report/finance',
    title: 'Finance',
    description: 'Revenue, bookings, damage impact, and export.',
    icon: '💰',
    roles: ['finance'],
  },
  {
    href: '/sales-report/admin',
    title: 'Admin',
    description: 'Inventory admin, replenishment, approvals, and access.',
    icon: '⚙️',
    roles: ['admin'],
  },
  {
    href: '/sales-report/housekeeping',
    title: 'Housekeeping',
    description: 'Out-of-stock, stock-out, and reports.',
    icon: '🧹',
    roles: ['operations', 'cleaner'],
  },
];

const ROLE_LABELS: Record<NormalizedRole, string> = {
  admin: 'Admin',
  agent: 'Agent',
  guest: 'Guest',
  finance: 'Finance',
  inventory: 'Inventory',
  housekeeping: 'Housekeeping',
  operations: 'Operations',
  frontdesk: 'Front Desk',
  cleaner: 'Housekeeping',
  user: 'User',
};

export default function SalesReportPage() {
  const { hasAnyRole, userRole, isAdmin } = useAuth();

  const visibleSections = SECTIONS.filter((s) =>
    isAdmin || hasAnyRole(...s.roles)
  );

  return (
    <div
      className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET}`}
      style={{ fontFamily: 'Poppins' }}
    >
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sales Report</h1>
          <p className="text-gray-500 text-sm">
            Logged in as{' '}
            <span className="font-semibold text-[#0B5858]">
              {userRole ? ROLE_LABELS[userRole.role] : 'Unknown'}
            </span>
            {userRole?.fullname ? ` · ${userRole.fullname}` : ''}
          </p>
        </div>

        {visibleSections.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No sections are available for your role. Contact an administrator.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:border-[#0B5858] hover:ring-2 hover:ring-[#0B5858]/20 transition-all group"
              >
                <span className="w-10 h-10 rounded-lg bg-[#e8f4f4] flex items-center justify-center text-xl flex-shrink-0">
                  {section.icon}
                </span>
                <div>
                  <span className="text-base font-semibold text-gray-900 group-hover:text-[#0B5858]">
                    {section.title}
                  </span>
                  <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
