'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 sm:h-16 relative">
          {/* Left side - Logo */}
          <div className="flex-shrink-0">
            <Link href="/home" className="block cursor-pointer">
              <div className="h-14 w-auto hover:opacity-80 transition-opacity flex items-center">
                <span className="text-2xl font-bold text-[#0B5858]">Kelsey&apos;s</span>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden ml-auto flex items-center space-x-2">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2 cursor-pointer"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Center - Navigation Links */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 translate-x-[-137px]">
            <div className="flex items-baseline">
              <Link
                href="/home"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2 mx-1"
              >
                HOME
              </Link>
              <Link
                href="/listings"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2 mx-1"
              >
                LISTINGS
              </Link>
              <Link
                href="/calendar"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2 mx-1"
              >
                CALENDAR
              </Link>
            </div>
          </div>

          {/* Right side - Auth Buttons */}
          <div className="hidden md:block flex-shrink-0 ml-auto">
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-[#0B5858] font-medium px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="bg-[#0B5858] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              <Link
                href="/home"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                HOME
              </Link>
              <Link
                href="/listings"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                LISTINGS
              </Link>
              <Link
                href="/calendar"
                className="text-black font-sans font-medium uppercase text-sm hover:text-teal-900 transition-colors px-4 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                CALENDAR
              </Link>
              <div className="flex flex-col space-y-2 px-4 pt-2 border-t border-gray-200">
                <Link
                  href="/login"
                  className="text-[#0B5858] font-medium px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#0B5858] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
