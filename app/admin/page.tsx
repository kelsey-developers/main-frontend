'use client';

import React, { useEffect, useState } from 'react';
import AdminSummaryCards from './components/AdminSummaryCards';
import AdminCharts from './components/AdminCharts';
import CalendarWidget from '../../components/CalendarWidget';
import type { AdminStats, ChartData } from './types';

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

const AdminPage: React.FC = React.memo(() => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<ChartData[]>([]);
  const [bookingGrowth, setBookingGrowth] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setStats(generateMockStats());
      setUserGrowth(generateWeeklyUserData());
      setBookingGrowth(generateWeeklyBookingData());
      setLoading(false);
    }, 500);

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
              <button
                className="bg-[#0B5858] text-white px-4 py-2 rounded-lg hover:bg-[#0a4a4a] transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Manage Users
              </button>
              <button
                className="bg-gradient-to-br from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center shadow-md hover:shadow-lg cursor-pointer text-sm"
                style={{fontFamily: 'Poppins'}}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manage Listings
              </button>

            </div>
        </div>

        {stats && <AdminSummaryCards stats={stats} />}

        {userGrowth.length > 0 && bookingGrowth.length > 0 && (
          <AdminCharts userGrowth={userGrowth} bookingGrowth={bookingGrowth} />
        )}

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
