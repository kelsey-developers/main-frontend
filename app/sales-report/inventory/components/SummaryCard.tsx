'use client';

import React from 'react';

const DigitSkeleton = () => (
  <span
    className="inline-block h-9 min-w-[3.5rem] max-w-[5rem] rounded-md bg-white/40 animate-pulse"
    style={{ fontFamily: 'Poppins' }}
    aria-hidden
  />
);

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  gradient: string;
  isLoading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  gradient,
  isLoading = false,
}) => (
  <div className={`relative bg-gradient-to-br ${gradient} rounded-xl shadow-md p-4 overflow-hidden`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
    <div className="relative z-10">
      <div
        className="text-[10px] font-bold tracking-wider text-white/70 uppercase mb-2"
        style={{ fontFamily: 'Poppins' }}
      >
        {label}
      </div>
      <div
        className="text-3xl font-bold text-white leading-none"
        style={{ fontFamily: 'Poppins' }}
      >
        {isLoading ? <DigitSkeleton /> : value}
      </div>
    </div>
  </div>
);

export default SummaryCard;
