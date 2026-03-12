'use client';

import React, { createContext, useContext, useMemo } from 'react';

/**
 * Mock user and role for frontend-only development.
 * Replace with real AuthContext/API when backend is connected.
 */
export interface MockUserRole {
  role: 'admin' | 'agent' | 'finance' | 'user' | 'cleaner';
  fullname?: string;
}

export interface MockUserProfile {
  fullname: string;
  profile_photo?: string | null;
}

export interface MockUser {
  email: string;
  id?: string;
}

interface MockAuthContextValue {
  user: MockUser | null;
  userRole: MockUserRole | null;
  userProfile: MockUserProfile | null;
  roleLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  signOut: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null);

/** Mock data for development - set role to 'admin' to access admin pages (e.g. Agent Registration) */
const MOCK_USER: MockUser = { email: 'admin@example.com', id: 'mock-1' };
const MOCK_ROLE: MockUserRole = { role: 'admin', fullname: 'Admin User' };
const MOCK_PROFILE: MockUserProfile = { fullname: 'Admin User', profile_photo: null };

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<MockAuthContextValue>(
    () => ({
      user: MOCK_USER,
      userRole: MOCK_ROLE,
      userProfile: MOCK_PROFILE,
      roleLoading: false,
      isAdmin: true,
      isAgent: false,
      signOut: async () => {},
    }),
    []
  );
  return (
    <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
  );
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext);
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
