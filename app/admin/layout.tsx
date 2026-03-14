'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { ROLE_COLORS } from '@/lib/constants';

const ADMIN_NAV = [
  {
    href: '/admin',
    label: 'Overview',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5z" />
      </svg>
    ),
  },
  {
    href: '/admin/agents',
    label: 'Agents',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/booking-requests',
    label: 'Bookings',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/commissions',
    label: 'Commissions',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/payouts',
    label: 'Payouts',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/cleaning',
    label: 'Cleaning',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    href: '/admin/lending',
    label: 'Lending',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/dtr',
    label: 'DTR',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/payroll',
    label: 'Payroll',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  // ── Sales Report at the bottom ─────────────────────────────────────────────
  {
    href: '/sales-report',
    label: 'Sales Report',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

/** Active state: exact match for /admin, otherwise path starts with href.
 *  Special case: /payroll must not activate when on /payroll/dtr (DTR has its own nav item). */
function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/payroll') return pathname === '/payroll' || (pathname.startsWith('/payroll/') && !pathname.startsWith('/payroll/dtr'));
  return pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const adminRole = ROLE_COLORS.admin ?? { bg: '#B84C4C', text: 'white' };

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 font-poppins`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Mobile top bar: fixed height to prevent jump when dropdown toggles */}
        <div className="lg:hidden flex items-center justify-between h-16 min-h-[4rem] py-0 px-0 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center"
              style={{ backgroundColor: adminRole.bg }}
            >
              <span className="text-sm font-bold text-white tracking-wider">AD</span>
            </div>
            <span className="text-base font-semibold text-gray-900 tracking-tight">Admin Hub</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2.5 text-gray-500 hover:text-[#0B5858] hover:bg-white rounded-xl transition-all cursor-pointer shadow-sm border border-transparent hover:border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav dropdown: absolute so it doesn't affect layout flow / cause reflow */}
        <div className="lg:hidden relative">
          {mobileSidebarOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden animate-fade-in-up">
            <nav className="p-3 space-y-1">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(pathname, item.href)
                      ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          )}
        </div>

        {/* Grid layout: fixed sidebar column + 1fr main to prevent track-width shifts on route change */}
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-8 py-8">
          {/* Desktop Sidebar: sticky with will-change for hardware acceleration */}
          <aside className="hidden lg:block min-h-0" aria-label="Admin navigation">
            <div
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-28 w-full will-change-transform"
            >
              {/* Admin profile block */}
              <div className="p-6 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white shrink-0">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full shadow-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: adminRole.bg, boxShadow: `${adminRole.bg}33 0 4px 14px` }}
                  >
                    <span className="text-base font-bold text-white tracking-wider">AD</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate tracking-tight">Admin</p>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: adminRole.bg === '#B84C4C' ? 'rgba(184, 76, 76, 0.2)' : `${adminRole.bg}20`,
                        color: adminRole.bg,
                      }}
                    >
                      ADMIN
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation: scroll={false} prevents window scroll-to-top on click (removes main jump source) */}
              <nav className="p-4 space-y-1 relative">
                <p className="px-4 pt-2 pb-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Navigation
                </p>
                {ADMIN_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    scroll={false}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors duration-150 ${
                      isActive(pathname, item.href)
                        ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content: min-height prevents collapse during route transitions */}
          <main className="min-w-0 min-h-[calc(100vh-8rem)]" style={{ contain: 'layout' }}>
            <div className="min-h-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}