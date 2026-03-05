import React from 'react';
import type { RevenueOverview } from '../types';
import { formatPHP } from '../lib/format';

interface RevenueOverviewCardsProps {
  overview: RevenueOverview;
}

const RevenueOverviewCards: React.FC<RevenueOverviewCardsProps> = ({ overview }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-0.5" style={{ fontFamily: 'Poppins' }}>Daily revenue</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{formatPHP(overview.daily)}</p>
        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>{overview.periodLabel}</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-0.5" style={{ fontFamily: 'Poppins' }}>Weekly revenue</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{formatPHP(overview.weekly)}</p>
        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>{overview.periodLabel}</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-0.5" style={{ fontFamily: 'Poppins' }}>Monthly revenue</p>
        <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>{formatPHP(overview.monthly)}</p>
        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>{overview.periodLabel}</p>
      </div>
    </div>
  );
};

export default RevenueOverviewCards;
