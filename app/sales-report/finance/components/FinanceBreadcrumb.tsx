'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SEGMENT_TITLES: Record<string, string> = {
  'revenue-overview': 'Revenue overview',
  'revenue-breakdown': 'Revenue breakdown',
  'bookings': 'Booking-linked data',
  'charges-addons': 'Charges & add-ons',
  'damage-penalty': 'Damage & penalty',
  'export': 'Export for accounting',
  'future': 'Coming soon',
};

const FinanceBreadcrumb: React.FC = () => {
  const pathname = usePathname();
  const segments = pathname?.replace(/^\/sales-report\/finance\/?/, '').split('/').filter(Boolean) ?? [];
  const current = segments[segments.length - 1];
  const title = current ? SEGMENT_TITLES[current] || current : null;

  return (
    <nav className="mb-4 flex items-center gap-2 text-sm" style={{ fontFamily: 'Poppins' }}>
      <Link href="/sales-report/finance" className="text-[#0B5858] hover:underline">
        Finance
      </Link>
      {title && (
        <>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{title}</span>
        </>
      )}
    </nav>
  );
};

export default FinanceBreadcrumb;
