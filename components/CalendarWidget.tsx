'use client';

import React, { useState, useEffect } from 'react';

// Mock booking data type
type Booking = {
  id: string;
  checkInDate: Date;
  checkOutDate: Date;
  title: string;
  clientName: string;
  status: 'booked' | 'pending' | 'available' | 'blocked';
  totalAmount: number;
};

// Generate mock bookings
const generateMockBookings = (): Booking[] => {
  const today = new Date();
  return [
    {
      id: '1',
      checkInDate: new Date(today.getFullYear(), today.getMonth(), 15),
      checkOutDate: new Date(today.getFullYear(), today.getMonth(), 18),
      title: 'Ocean View Villa',
      clientName: 'John Smith',
      status: 'booked',
      totalAmount: 1200
    },
    {
      id: '2',
      checkInDate: new Date(today.getFullYear(), today.getMonth(), 20),
      checkOutDate: new Date(today.getFullYear(), today.getMonth(), 25),
      title: 'Mountain Cabin',
      clientName: 'Sarah Johnson',
      status: 'pending',
      totalAmount: 800
    },
    {
      id: '3',
      checkInDate: new Date(today.getFullYear(), today.getMonth(), 10),
      checkOutDate: new Date(today.getFullYear(), today.getMonth(), 12),
      title: 'City Apartment',
      clientName: 'Mike Davis',
      status: 'booked',
      totalAmount: 600
    },
    {
      id: '4',
      checkInDate: new Date(today.getFullYear(), today.getMonth(), 28),
      checkOutDate: new Date(today.getFullYear(), today.getMonth() + 1, 2),
      title: 'Beach House',
      clientName: 'Emma Wilson',
      status: 'pending',
      totalAmount: 1500
    }
  ];
};

interface CalendarWidgetProps {
  hideNavbar?: boolean;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ hideNavbar }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [bookings] = useState<Booking[]>(generateMockBookings());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days: { date: number; isCurrentMonth: boolean; isToday: boolean; fullDate: Date }[] = [];

    // Previous month filler
    const prevMonthLast = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast.getDate() - i);
      days.push({ date: d.getDate(), isCurrentMonth: false, isToday: false, fullDate: d });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const full = new Date(year, month, d);
      const isToday = full.toDateString() === new Date().toDateString();
      days.push({ date: d, isCurrentMonth: true, isToday, fullDate: full });
    }

    // Next month filler
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const full = new Date(year, month + 1, d);
      days.push({ date: d, isCurrentMonth: false, isToday: false, fullDate: full });
    }

    return days;
  };

  // Check if a date has bookings
  const getBookingsForDate = (date: Date): Booking[] => {
    return bookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate.getFullYear(), booking.checkInDate.getMonth(), booking.checkInDate.getDate());
      const checkOut = new Date(booking.checkOutDate.getFullYear(), booking.checkOutDate.getMonth(), booking.checkOutDate.getDate());
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return checkDate >= checkIn && checkDate < checkOut;
    });
  };

  // Get status background color
  const getStatusBgClass = (status: string): string => {
    switch (status) {
      case 'booked': return 'bg-green-100 border-green-300';
      case 'pending': return 'bg-yellow-100 border-yellow-300';
      case 'blocked': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'prev' ? -1 : 1), 1);
    setCurrentDate(newDate);
  };

  const days = getDaysInMonth(currentDate);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            style={{ color: '#0B5858' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#0B5858', fontFamily: 'Poppins' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            style={{ color: '#0B5858' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'Poppins' }}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg transition-all ${
              viewMode === 'weekly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ fontFamily: 'Poppins' }}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {viewMode === 'monthly' ? (
          <div className="p-6">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 py-2"
                  style={{ fontFamily: 'Poppins' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayBookings = getBookingsForDate(day.fullDate);
                const hasBookings = dayBookings.length > 0;

                return (
                  <div
                    key={index}
                    className={`min-h-24 p-2 rounded-lg border-2 transition-all cursor-pointer ${
                      day.isCurrentMonth
                        ? hasBookings
                          ? getStatusBgClass(dayBookings[0].status)
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        : 'bg-gray-50 border-gray-100'
                    } ${day.isToday ? 'ring-2 ring-offset-2' : ''}`}
                    style={day.isToday ? { '--tw-ring-color': '#0B5858' } as React.CSSProperties : {}}
                    onClick={() => hasBookings && setSelectedDate(day.fullDate)}
                  >
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {day.date}
                    </div>

                    {hasBookings && day.isCurrentMonth && (
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map((booking, idx) => (
                          <div
                            key={idx}
                            className="text-xs px-2 py-1 rounded bg-white/50 truncate"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            {booking.title}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-gray-600 px-2" style={{ fontFamily: 'Poppins' }}>
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center text-gray-500 py-20" style={{ fontFamily: 'Poppins' }}>
              Weekly view coming soon...
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300"></div>
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border-2 border-gray-200"></div>
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
              <span className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>Blocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#0B5858', fontFamily: 'Poppins' }}>
                Bookings for {selectedDate.toLocaleDateString()}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {getBookingsForDate(selectedDate).map((booking) => (
                <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                      {booking.title}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.status === 'booked'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>
                    Guest: {booking.clientName}
                  </p>
                  <p className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>
                    Check-in: {booking.checkInDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
                    Check-out: {booking.checkOutDate.toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: '#0B5858', fontFamily: 'Poppins' }}>
                    Total: ${booking.totalAmount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CalendarWidget;