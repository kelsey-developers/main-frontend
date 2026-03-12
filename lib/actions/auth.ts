'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginApi, getUserInfoApi } from '@/lib/api/auth';

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

export async function loginAction(
  email: string,
  password: string,
  redirectTo?: string
): Promise<{ error?: string }> {
  try {
    const { accessToken } = await loginApi(email, password);
    const user = await getUserInfoApi(accessToken);

    const jar = await cookies();
    jar.set('accessToken', accessToken, COOKIE_OPTS);
    jar.set('user', JSON.stringify(user), COOKIE_OPTS);

    redirect(redirectTo ?? '/');
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
