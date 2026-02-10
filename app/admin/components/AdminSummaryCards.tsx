import React from 'react';
import type { AdminStats } from '../types';

interface AdminSummaryCardsProps {
  stats: AdminStats;
}

const AdminSummaryCards: React.FC<AdminSummaryCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="relative bg-gradient-to-br from-[#0B5858] to-[#0a4a4a] rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Users</p>
            <p className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Poppins' }}>{stats.totalUsers}</p>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
      </div>

      <div className="relative bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-right">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Listings</p>
            <p className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Poppins' }}>{stats.totalListings}</p>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
      </div>

      <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
              <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-right">
              <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-black/70 text-sm font-medium mb-1" style={{ fontFamily: 'Poppins' }}>Total Bookings</p>
            <p className="text-4xl font-bold text-black mb-2" style={{ fontFamily: 'Poppins' }}>{stats.totalBookings}</p>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
      </div>
    </div>
  );
};

export default AdminSummaryCards;
