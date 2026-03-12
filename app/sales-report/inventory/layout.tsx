'use client';

import React from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { ToastProvider } from './context/ToastContext';
import { RouteGuard } from '@/components/RouteGuard';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['inventory', 'admin']}>
      <ToastProvider>
        <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${LAYOUT_NAVBAR_OFFSET}`}>
          <style>{`
            body[data-hide-navbar='true'] nav.fixed.top-0.left-0.right-0 {
              display: none !important;
            }
          `}</style>
          <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">
            {children}
          </div>
        </div>
      </ToastProvider>
    </RouteGuard>
  );
}
