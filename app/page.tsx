import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserInfo } from '@/lib/api/auth';
import LandingWithLoader from '@/app/landingpage/LandingWithLoader';
import Landingpage from '@/app/landingpage/page';

/**
 * Root route (/):
 * - Logged in: redirect to /home (calendar visible in nav, home = /home).
 * - Logged out: show loading screen then landing page (calendar hidden, home = /).
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;
  const user: UserInfo | null = userCookie
    ? (JSON.parse(userCookie) as UserInfo)
    : null;

  if (user) {
    redirect('/home');
  }

  return <Landingpage />;
}
