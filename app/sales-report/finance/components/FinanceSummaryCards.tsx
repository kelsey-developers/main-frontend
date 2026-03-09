import React from 'react';
import type { FinanceDashboardSummary } from '../types';
import { formatNumber, formatPHP } from '../lib/format';

interface FinanceSummaryCardsProps {
  summary: FinanceDashboardSummary;
}

const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="relative bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Sales</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{formatPHP(summary.totalSales)}</p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Revenue</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{formatPHP(summary.totalRevenue)}</p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-white/90 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Rent</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{formatNumber(summary.totalRent)}</p>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummaryCards;
