import React from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import Link from 'next/link';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${LAYOUT_NAVBAR_OFFSET}`}>
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">

        {children}
      </div>
    </div>
  );
}
