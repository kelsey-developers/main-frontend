'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserInfo } from '@/lib/api/auth';
import { logoutAction } from '@/lib/actions/auth';

const PROTECTED_ROUTES = [
  '/admin',
  '/booking',
  '/rewards',
  '/profile',
  '/settings',
];

type NormalizedRole = 'admin' | 'agent' | 'user';

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(role: string): NormalizedRole {
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'agent') return 'agent';
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
  const pathname = usePathname();

  // Re-sync whenever the server re-renders the layout with a new cookie value
  // (happens after loginAction redirect or router.refresh())
  useEffect(() => {
    setUser(initialUser);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?.id ?? null]);

  const signOut = useCallback(async () => {
    setUser(null); // instant UI update — no reload needed
    await logoutAction();
    const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
    if (isProtected) {
      router.push('/login');
    } else {
      router.refresh(); // stay on page, just re-render server components
    }
  }, [router, pathname]);

  const primaryRole = user?.roles?.[0] ? normalizeRole(user.roles[0]) : null;
  const fullname = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : '';

  const value: AuthContextValue = {
    user,
    userRole: primaryRole ? { role: primaryRole, fullname } : null,
    userProfile: user ? { fullname, profile_photo: null } : null,
    roleLoading: false,
    isAdmin: primaryRole === 'admin',
    isAgent: primaryRole === 'agent',
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
      signOut: async () => {},
    };
  }
  return ctx;
}
