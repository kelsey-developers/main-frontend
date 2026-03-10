'use client';

import React from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

interface RewardsMaintenanceProps {
  onRetry: () => void;
}

export default function RewardsMaintenance({ onRetry }: RewardsMaintenanceProps) {
  return (
    <div
      className={`relative min-h-screen ${LAYOUT_NAVBAR_OFFSET} bg-white overflow-hidden`}
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      {/* Top accent bar – brand teal */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0B5858] via-[#18a2a2] to-[#0B5858]" aria-hidden />

      {/* Decorative background blobs – very subtle, low opacity */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(11,88,88,0.06) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 text-center">

        {/* Rewards Hub label */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B5858]/8 text-[#0B5858] text-xs font-semibold tracking-wide uppercase mb-10 select-none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" aria-hidden>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Rewards Hub
        </span>

        {/* Icon */}
        <div className="relative mb-8">
          {/* Soft outer ring */}
          <div className="absolute inset-0 rounded-full scale-[1.35] bg-[#0B5858]/5" aria-hidden />
          {/* Inner ring */}
          <div className="absolute inset-0 rounded-full scale-[1.15] bg-[#0B5858]/8" aria-hidden />
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-[#0B5858]/15 shadow-[0_4px_24px_rgba(11,88,88,0.12)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-9 h-9 text-[#0B5858]"
              aria-hidden
            >
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
          Under Maintenance
        </h1>

        {/* Amber accent divider */}
        <div className="flex items-center gap-2 mb-5" aria-hidden>
          <div className="w-8 h-px bg-gray-200 rounded-full" />
          <div className="w-2 h-2 rounded-full bg-[#FACC15]" />
          <div className="w-8 h-px bg-gray-200 rounded-full" />
        </div>

        {/* Description */}
        <p className="text-sm sm:text-[15px] text-gray-500 max-w-[300px] sm:max-w-sm leading-relaxed mb-10">
          We&apos;re making some improvements to the Rewards system. Please check back in a little while.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={onRetry}
          className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B5858] text-white font-semibold text-sm hover:bg-[#094848] active:scale-95 transition-all shadow-[0_2px_12px_rgba(11,88,88,0.25)] hover:shadow-[0_4px_18px_rgba(11,88,88,0.35)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 transition-transform group-hover:-rotate-45"
            aria-hidden
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          Try again
        </button>

        {/* Support note */}
        <p className="mt-6 text-xs text-gray-400">
          Need help?{' '}
          <a href="mailto:support@kelsey.com" className="text-[#0B5858] hover:underline font-medium">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
