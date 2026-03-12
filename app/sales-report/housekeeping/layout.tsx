'use client';

import React from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { RouteGuard } from '@/components/RouteGuard';

export default function HousekeepingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['operations', 'housekeeping', 'cleaner', 'admin']}>
      <div className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET}`}>
        <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
