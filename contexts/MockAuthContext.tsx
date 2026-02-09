'use client';

import React, { createContext, useContext, useMemo } from 'react';

/**
 * Mock user and role for frontend-only development.
 * Replace with real AuthContext/API when backend is connected.
 */
export interface MockUserRole {
  role: 'admin' | 'agent' | 'user';
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

/** Mock data for development - agent with points context for rewards page */
const MOCK_USER: MockUser = { email: 'agent@example.com', id: 'mock-1' };
const MOCK_ROLE: MockUserRole = { role: 'agent', fullname: 'Jane Agent' };
const MOCK_PROFILE: MockUserProfile = { fullname: 'Jane Agent', profile_photo: null };

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<MockAuthContextValue>(
    () => ({
      user: MOCK_USER,
      userRole: MOCK_ROLE,
      userProfile: MOCK_PROFILE,
      roleLoading: false,
      isAdmin: false,
      isAgent: true,
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
