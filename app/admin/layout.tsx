'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '../../lib/constants';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/agent-registration', label: 'Agent Registration' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${LAYOUT_NAVBAR_OFFSET}`} style={{ fontFamily: 'Poppins' }}>
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 py-3 border-b border-gray-200 mb-4">
          <span className="text-sm text-gray-500 mr-2">Admin</span>
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-[#0B5858] text-white'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
