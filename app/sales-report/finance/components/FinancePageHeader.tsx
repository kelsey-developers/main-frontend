'use client';

import React from 'react';
import Link from 'next/link';

interface FinancePageHeaderProps {
  title: string;
  description?: string;
}

const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6">
      <Link
        href="/sales-report/finance"
        className="inline-flex items-center gap-1 text-sm text-[#0B5858] hover:underline mb-3"
        style={{ fontFamily: 'Poppins' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Finance dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{title}</h1>
      {description && (
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>{description}</p>
      )}
    </div>
  );
};

export default FinancePageHeader;
