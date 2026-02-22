'use client';

import React from 'react';
import Link from 'next/link';
import type { FinanceFeatureLink } from '../types';

const FEATURE_LINKS: FinanceFeatureLink[] = [
  { href: '/sales-report/finance/bookings', title: 'Booking-linked data', icon: 'bookings' },
  { href: '/sales-report/finance/charges-addons', title: 'Charges & add-ons', icon: 'charges' },
  { href: '/sales-report/finance/damage-penalty', title: 'Damage & penalty impact', icon: 'damage' },
  { href: '/sales-report/finance/export', title: 'Export for accounting', icon: 'export' },
  { href: '/sales-report/finance/future', title: 'Coming soon', icon: 'future' },
];

const IconSvg: React.FC<{ icon: FinanceFeatureLink['icon'] }> = ({ icon }) => {
  const className = 'w-5 h-5 text-[#0B5858] flex-shrink-0';
  switch (icon) {
    case 'chart':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'breakdown':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'bookings':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case 'charges':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'damage':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'export':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      );
    case 'future':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

const FinanceDashboardLinks: React.FC = () => {
  return (
    <>
      <h2
        className="text-xl font-bold text-gray-900 mb-4"
        style={{ fontFamily: 'Poppins' }}
      >
        Features
      </h2>
      <div className="space-y-4">
        {FEATURE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 hover:ring-2 hover:ring-[#0B5858]/20 hover:border-[#0B5858] transition-colors group"
            style={{ fontFamily: 'Poppins' }}
          >
            <IconSvg icon={link.icon} />
            <span className="flex-1 text-md font-medium group-hover:text-[#0B5858] transition-colors min-w-0 truncate">
              {link.title}
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0B5858] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </>
  );
};

export default FinanceDashboardLinks;
