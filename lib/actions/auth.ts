'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginApi, getUserInfoApi } from '@/lib/api/auth';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 86400,
};

export async function loginAction(email: string, password: string): Promise<void> {
  const { accessToken } = await loginApi(email, password);
  const user = await getUserInfoApi(accessToken);

  const jar = await cookies();
  jar.set('accessToken', accessToken, COOKIE_OPTS);
  jar.set('user', JSON.stringify(user), COOKIE_OPTS);

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete('accessToken');
  jar.delete('user');
}
