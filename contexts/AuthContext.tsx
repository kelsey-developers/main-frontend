'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import type { UserInfo } from '@/lib/api/auth';
import { logoutAction } from '@/lib/actions/auth';

export type NormalizedRole =
  | 'admin'
  | 'agent'
  | 'guest'
  | 'finance'
  | 'inventory'
  | 'housekeeping'
  | 'operations'
  | 'frontdesk'
  | 'cleaner'
  | 'employee'
  | 'user';

export interface AuthUserRole {
  role: NormalizedRole;
  fullname?: string;
}

export interface AuthUserProfile {
  fullname: string;
  profile_photo?: string | null;
}

interface AuthContextValue {
  user: UserInfo | null;
  userRole: AuthUserRole | null;
  userProfile: AuthUserProfile | null;
  roleLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  isGuest: boolean;
  isFinance: boolean;
  isInventory: boolean;
  isHousekeeping: boolean;
  isOperations: boolean;
  isFrontdesk: boolean;
  isEmployee: boolean;
  /** Returns true if the user has ANY of the given roles (admin always passes). */
  hasAnyRole: (...roles: NormalizedRole[]) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(role: string): NormalizedRole {
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'agent') return 'agent';
  if (lower === 'guest') return 'guest';
  if (lower === 'finance') return 'finance';
  if (lower === 'inventory') return 'inventory';
  if (lower === 'operations' || lower === 'operation') return 'operations';
  if (lower === 'frontdesk' || lower === 'front desk' || lower === 'front_desk') return 'frontdesk';
  if (lower === 'cleaner') return 'cleaner';
  if (lower === 'housekeeping') return 'housekeeping';
  if (lower === 'employee') return 'employee';
  return 'user';
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: UserInfo | null;
}) {
  const [user, setUser] = useState<UserInfo | null>(initialUser);
  const router = useRouter();

  // Re-sync whenever the server re-renders the layout with a new cookie value
  // (happens after loginAction redirect or router.refresh())
  useEffect(() => {
    setUser(initialUser);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?.id ?? null]);

  const signOut = useCallback(async () => {
    setUser(null); // instant UI update
    await logoutAction();

    // After logout, always redirect to landing page (/) for all user types
    // (admin, agent, housekeeping, finance, etc.) so RootPage shows the
    // logged-out landing view instead of the login screen.
    router.push('/');
  }, [router]);

  // Prefer non-user roles when user has multiple (e.g. User + Agent after approval)
  const rawRoles = user?.roles ?? [];
  const normalizedRoles = rawRoles.map((r) => normalizeRole(r));
  const primaryRole =
    normalizedRoles.find((r) => r !== 'user') ?? normalizedRoles[0] ?? null;
  const fullname = user
    ? [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    : '';

  const hasAnyRole = (...roles: NormalizedRole[]) => {
    if (primaryRole === 'admin') return true;
    return primaryRole !== null && roles.includes(primaryRole);
  };

  const value: AuthContextValue = {
    user,
    userRole: primaryRole ? { role: primaryRole, fullname } : null,
    userProfile: user ? { fullname, profile_photo: null } : null,
    roleLoading: false,
    isAdmin: primaryRole === 'admin',
    isAgent: primaryRole === 'agent',
    isGuest: primaryRole === 'guest',
    isFinance: primaryRole === 'finance',
    isInventory: primaryRole === 'inventory',
    isHousekeeping: primaryRole === 'housekeeping',
    isOperations: primaryRole === 'operations',
    isFrontdesk: primaryRole === 'frontdesk',
    isEmployee: primaryRole === 'employee',
    hasAnyRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      userRole: null,
      userProfile: null,
      roleLoading: false,
      isAdmin: false,
      isAgent: false,
      isGuest: false,
      isFinance: false,
      isInventory: false,
      isHousekeeping: false,
      isOperations: false,
      isFrontdesk: false,
      isEmployee: false,
      hasAnyRole: () => false,
      signOut: async () => {},
    };
  }
  return ctx;
}
