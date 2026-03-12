'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminSummaryCards from './components/AdminSummaryCards';
import AdminCharts from './components/AdminCharts';
import CalendarWidget from '../../components/CalendarWidget';
import type { AdminStats, ChartData } from './types';
import { getAgentAnalytics } from '@/services/agentDashboardService';
import type { AgentAnalytics } from '@/services/agentDashboardService';
import { getCleaningJobs } from '@/services/cleaningService';

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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartData[]>([]);
  const [bookingGrowth, setBookingGrowth] = useState<ChartData[]>([]);
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaningTodayCount, setCleaningTodayCount] = useState(0);
  const [cleaningPendingVerify, setCleaningPendingVerify] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setStats(generateMockStats());
      setUserGrowth(generateWeeklyUserData());
      setBookingGrowth(generateWeeklyBookingData());
      const analytics = await getAgentAnalytics();
      setAgentAnalytics(analytics);
      setLoading(false);
    }, 500);

    // Load cleaning stats in parallel
    getCleaningJobs().then((jobs) => {
      const todayJobs = jobs.filter((j) => j.scheduledDate === TODAY);
      setCleaningTodayCount(todayJobs.filter((j) => j.status === 'scheduled' || j.status === 'in_progress').length);
      setCleaningPendingVerify(jobs.filter((j) => j.status === 'completed').length);
    });

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#0B5858] border-r-transparent"></div>
            <p className="mt-4 text-gray-600" style={{ fontFamily: 'Poppins' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
                Admin Dashboard
              </h1>
              <p className="text-gray-600" style={{ fontFamily: 'Poppins' }}>
                Welcome! manage your platform's users, bookings, and listings
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
                <button
                className="bg-gradient-to-br from-[#F1C40F] to-[#F39C12] text-white px-4 py-2 rounded-lg hover:from-[#F39C12] hover:to-[#E67E22] transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Booking Requests
              </button>
              <Link
                href="/manage-users"
                className="bg-[#0B5858] text-white px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Manage Users
              </Link>
              <Link
                href="/manage-units"
                className="bg-gradient-to-br from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manage Listings
              </Link>
              <Link
                href="/admin/agent-registration"
                className="border border-[#0B5858] text-[#0B5858] bg-white px-4 py-2 rounded-lg hover:bg-[#0B5858] hover:text-white transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
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

        {/* Agent Analytics Section */}
        {agentAnalytics && (
          <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>Agent Analytics</h3>
                <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>Top performing agents and commission overview</p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/agents" className="px-4 py-2 text-sm font-semibold text-[#0B5858] border border-[#0B5858]/30 rounded-xl hover:bg-[#0B5858]/5 transition-colors" style={{ fontFamily: 'Poppins' }}>
                  All Agents
                </Link>
                <Link href="/admin/commissions" className="px-4 py-2 text-sm font-semibold text-white bg-[#0B5858] rounded-xl hover:bg-[#0d7a7a] transition-colors" style={{ fontFamily: 'Poppins' }}>
                  Commission Ledger
                </Link>
              </div>
            </div>
            <div className="p-6">
              {/* Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Agents', value: agentAnalytics.totalAgents, icon: '👥' },
                  { label: 'Active Agents', value: agentAnalytics.activeAgents, icon: '✅' },
                  { label: 'Total Paid (₱)', value: `₱${agentAnalytics.totalCommissionsPaid.toLocaleString()}`, icon: '💰' },
                  { label: 'Pending (₱)', value: `₱${agentAnalytics.totalCommissionsPending.toLocaleString()}`, icon: '⏳' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-lg mb-1">{s.icon}</p>
                    <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>{s.label}</p>
                    <p className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Top Agents Leaderboard */}
              <h4 className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: 'Poppins' }}>Top Agents by Commission</h4>
              <div className="space-y-2">
                {agentAnalytics.topAgents.map((agent, idx) => (
                  <div key={agent.agentId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-400 text-orange-900' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: 'Poppins' }}>{agent.agentName}</p>
                      <p className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>
                        {agent.totalBookings} bookings · {agent.activeSubAgents} sub-agents · <code className="bg-gray-200 px-1 rounded text-xs">{agent.referralCode}</code>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>₱{agent.totalCommissions.toLocaleString()}</p>
                    </div>
                    <Link
                      href={`/admin/agents/${agent.agentId}`}
                      className="px-3 py-1 text-xs font-semibold text-[#0B5858] bg-[#0B5858]/8 hover:bg-[#0B5858]/15 rounded-lg transition-colors whitespace-nowrap"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <Link href="/admin/payouts" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0B5858] rounded-xl hover:bg-[#0d7a7a] transition-colors" style={{ fontFamily: 'Poppins' }}>
                  Manage Payouts
                </Link>
                <Link href="/admin/agent-registration" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0B5858] border border-[#0B5858]/30 rounded-xl hover:bg-[#0B5858]/5 transition-colors" style={{ fontFamily: 'Poppins' }}>
                  Registration Config
                </Link>
              </div>
            </div>
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900" style={{fontFamily: 'Poppins'}}>Upcoming Bookings Calendar</h3>
            <p className="text-gray-600 mt-1" style={{fontFamily: 'Poppins'}}>View and manage all upcoming bookings</p>
          </div>
          <div className="p-6">
            <CalendarWidget hideNavbar={true} />
          </div>
        </div>
      </div>
    </div>
  );
});

AdminPage.displayName = 'AdminPage';

export default AdminPage;
