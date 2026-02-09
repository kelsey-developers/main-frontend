'use client';

import React from 'react';

/**
 * Footer - Exact same design as oop-dev.
 * Teal background (#0B5858), logo left, email CTA right, divider, copyright + social.
 */
export default function Footer() {
  return (
    <footer
      className="bg-[#0B5858] text-white py-8 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up relative z-10"
      style={{ position: 'relative', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top section */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-6 sm:mb-8">
          <div
            className="flex items-center mb-6 sm:mb-8 md:mb-0 animate-fade-in-left"
            style={{ animationDelay: '0.2s' }}
          >
            <img
              src="/footerlogo.png"
              alt="Kelsey's Homestay Logo"
              className="w-48 sm:w-56 md:w-60 h-auto hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div
            className="text-center md:text-right animate-fade-in-right"
            style={{ animationDelay: '0.3s' }}
          >
            <p
              className="text-lg sm:text-xl md:text-2xl font-poppins font-semibold mb-4"
              style={{ fontFamily: 'var(--font-poppins)', fontWeight: 600 }}
            >
              For more inquiries please
              <br />
              contact us via email
            </p>
            <div className="flex justify-center md:justify-end shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full max-w-md md:max-w-none md:w-auto">
              <input
                type="email"
                placeholder="Your email"
                className="p-3 sm:p-4 rounded-l-xl sm:rounded-l-2xl focus:outline-none text-black w-full md:w-80 text-sm sm:text-base bg-white transition-all duration-300 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
                style={{ fontFamily: 'var(--font-poppins)', fontWeight: 400 }}
                aria-label="Your email"
              />
              <button
                type="button"
                className="bg-yellow-400 text-black p-3 sm:p-4 rounded-r-xl sm:rounded-r-2xl font-poppins font-medium text-sm sm:text-base transition-all duration-300 hover:bg-yellow-500 hover:scale-105 active:scale-95 cursor-pointer"
                style={{ fontFamily: 'var(--font-poppins)', fontWeight: 500 }}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white my-6 sm:my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-xs sm:text-sm gap-4 md:gap-0">
          <p
            className="font-poppins text-center md:text-left"
            style={{ fontFamily: 'var(--font-poppins)', fontWeight: 400 }}
          >
            ©2025 Kelsey&apos;s Homestay. All Rights Reserved.
          </p>
          <div className="flex items-center">
            <p
              className="font-poppins mr-3 sm:mr-4"
              style={{ fontFamily: 'var(--font-poppins)', fontWeight: 400 }}
            >
              Follow us on
            </p>
            <div className="flex">
              <a
                href="https://www.facebook.com/kelseycaiden"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-yellow-400 transition-colors duration-300 cursor-pointer"
                aria-label="Facebook"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-facebook sm:w-6 sm:h-6"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
