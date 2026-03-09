'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMyBookings, type MyBookingItem } from '@/lib/api/bookings';

type BookingStatus = 'completed' | 'cancelled' | 'ongoing' | 'pending' | 'pending-payment' | 'declined' | 'booked';

const BookingPage: React.FC = () => {
  const [bookings, setBookings] = useState<MyBookingItem[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<MyBookingItem[]>([]);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function fetchBookings() {
      try {
        setIsLoading(true);
        const data = await getMyBookings();
        if (mounted) setBookings(data);
      } catch {
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchBookings();
    return () => { mounted = false; };
  }, []);

  // Track mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Filter bookings based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === activeTab));
    }
  }, [bookings, activeTab]);
  const viewRef = (b: MyBookingItem) => b.reference_code || b.id;

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'booked':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'ongoing':
        return 'text-orange-500';
      case 'pending':
        return 'text-yellow-600';
      case 'pending-payment':
        return 'text-blue-600';
      case 'declined':
        return 'text-red-500';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string, booking: MyBookingItem) => {
    if (status === 'pending-payment') {
      if (booking.payment) {
        return 'Payment Under Review';
      }
      return 'Awaiting payment';
    }
    switch (status) {
      case 'ongoing':
        return 'On-going';
      case 'booked':
        return 'Booked';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const router = useRouter();

  const handleViewBooking = (bookingIdOrRef: string) => {
    router.push(`/booking-details/${encodeURIComponent(bookingIdOrRef)}`);
  };

  const tabs: Array<{ key: BookingStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'pending-payment', label: 'Awaiting Payment' },
    { key: 'booked', label: 'Booked' },
    { key: 'ongoing', label: 'On-going' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'declined', label: 'Declined' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="pt-20 pb-8 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-0">
            <h1 className="text-3xl font-bold text-gray-800 mb-6" style={{fontFamily: 'Poppins'}}>
              Booking
            </h1>
            
            {/* Tabs */}
            <style>{`
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }

                /* transition styles */
                .step-circle { transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease; }
                .step-circle-active { transform: scale(1.12); }
                .connector { transition: background-color 160ms ease; }
              `}</style>
            <div className="w-full overflow-x-auto hide-scrollbar mx-0 sm:mx-0 sm:px-0 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="inline-flex items-center space-x-4 whitespace-nowrap px-4 sm:px-0 snap-x snap-mandatory" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-shrink-0 snap-start inline-block pb-4 px-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'text-gray-800 border-b-2 border-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={{ fontFamily: 'Poppins' }}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full-bleed divider on mobile */}
          <div className="border-b border-gray-200 mb-5 -mx-4 sm:mx-0" />

          {/* Booking Cards */}
          <div className="space-y-6 min-h-[400px]">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex justify-center items-center py-12 min-h-[400px]">
                <div className="text-center">
                  <p className="text-gray-500 text-lg" style={{fontFamily: 'Poppins'}}>
                    {bookings.length === 0 ? 'You have no bookings yet.' : 'No bookings found for the selected filter.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                >
                  {/* Date Range */}
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-gray-800 font-medium" style={{fontFamily: 'Poppins'}}>
                      {formatDateRange(booking.check_in_date, booking.check_out_date)}
                    </p>
                    
                    {/* Toggle Switch */}
                    <div className="flex items-center">
                      <span className="sr-only">Notifications</span>
                      <span className="hidden sm:inline-block text-sm text-gray-500 mr-2" style={{fontFamily: 'Poppins'}}>
                        Notifications
                      </span>
                      <button
                        onClick={() => {
                          setToggleStates(prev => ({
                            ...prev,
                            [booking.id]: !prev[booking.id]
                          }));
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          toggleStates[booking.id] ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            toggleStates[booking.id] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Left Column - Image */}
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <img
                        src={booking.listing.main_image_url}
                        alt={booking.listing.title}
                        className="w-full sm:w-40 h-36 sm:h-28 object-cover rounded-lg"
                      />
                    </div>

                    {/* Center Column - Details */}
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1" style={{fontFamily: 'Poppins'}}>
                        {booking.listing.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-3" style={{fontFamily: 'Poppins'}}>
                        {booking.listing.location}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs sm:text-sm" style={{fontFamily: 'Poppins'}}>
                            Booked for {booking.client.first_name} {booking.client.last_name}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-gray-500">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs sm:text-sm" style={{fontFamily: 'Poppins'}}>
                            Transaction No. #{booking.payment?.reference_number || booking.transaction_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Status and Bill */}
                    {isMobile ? (
                      // Mobile layout
                      <div className="w-full mt-3">
                        <div>
                          <span className={`font-medium ${getStatusColor(booking.status)}`} style={{fontFamily: 'Poppins'}}>
                            {getStatusText(booking.status, booking)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                          <div>
                            <p className="text-gray-500 text-xs" style={{fontFamily: 'Poppins'}}>
                              Total Bill
                            </p>
                            <p className="text-base font-bold text-gray-800" style={{fontFamily: 'Poppins'}}>
                              ₱ {booking.total_amount.toLocaleString()}
                            </p>
                          </div>

                          <div className="pl-3">
                            <button
                              onClick={() => handleViewBooking(viewRef(booking))}
                              className="bg-[#0B5858] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#0a4a4a] transition-colors cursor-pointer"
                              style={{fontFamily: 'Poppins'}}
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Desktop layout
                      <div className="flex-shrink-0 text-center sm:text-right mt-4 sm:mt-0">
                        <div className="mb-3">
                          <span className={`font-medium ${getStatusColor(booking.status)}`} style={{fontFamily: 'Poppins'}}>
                            {getStatusText(booking.status, booking)}
                          </span>
                        </div>

                        <div className="mb-4">
                          <p className="text-gray-500 text-sm mb-1" style={{fontFamily: 'Poppins'}}>
                            Total Bill
                          </p>
                          <p className="text-xl font-bold text-gray-800" style={{fontFamily: 'Poppins'}}>
                            ₱ {booking.total_amount.toLocaleString()}
                          </p>
                        </div>

                        <button 
                          onClick={() => handleViewBooking(viewRef(booking))}
                          className="bg-[#0B5858] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#0a4a4a] transition-colors cursor-pointer w-full sm:w-auto" 
                          style={{fontFamily: 'Poppins'}}
                        >
                          View
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default BookingPage;
