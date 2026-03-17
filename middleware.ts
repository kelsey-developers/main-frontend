import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that require a valid session — redirects to /login if not authenticated */
const PROTECTED_ROUTES = [
  '/admin',
  '/booking',
  '/booking-details',
  '/reserve',
  '/rewards',
  '/profile',
  '/settings',
  '/chat',
  '/dtr',
  '/payroll',
  '/attendance',
];

/** Routes only accessible when NOT logged in — redirects to / if already authenticated */
const AUTH_ONLY_ROUTES = ['/login', '/signup'];

/** Routes that require admin role (employee is blocked) */
const ADMIN_ONLY_ROUTES = ['/admin', '/dtr', '/payroll'];

function getRoleFromCookie(request: NextRequest): string | null {
  const userCookie = request.cookies.get('user')?.value;
  if (!userCookie) return null;
  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    const roles: string[] = user?.roles ?? [];
    // Return first non-"User" role (normalized to lowercase)
    const primary = roles.find(r => r.toLowerCase() !== 'user');
    return (primary ?? roles[0] ?? null)?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  const { pathname } = request.nextUrl;

  // Skip the public scan pages — no auth needed
  if (pathname.startsWith('/scan')) {
    return NextResponse.next();
  }

  const isAuthOnly  = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminOnly = ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));

  // Already logged in — don't let them visit login/signup
  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Not logged in — block protected routes
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in — check role for admin-only routes
  if (isAdminOnly && token) {
    const role = getRoleFromCookie(request);
    if (role === 'employee') {
      // Employees are not allowed in admin/dtr/payroll — send to attendance
      return NextResponse.redirect(new URL('/attendance', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.otf).*)',
  ],
};
