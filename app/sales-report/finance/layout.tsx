import React from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-gray-50  ${LAYOUT_NAVBAR_OFFSET}`}>
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">
      {children}
      </div>
    </div>
  );
}
