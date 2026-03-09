'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminSummaryCards from './components/AdminSummaryCards';
import AdminCharts from './components/AdminCharts';
import CalendarWidget from '../../components/CalendarWidget';
import type { AdminStats, ChartData } from './types';
import { getLendingSummary } from '@/services/lendingService';
import type { LendingSummary } from '@/types/lending';

// Generate mock data for admin stats
const generateMockStats = (): AdminStats => {
  return {
    totalUsers: 347,
    totalBookings: 156,
    totalListings: 89,
    monthlyBookings: 94,
    revenue: 25800,
  };
};

// Generate mock data for weekly user growth
const generateWeeklyUserData = (): ChartData[] => {
  const data: ChartData[] = [];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    data.push({
      name: daysOfWeek[i],
      users: Math.floor(Math.random() * 20) + 5,
    });
  }
  
  return data;
};

// Generate mock data for weekly booking growth
const generateWeeklyBookingData = (): ChartData[] => {
  const data: ChartData[] = [];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    data.push({
      name: daysOfWeek[i],
      bookings: Math.floor(Math.random() * 15) + 3,
    });
  }
  
  return data;
};

const TODAY = new Date().toISOString().split('T')[0];
const AdminPage: React.FC = React.memo(() => {
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lendingSummary, setLendingSummary] = useState<LendingSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    getAgentAnalytics()
      .then((data) => {
        if (mounted) setAgentAnalytics(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

    getLendingSummary().then(setLendingSummary);

    getLendingSummary().then(setLendingSummary);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${LAYOUT_NAVBAR_OFFSET}`}>
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#0B5858] border-r-transparent" />
            <p className="mt-4 text-gray-600" style={{ fontFamily: 'Poppins' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative ${LAYOUT_NAVBAR_OFFSET}`} style={{ fontFamily: 'Poppins' }}>
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage platform users, bookings, listings, inventory, and finance.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/manage-users"
              className="bg-[#0B5858] text-white px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition-all flex items-center shadow-md hover:shadow-lg text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Manage Users
            </Link>
            <Link
              href="/manage-units"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all flex items-center shadow-md hover:shadow-lg text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Manage Listings
            </Link>
            <Link
              href="/admin/agent-registration"
              className="border border-[#0B5858] text-[#0B5858] bg-white px-4 py-2 rounded-lg hover:bg-[#0B5858] hover:text-white transition-all flex items-center shadow-md text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Agent Registration
            </Link>
          </div>
        </div>

        {stats && <AdminSummaryCards stats={stats} />}

        {userGrowth.length > 0 && bookingGrowth.length > 0 && (
          <AdminCharts userGrowth={userGrowth} bookingGrowth={bookingGrowth} />
        )}

        {/* Mini-System Cards */}
        {lendingSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Money Lending mini-card */}
            <Link
              href="/admin/lending"
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#0B5858]/20 transition-all p-5 block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B5858]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>Money Lending</p>
                    <p className="text-xs text-gray-500">In-house loan program</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0B5858] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Active</p>
                  <p className="text-lg font-bold text-[#0B5858]">{lendingSummary.totalLoansActive}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Overdue</p>
                  <p className={`text-lg font-bold ${lendingSummary.totalLoansOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {lendingSummary.totalLoansOverdue}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Outstanding</p>
                  <p className="text-sm font-bold text-gray-900">
                    ₱{(lendingSummary.totalPrincipalOutstanding / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
              {lendingSummary.totalLoansOverdue > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {lendingSummary.totalLoansOverdue} loan{lendingSummary.totalLoansOverdue > 1 ? 's' : ''} overdue — action required
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Calendar View Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>Upcoming Bookings Calendar</h3>
            <p className="text-gray-600 mt-1" style={{fontFamily: 'Poppins'}}>View and manage all upcoming bookings</p>
          </div>
        )}

        {/* Cleaning mini-card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 mt-6">
          <Link
            href="/admin/cleaning"
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md hover:border-[#0B5858]/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#0B5858]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cleaning Today</p>
                <p className="text-2xl font-bold text-gray-900">{cleaningTodayCount}</p>
                <p className="text-xs text-gray-400">jobs active · {cleaningPendingVerify} pending verification</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0B5858] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/admin/cleaning/schedule"
            className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md hover:border-[#0B5858]/20 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FACC15]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#FACC15]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cleaning Calendar</p>
                <p className="text-sm font-semibold text-gray-700">View schedule &amp; assign jobs</p>
                <p className="text-xs text-gray-400">monthly view with job status</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0B5858] group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Calendar View Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200/80">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Upcoming Bookings Calendar</h3>
            <p className="text-gray-600 mt-1 text-sm">View and manage all upcoming bookings</p>
          </div>
          <div className="p-0 overflow-hidden">
            <CalendarView embedded />
          </div>
        </div>
      </div>
    </div>
  );
});

AdminPage.displayName = 'AdminPage';

export default AdminPage;
