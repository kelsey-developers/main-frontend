'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_COLORS } from '@/lib/constants';

const HIDE_NAVBAR_ROUTES = ['/login', '/signup'];

/**
 * Navbar - Matches oop-dev design exactly.
 * Fixed top, white bg, logo left, nav center, user/signup right.
 * Uses mock auth for now; ready to swap to real AuthContext/API.
 * Renders after mount to avoid hydration mismatch from browser extensions (e.g. fdprocessedid).
 */
export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { user, signOut, userRole, userProfile, isAdmin, isAgent, roleLoading } =
    useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const homeHref = user ? '/home' : '/';

  useEffect(() => {
    setMounted(true);
  }, []);

  // No longer listen to body dataset flags; navbar stays visible except on auth routes.

  const getInitials = () => {
    if (userProfile?.fullname) {
      const names = userProfile.fullname.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  useEffect(() => {
    setProfileImageError(false);
  }, [userProfile?.profile_photo]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsDropdownOpen(false);
    } catch {
      setIsDropdownOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleDropdown = () => setIsDropdownOpen((o) => !o);
  const toggleMobileMenu = () => setIsMobileMenuOpen((o) => !o);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Navbar: font-medium (500) for weight between Regular and SemiBold so it’s not too thin or too thick */
  const navLinkClass =
    'text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2 mx-1';
  const mobileNavLinkClass =
    'block px-3 py-2 text-black font-sans font-medium uppercase text-sm hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors text-left cursor-pointer';
  const hideNavbarByRoute = HIDE_NAVBAR_ROUTES.some((route) =>
    pathname?.startsWith(route)
  );

  if (hideNavbarByRoute) {
    return null;
  }

  /* Nav structure matches oop-dev; links use font-sans font-medium */
  /* If you change h-14/h-16 here, update LAYOUT_NAVBAR_OFFSET in lib/constants.ts so page content stays visually clear of the nav */
  if (!mounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 bg-white z-[40] shadow-sm" aria-hidden>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 sm:h-16 relative" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white z-[40] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 sm:h-16 relative">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href={homeHref} className="block cursor-pointer">
              {/* Use img for external/copied logo; replace with Image when logo is in public */}
              <img
                src="/logo-black.png"
                alt="Logo"
                className="h-14 w-auto hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden ml-auto">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2 cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Center nav - desktop (position matches old: -137px for 3 items) */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 translate-x-[-137px]">
            <div className="flex items-baseline">
              <Link href={homeHref} className={navLinkClass}>
                HOME
              </Link>
              <Link href="/listings" className={navLinkClass}>
                LISTINGS
              </Link>
              {user && (
                <Link href="/calendar" className={navLinkClass}>
                  CALENDAR
                </Link>
              )}
              <Link href="/about" className={navLinkClass}>
                ABOUT
              </Link>
            </div>
          </div>

          {/* Right - bell then user menu; same as oop-dev: flex items-center gap-4 (16px) between items) */}
          <div className="hidden md:flex flex-shrink-0 ml-auto items-center gap-4">
            {/* Updates bell - minimal padding so gap to profile matches old LOGIN/SIGNUP spacing (16px) */}
            <span
              className="p-1 text-black rounded-full cursor-default opacity-90 inline-flex items-center justify-center"
              aria-label="Updates"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleDropdown}
                  onMouseEnter={() => {
                    if (dropdownCloseTimerRef.current) {
                      clearTimeout(dropdownCloseTimerRef.current);
                      dropdownCloseTimerRef.current = null;
                    }
                    setIsDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    dropdownCloseTimerRef.current = setTimeout(() => setIsDropdownOpen(false), 150);
                  }}
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center focus:outline-none focus:ring-0 cursor-pointer"
                  style={{
                    background:
                      userProfile?.profile_photo && !profileImageError
                        ? 'transparent'
                        : 'linear-gradient(to bottom right, #14b8a6, #0d9488)',
                  }}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  {userProfile?.profile_photo && !profileImageError ? (
                    <img
                      src={userProfile.profile_photo}
                      alt={userProfile?.fullname || 'Profile'}
                      className="w-full h-full object-cover"
                      onError={() => setProfileImageError(true)}
                    />
                  ) : (
                    <span
                      className="text-white text-sm font-bold"
                      style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}
                    >
                      {getInitials()}
                    </span>
                  )}
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute right-0 top-full pt-2 w-56 z-50"
                    onMouseEnter={() => {
                      if (dropdownCloseTimerRef.current) {
                        clearTimeout(dropdownCloseTimerRef.current);
                        dropdownCloseTimerRef.current = null;
                      }
                      setIsDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      dropdownCloseTimerRef.current = setTimeout(() => setIsDropdownOpen(false), 150);
                    }}
                  >
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden p-3">
                    {/* Profile block: centered avatar, name, role pill */}
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="group block pt-2 pb-1.5 px-3 text-center transition-colors cursor-pointer mb-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mx-auto mb-0.5">
                        {userProfile?.profile_photo && !profileImageError ? (
                          <img
                            src={userProfile.profile_photo}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setProfileImageError(true)}
                          />
                        ) : (
                            <svg
                              className="w-6 h-6 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div
                        className="text-sm font-semibold group-hover:opacity-70 truncate px-1 transition-opacity"
                        style={{ fontFamily: 'var(--font-poppins)', color: '#0B5858' }}
                      >
                        {roleLoading
                          ? 'Loading...'
                          : userProfile?.fullname ||
                            userRole?.fullname ||
                            user?.email?.split('@')[0] ||
                            'User'}
                      </div>
                      {!roleLoading && userRole?.role && (
                        <span
                          className="inline-flex mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              ROLE_COLORS[userRole.role]?.bg ?? '#558B8B',
                            color:
                              ROLE_COLORS[userRole.role]?.text ?? 'white',
                          }}
                        >
                          {userRole.role.toUpperCase()}
                        </span>
                      )}
                    </Link>
                    {/* Nav links: text-only hover, stronger contrast */}
                    <div className="px-3">
                      {isAdmin && (
                        <>
                          <Link
                            href="/admin"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Admin Panel
                          </Link>
                          <Link
                            href="/admin/agents"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Agent Directory
                          </Link>
                          <Link
                            href="/admin/payouts"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Payout Management
                          </Link>
                        </>
                      )}
                      {isAgent && (
                        <Link
                          href="/agent"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block py-1.5 text-sm font-semibold text-[#0B5858] hover:opacity-70 transition-opacity cursor-pointer"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          Agent Hub
                        </Link>
                      )}
                      {isAdmin && (
                        <>
                          <Link
                            href="/admin/cleaning"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Cleaning
                          </Link>
                          <Link
                            href="/admin/lending"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Money Lending
                          </Link>
                        </>
                      )}
                      {!roleLoading && userRole?.role === 'cleaner' && (
                        <Link
                          href="/cleaning"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          My Jobs
                        </Link>
                      )}
                    {(isAdmin || isAgent) && (
                        <>
                          <Link
                            href="/booking"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            My Bookings
                          </Link>
                          <Link
                            href="/rewards"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Rewards Hub
                          </Link>
                        </>
                      )}
                    {isAgent && !isAdmin && (
                        <Link
                          href="/lending"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          My Loans
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Settings
                      </Link>
                      <Link
                        href="/help-and-support"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block py-1.5 text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Help & Support
                      </Link>
                    </div>
                    {/* Separator: inset to match inner content (px-3) so line aligns with text */}
                    <div className="border-t border-gray-200 my-1.5 mx-3" />
                    <div className="px-3 pb-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="block w-full text-left py-1.5 text-sm text-black hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {isLoggingOut ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2" />
                            Logging out...
                          </>
                        ) : (
                          'Log out'
                        )}
                      </button>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white px-4 py-2 rounded-lg font-sans font-medium uppercase text-sm transition-colors hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: '#0B5858' }}
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden border-t border-gray-200 mobile-menu-dropdown${isMobileMenuOpen ? ' open' : ''}`}
        >
          <div className="px-4 py-3 space-y-1">
            <Link
              href={homeHref}
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              HOME
            </Link>
            <Link
              href="/listings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              LISTINGS
            </Link>
            {user && (
                <Link
                href="/calendar"
                onClick={() => setIsMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                CALENDAR
              </Link>
            )}
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              ABOUT
            </Link>
            <span
              className="flex items-center gap-2 px-3 py-2 text-black font-sans font-medium text-sm rounded-md text-left cursor-default opacity-90"
            >
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Updates
            </span>
            <div className="border-t border-gray-200 my-2" />
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                      {userProfile?.profile_photo ? (
                        <img
                          src={userProfile.profile_photo}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{
                          color: '#0B5858',
                          fontFamily: 'var(--font-poppins)',
                        }}
                      >
                        {userProfile?.fullname ||
                          userRole?.fullname ||
                          user?.email?.split('@')[0] ||
                          'User'}
                      </div>
                      {userRole?.role && (
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              ROLE_COLORS[userRole.role]?.bg ?? '#558B8B',
                            color:
                              ROLE_COLORS[userRole.role]?.text ?? 'white',
                          }}
                        >
                          {userRole.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      href="/admin/cleaning"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Cleaning
                    </Link>
                    <Link
                      href="/admin/lending"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Money Lending
                    </Link>
                  </>
                )}
                {!roleLoading && userRole?.role === 'cleaner' && (
                  <Link
                    href="/cleaning"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    My Jobs
                  </Link>
                )}
                {(isAdmin || isAgent) && (
                  <>
                    <Link
                      href="/booking"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      My Bookings
                    </Link>
                    <Link
                      href="/rewards"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Rewards Hub
                    </Link>
                  </>
                )}
                {isAgent && !isAdmin && (
                  <Link
                    href="/lending"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    My Loans
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Settings
                </Link>
                <Link
                  href="/help-and-support"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-left"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Help & Support
                </Link>
                <div className="border-t border-gray-200 my-2" />
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoggingOut}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2 inline-block" />
                      Logging out...
                    </>
                  ) : (
                    'Log out'
                  )}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  LOGIN
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 text-white font-sans font-medium uppercase text-sm transition-colors hover:opacity-90 rounded-md cursor-pointer"
                  style={{ backgroundColor: '#0B5858' }}
                >
                  SIGNUP
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
