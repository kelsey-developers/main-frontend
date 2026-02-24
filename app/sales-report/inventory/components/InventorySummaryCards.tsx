import React from 'react';
import type { InventoryDashboardSummary } from '../types';

interface InventorySummaryCardsProps {
  summary: InventoryDashboardSummary;
}

const InventorySummaryCards: React.FC<InventorySummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="relative bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total items</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{summary.totalItems}</p>
          <p className="text-white/70 text-xs mt-0.5" style={{ fontFamily: 'Poppins' }}>Tracked in system</p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Stocks</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{summary.totalStocks}</p>
          <p className="text-white/70 text-xs mt-0.5" style={{ fontFamily: 'Poppins' }}>Total stocks in the system</p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-red-400 to-red-500 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-white/90 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Low stock</p>
          <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Poppins' }}>{summary.lowStockCount}</p>
          <p className="text-white/80 text-xs mt-0.5" style={{ fontFamily: 'Poppins' }}>Below threshold</p>
        </div>
      </div>
    </div>
  );
};

export default InventorySummaryCards;
