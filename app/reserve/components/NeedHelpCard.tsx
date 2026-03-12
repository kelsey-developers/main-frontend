'use client';

import React from 'react';

export const NeedHelpCard: React.FC = () => (
  <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
    <h4 className="text-sm font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Poppins' }}>Need help?</h4>
    <p className="text-xs sm:text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
      If you have questions about availability or special requests, contact us and we&apos;ll assist.
    </p>
    <button
      type="button"
      className="w-full px-3 py-2 bg-[#E8F8F7] text-[#0B5858] rounded-md text-sm font-medium"
      style={{ fontFamily: 'Poppins' }}
      onClick={() => alert('Contact support (placeholder)')}
    >
      Contact Support
    </button>
  </div>
);
