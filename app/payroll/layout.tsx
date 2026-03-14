'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminLayout from '@/app/admin/layout';

const PAYROLL_NAV = [
  { href: '/payroll',           label: 'Payroll Periods', exact: true },
  { href: '/payroll/employees', label: 'Employees' },
  { href: '/payroll/charges',   label: 'Charges' },
];

function PayrollSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 overflow-x-auto shrink-0">
      {PAYROLL_NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-white text-[#0B5858] shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <PayrollSubNav />
      {children}
    </AdminLayout>
  );
}
