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
    const roles = (user.roles ?? []).map((r) => r.toLowerCase());
    if (roles.includes('inventory') && !roles.some((r) => ['admin', 'agent', 'finance', 'housekeeping', 'operations'].includes(r))) {
      redirect('/sales-report/inventory');
    }
    if (roles.includes('finance') && !roles.some((r) => ['admin', 'agent', 'inventory', 'housekeeping', 'operations'].includes(r))) {
      redirect('/sales-report/finance');
    }
    if ((roles.includes('housekeeping') || roles.includes('operations')) && !roles.some((r) => ['admin', 'agent', 'inventory', 'finance'].includes(r))) {
      redirect('/sales-report/housekeeping');
    }
    redirect('/home');
  }

  return <Landingpage />;
}
