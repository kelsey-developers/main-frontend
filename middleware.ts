import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that require a valid session — redirects to /login if not authenticated */
const PROTECTED_ROUTES = [
  '/admin',
  '/agent',
  '/booking',
  '/booking-details',
  '/reserve',
  '/rewards',
  '/profile',
  '/settings',
];

/** Routes only accessible when NOT logged in — redirects to / if already authenticated */
const AUTH_ONLY_ROUTES = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  const { pathname } = request.nextUrl;

  const isAuthOnly = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.otf).*)',
  ],
};
