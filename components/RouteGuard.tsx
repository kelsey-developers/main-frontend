'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, type NormalizedRole } from '@/contexts/AuthContext';

interface RouteGuardProps {
  /** Roles that may access this route. Admin always passes. */
  allowedRoles: NormalizedRole[];
  children: React.ReactNode;
}

/** Full-page loading spinner shown while auth state is resolving. */
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#0B5858]/20 border-t-[#0B5858] animate-spin" />
        <p className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>Checking access…</p>
      </div>
    </div>
  );
}

/** Shown when the user is logged in but doesn't have the required role. */
function UnauthorizedScreen({ allowedRoles }: { allowedRoles: NormalizedRole[] }) {
  const router = useRouter();
  const roleLabels: Record<NormalizedRole, string> = {
    admin: 'Admin',
    agent: 'Agent',
    finance: 'Finance',
    inventory: 'Inventory',
    housekeeping: 'Housekeeping',
    operations: 'Operations',
    frontdesk: 'Front Desk',
    cleaner: 'Housekeeping',
    user: 'User',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" style={{ fontFamily: 'Poppins' }}>
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500 mb-2">
          You don&apos;t have permission to view this page.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Required role{allowedRoles.length > 1 ? 's' : ''}:{' '}
          <span className="font-semibold text-gray-600">
            {allowedRoles.map((r) => roleLabels[r]).join(', ')}
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a]"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrap a layout or page with this to enforce role-based access.
 *
 * - Not logged in → redirect to /login
 * - Logged in, wrong role → show 403 screen
 * - Logged in, correct role → render children
 */
export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, hasAnyRole, roleLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoggedIn = user !== null;
  const isAuthorized = isLoggedIn && hasAnyRole(...allowedRoles);

  useEffect(() => {
    if (!roleLoading && !isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [roleLoading, isLoggedIn, router, pathname]);

  // Still resolving auth state
  if (roleLoading) return <AuthLoadingScreen />;

  // Not logged in — show loading while redirect fires
  if (!isLoggedIn) return <AuthLoadingScreen />;

  // Logged in but wrong role
  if (!isAuthorized) return <UnauthorizedScreen allowedRoles={allowedRoles} />;

  return <>{children}</>;
}
