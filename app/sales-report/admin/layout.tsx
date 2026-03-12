'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { RouteGuard } from '@/components/RouteGuard';

type AdminLink = {
  href: string;
  label: string;
};

const ADMIN_LINKS: AdminLink[] = [
  { href: '/sales-report/admin', label: 'Overview' },
  { href: '/sales-report/admin/inventory-setup', label: 'Inventory Setup' },
  { href: '/sales-report/admin/replenishment', label: 'Replenishment' },
  { href: '/sales-report/admin/charges-addons', label: 'Charges & Add-ons' },
  { href: '/sales-report/admin/approval-queue', label: 'Approval Queue' },
  { href: '/sales-report/admin/audit-alerts', label: 'Audit and Alerts' },
  { href: '/sales-report/admin/access', label: 'Access Control' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RouteGuard allowedRoles={['admin']}>
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${LAYOUT_NAVBAR_OFFSET}`} style={{ fontFamily: 'Poppins' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/sales-report" className="text-[#0B5858] hover:underline">
              Sales Report
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Admin</span>
          </nav>
          <div className="border-b border-gray-200">
            <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-thin" style={{ fontFamily: 'Poppins' }}>
              {ADMIN_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'border-[#0B5858] text-[#0B5858]'
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
    </RouteGuard>
  );
}
