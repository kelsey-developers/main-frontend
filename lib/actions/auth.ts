'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginApi, getUserInfoApi } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';

function isRedirectError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const digest = (err as Record<string, unknown>).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400,
};

function getRedirectForRole(user: { roles?: string[] }): string {
  const roles = (user.roles ?? []).map((r) => r.toLowerCase());
  if (roles.includes('inventory')) return '/sales-report/inventory';
  if (roles.includes('finance')) return '/sales-report/finance';
  if (roles.includes('operations') || roles.includes('housekeeping') || roles.includes('cleaner')) return '/sales-report/housekeeping';
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('agent')) return '/agent';
  return '/';
}

/** Merge internal roles from market-backend into user.roles so AuthContext gets correct role. */
async function mergeInternalRoles(
  user: { email: string; roles?: string[] }
): Promise<{ email: string; roles: string[] }> {
  const authRoles = user.roles ?? [];
  try {
    const map = await apiClient.get<Record<string, string>>('/api/user-roles');
    const internalRole = map?.[user.email];
    if (internalRole) {
      // Map backend "operations" to "Housekeeping" for display (manage-users uses Housekeeping)
      const displayRole =
        internalRole === 'operations'
          ? 'Housekeeping'
          : internalRole.charAt(0).toUpperCase() + internalRole.slice(1);
      return { ...user, roles: [displayRole, ...authRoles.filter((r) => r.toLowerCase() !== internalRole)] };
    }
  } catch {
    // Non-fatal: market-backend may be down; use Auth Service roles only
  }
  return { ...user, roles: authRoles };
}

export async function loginAction(
  email: string,
  password: string,
  redirectTo?: string
): Promise<{ error?: string }> {
  try {
    const { accessToken } = await loginApi(email, password);
    const user = await getUserInfoApi(accessToken);
    const userWithRoles = await mergeInternalRoles(user);

    const jar = await cookies();
    jar.set('accessToken', accessToken, COOKIE_OPTS);
    jar.set('user', JSON.stringify(userWithRoles), COOKIE_OPTS);

    redirect(redirectTo ?? getRedirectForRole(userWithRoles));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const message =
      err instanceof Error ? err.message : 'Unable to connect to the server.';
    return { error: message };
  }
  return {};
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete('accessToken');
  jar.delete('user');
}
