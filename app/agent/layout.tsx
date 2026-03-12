'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  {
    href: '/agent',
    label: 'Overview',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5z" />
      </svg>
    ),
  },
  {
    href: '/agent/commissions',
    label: 'Commissions',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    href: '/agent/payouts',
    label: 'Payouts',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/agent/network',
    label: 'My Network',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/rewards',
    label: 'Rewards',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
];

function getInitials(fullname?: string | null, email?: string | null): string {
  if (fullname && fullname.trim()) {
    const names = fullname.trim().split(/\s+/);
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return names[0][0].toUpperCase();
  }
  return email?.charAt(0).toUpperCase() || 'A';
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const { userProfile, user, userRole, roleLoading, isAgent } = useAuth();

  const RESERVED_AGENT_SEGMENTS = ['profile', 'commissions', 'payouts', 'network'];
  const pathSegments = pathname.split('/').filter(Boolean);
  const secondSegment = pathSegments[1];
  const isPublicProfileView = secondSegment && !RESERVED_AGENT_SEGMENTS.includes(secondSegment);

  useEffect(() => {
    if (roleLoading) return;
    if (isPublicProfileView) return;
    if (!user) return;
    if (!isAgent) {
      router.replace('/home');
    }
  }, [user, isAgent, roleLoading, router, isPublicProfileView]);

  const displayName = userProfile?.fullname || user?.email?.split('@')[0] || 'Agent';
  const initials = getInitials(userProfile?.fullname, user?.email);
  const showProfilePhoto = userProfile?.profile_photo && !profileImageError;

  const isActive = (href: string) =>
    href === '/agent' ? pathname === '/agent' : pathname.startsWith(href);

  const canAccess = isPublicProfileView || (user && (roleLoading || isAgent));
  if (!canAccess) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen flex items-center justify-center bg-gray-50`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B5858]" />
      </div>
    );
  }

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 font-poppins`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!isPublicProfileView && (
          <>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B5858] shadow-sm flex items-center justify-center overflow-hidden">
              {showProfilePhoto ? (
                <img
                  src={userProfile!.profile_photo!}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <span className="text-sm font-bold text-white tracking-wider">{initials}</span>
              )}
            </div>
            <span className="text-base font-semibold text-gray-900 tracking-tight">
              {roleLoading ? 'Agent Hub' : displayName}
            </span>
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

        {/* Mobile nav dropdown */}
        {mobileSidebarOpen && (
          <div className="lg:hidden bg-white border border-gray-100 rounded-2xl mt-4 shadow-lg overflow-hidden animate-fade-in-up">
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100">
                <Link
                  href="/agent/profile"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  My Public Profile
                </Link>
              </div>
            </nav>
          </div>
        )}

        <div className={`flex flex-col gap-8 py-8 ${isPublicProfileView ? '' : 'lg:flex-row'}`}>
          {!isPublicProfileView && (
          <>
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 shrink-0">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-28">

              {/* Agent Profile */}
              <div className="p-6 border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0B5858] shadow-md shadow-[#0B5858]/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {showProfilePhoto ? (
                      <img
                        src={userProfile!.profile_photo!}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setProfileImageError(true)}
                      />
                    ) : (
                      <span className="text-base font-bold text-white tracking-wider">{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate tracking-tight">
                      {roleLoading ? 'Loading...' : displayName}
                    </p>
                    <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-[#FACC15] text-[#0B5858]">
                      AGENT
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-1 relative">
                <p className="px-4 pt-2 pb-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Navigation
                </p>
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                      isActive(item.href)
                        ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/20 translate-x-1'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Divider + Profile Link */}
              <div className="p-4 border-t border-gray-50 bg-gray-50/30">
                <Link
                  href="/agent/profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm border border-transparent hover:border-gray-100 transition-all"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  My Public Profile
                </Link>
              </div>
            </div>
          </aside>
          </>
          )}
          {/* Main content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
          </>
        )}
        {isPublicProfileView && (
          <main className="py-8">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
