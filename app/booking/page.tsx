'use client';

import React, { useState, useEffect } from 'react';

type BookingStatus = 'completed' | 'cancelled' | 'ongoing' | 'pending' | 'pending-payment' | 'declined';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status: BookingStatus;
  total_amount: number;
  transaction_number: string;
  listing: {
    title: string;
    location: string;
    main_image_url: string;
  };
  client: {
    first_name: string;
    last_name: string;
  };
  payment?: {
    reference_number: string;
    status: string;
  };
}

// Mock booking data
const generateMockBookings = (): Booking[] => {
  return [
    {
      id: '1',
      check_in_date: '2026-02-15T14:00:00',
      check_out_date: '2026-02-18T11:00:00',
      status: 'ongoing',
      total_amount: 12500,
      transaction_number: 'TXN-2026-001',
      listing: {
        title: 'Seaside Villa Resort',
        location: 'Boracay, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'Maria',
        last_name: 'Santos'
      },
      payment: {
        reference_number: 'PAY-2026-001',
        status: 'completed'
      }
    },
    {
      id: '2',
      check_in_date: '2026-02-20T14:00:00',
      check_out_date: '2026-02-25T11:00:00',
      status: 'pending-payment',
      total_amount: 18000,
      transaction_number: 'TXN-2026-002',
      listing: {
        title: 'Mountain View Cottage',
        location: 'Tagaytay, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'John',
        last_name: 'Dela Cruz'
      }
    },
    {
      id: '3',
      check_in_date: '2026-03-01T14:00:00',
      check_out_date: '2026-03-05T11:00:00',
      status: 'pending',
      total_amount: 15000,
      transaction_number: 'TXN-2026-003',
      listing: {
        title: 'Beach House Paradise',
        location: 'Palawan, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'Anna',
        last_name: 'Reyes'
      }
    },
    {
      id: '4',
      check_in_date: '2026-01-10T14:00:00',
      check_out_date: '2026-01-15T11:00:00',
      status: 'completed',
      total_amount: 22000,
      transaction_number: 'TXN-2026-004',
      listing: {
        title: 'City Center Apartment',
        location: 'Manila, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'Carlos',
        last_name: 'Garcia'
      },
      payment: {
        reference_number: 'PAY-2026-004',
        status: 'completed'
      }
    },
    {
      id: '5',
      check_in_date: '2026-01-20T14:00:00',
      check_out_date: '2026-01-22T11:00:00',
      status: 'cancelled',
      total_amount: 8000,
      transaction_number: 'TXN-2026-005',
      listing: {
        title: 'Lakeside Retreat',
        location: 'Laguna, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'Sofia',
        last_name: 'Torres'
      }
    },
    {
      id: '6',
      check_in_date: '2026-03-10T14:00:00',
      check_out_date: '2026-03-12T11:00:00',
      status: 'declined',
      total_amount: 9500,
      transaction_number: 'TXN-2026-006',
      listing: {
        title: 'Garden Villa',
        location: 'Baguio, Philippines',
        main_image_url: '/heroimage.png'
      },
      client: {
        first_name: 'Miguel',
        last_name: 'Fernandez'
      }
    }
  ];
};

const BookingPage: React.FC = () => {
  const [bookings] = useState<Booking[]>(generateMockBookings());
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Simulate loading
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
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

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'completed':
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

  const getStatusText = (status: BookingStatus, booking: Booking) => {
    if (status === 'pending-payment') {
      if (booking.payment) {
        return 'Payment Under Review';
      }
      return 'Awaiting payment';
    }
    
    switch (status) {
      case 'ongoing':
        return 'On-going';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleViewBooking = (bookingId: string) => {
    // Navigate to booking details - for now just console log
    console.log('View booking:', bookingId);
    // In a real app: router.push(`/booking-details/${bookingId}`)
  };

  const tabs: Array<{ key: BookingStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'pending-payment', label: 'Awaiting Payment' },
    { key: 'ongoing', label: 'On-going' },
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
                    No bookings found for the selected filter.
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
                              onClick={() => handleViewBooking(booking.id)}
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
                          onClick={() => handleViewBooking(booking.id)}
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
