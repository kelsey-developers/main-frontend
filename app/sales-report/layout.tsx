'use client';

import React from 'react';
import { RouteGuard } from '@/components/RouteGuard';

export default function SalesReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['admin', 'finance', 'inventory', 'operations', 'housekeeping', 'cleaner', 'frontdesk']}>
      <div data-sales-report-root="true">{children}</div>
    </RouteGuard>
  );
}
