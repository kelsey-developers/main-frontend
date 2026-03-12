'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { getBookingById } from '@/lib/api/bookings';

interface BookingDetails {
  id: string;
  reference_code?: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_guests: number;
  excess_pax_charge?: number;
  unit_charge: number;
  amenities_charge?: number;
  service_charge?: number;
  discount?: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'pending-payment' | 'booked' | 'ongoing' | 'completed' | 'declined' | 'cancelled';
  landmark: string;
  parking_info: string;
  notes: string;
  listing: {
    id: string;
    title: string;
    location: string;
    main_image_url: string;
    property_type: string;
    check_in_time?: string;
    check_out_time?: string;
    latitude: number;
    longitude: number;
  };
  agent: {
    id: string;
    fullname: string;
    email: string;
    profile_photo?: string;
  };
  client: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
  };
  payment?: {
    payment_method: string;
    reference_number: string;
    payment_status: string;
    bank_name?: string;
    depositor_name?: string;
    company_name?: string;
  };
}

function BookingDetailsContent() {
  const params = useParams();
  const reference = (params?.reference as string) || '';

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!reference) {
      setError({ message: 'No booking reference provided' });
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function fetchBooking() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getBookingById(reference);

        if (!mounted) return;

        if (!data) {
          setError({ status: 404, message: 'Booking not found' });
          setBooking(null);
          return;
        }

        setBooking(data as unknown as BookingDetails);
      } catch (err) {
        if (mounted) {
          const status = (err as Error & { status?: number }).status;
          const message = err instanceof Error ? err.message : 'Failed to load booking';
          setError({ status: status ?? 500, message });
          setBooking(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchBooking();
    return () => { mounted = false; };
  }, [reference]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="pt-20 pb-8 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-[#0B5858] rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>Loading booking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    const isForbidden = error?.status === 403;
    const isNotFound = error?.status === 404;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="pt-20 pb-8 flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              {isForbidden ? (
                <svg className="w-16 h-16 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins' }}>
              {isForbidden ? 'Access Denied' : isNotFound ? 'Booking Not Found' : 'Error'}
            </h1>
            <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'Poppins' }}>
              {error?.message || 'Something went wrong.'}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-[#0B5858] text-white rounded-md hover:bg-[#0a4a4a]"
              style={{ fontFamily: 'Poppins' }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getAgentInitials = (fullname: string) => {
    const names = fullname.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const hasValidPhoto = (photoUrl?: string) => {
    if (!photoUrl) return false;
    if (typeof photoUrl !== 'string') return false;
    const trimmed = photoUrl.trim();
    return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
  };

  const handleImageError = (errorKey: string) => {
    setImageErrors(prev => ({ ...prev, [errorKey]: true }));
  };

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const timeParts = time.split(':');
    if (timeParts.length < 2) return time;
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    const period = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours = hours - 12;
    }
    
    return `${hours}:${minutes} ${period}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F1C40F';
      case 'pending-payment':
        return '#2A7F9E';
      case 'booked':
      case 'ongoing':
      case 'completed':
        return '#0B5858';
      case 'declined':
      case 'cancelled':
        return '#B84C4C';
      default:
        return '#10B981';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'pending-payment') {
      if (booking.payment) {
        return 'Payment Under Review';
      }
      return 'Awaiting Payment';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="pt-20 pb-8 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{color: '#0B5858', fontFamily: 'Poppins'}}>
                  Booking Details
                </h1>
                <div className="flex items-center mt-2">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-500" style={{fontFamily: 'Poppins'}}>
                    Booking ID: {booking.reference_code || booking.id}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  style={{fontFamily: 'Poppins'}}
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Header */}
              <div className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
                <div className="w-36 h-24 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={booking.listing.main_image_url}
                    alt={booking.listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0B5858] uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                      {booking.listing.property_type}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 truncate" style={{ fontFamily: 'Poppins' }}>
                    {booking.listing.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1 truncate" style={{ fontFamily: 'Poppins' }}>
                    {booking.listing.location}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600" style={{ fontFamily: 'Poppins' }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                        <path d="M6 22v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                        <path d="M18 22v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                      <span>{booking.total_guests} guest{booking.total_guests !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Booking meta card */}
                <div className="ml-2 w-44 flex-shrink-0">
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm" style={{ fontFamily: 'Poppins' }}>
                    <div className="text-xs text-gray-500">Booking Reference</div>
                    <div className="font-semibold text-gray-800 mt-1 break-words" style={{ wordBreak: 'break-word' }}>{booking.reference_code || booking.id}</div>

                    <div className="border-t border-gray-100 mt-3 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">Nights</div>
                        <div className="font-medium text-gray-800">{booking.nights}</div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">Rate</div>
                        <div className="font-medium text-gray-800">{formatCurrency(booking.unit_charge)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charges Summary */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="text-base font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>Charges Summary</h4>

                <div className="text-sm text-gray-700 space-y-3" style={{ fontFamily: 'Poppins' }}>
                  <div className="flex justify-between">
                    <span>Unit Charge ({booking.nights} night{booking.nights !== 1 ? 's' : ''})</span>
                    <span>{formatCurrency(booking.unit_charge * booking.nights)}</span>
                  </div>

                  {(booking.excess_pax_charge ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Excess guest charges (over capacity)</span>
                      <span>{formatCurrency(booking.excess_pax_charge || 0)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Amenities / Additional Services</span>
                    <span>{formatCurrency(booking.amenities_charge || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Discounts</span>
                    <span className="text-gray-600">-{formatCurrency(booking.discount || 0)}</span>
                  </div>

                  <div className="border-t border-gray-200 mt-4 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Grand Total</span>
                      <span className="font-bold text-lg">{formatCurrency(booking.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client / Agent / Payment Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client Info */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>Client Information</h5>

                  <div className="space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"></path>
                        <path d="M4 20a8 8 0 0116 0H4z"></path>
                      </svg>
                      <div className="min-w-0">
                        <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                          {[booking.client?.first_name, booking.client?.last_name].filter(Boolean).join(' ') || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Full name</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 8l8.5 6L20 8"></path>
                        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                      </svg>
                      <div className="min-w-0">
                        <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{booking.client?.email || 'N/A'}</div>
                        <div className="text-xs text-gray-500">Email</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 16.92V21a1 1 0 01-1.11 1 19.86 19.86 0 01-8.63-3.07 19.89 19.89 0 01-6-6A19.86 19.86 0 013 3.11 1 1 0 014 2h4.09a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.24 1.02L9.7 9.7a12 12 0 006.6 6.6l1.4-1.4a1 1 0 011.02-.24l3.6 1.2c.43.14.71.56.68.99z"></path>
                      </svg>
                      <div className="min-w-0">
                        <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{booking.client?.contact_number || 'N/A'}</div>
                        <div className="text-xs text-gray-500">Phone</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>Payment Information</h5>
                  <div className="space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                    {booking.payment ? (
                      <>
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                            <path d="M2 10h20" fill="currentColor" />
                          </svg>
                          <div className="min-w-0">
                            <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                              {booking.payment.payment_method.charAt(0).toUpperCase() + booking.payment.payment_method.slice(1).replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-500">Payment method</div>
                          </div>
                        </div>

                        {booking.payment.bank_name && (
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 10h18"></path>
                              <path d="M12 3v6"></path>
                            </svg>
                            <div className="min-w-0">
                              <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                                {booking.payment.bank_name}
                              </div>
                              <div className="text-xs text-gray-500">Bank</div>
                            </div>
                          </div>
                        )}

                        {booking.payment.depositor_name && (
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"></path>
                              <path d="M4 20a8 8 0 0116 0H4z"></path>
                            </svg>
                            <div className="min-w-0">
                              <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                                {booking.payment.depositor_name}
                              </div>
                              <div className="text-xs text-gray-500">Depositor name</div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const depositAmt = (booking.payment as { deposit_amount?: number })?.deposit_amount ?? 0;
                          return depositAmt > 0 && (
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div className="min-w-0">
                                <div className="font-medium">
                                  {formatCurrency(depositAmt)}
                                </div>
                                <div className="text-xs text-gray-500">Deposit / Amount</div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500">Payment Status</div>
                          <div className="text-sm font-medium text-gray-800 capitalize">{booking.payment.payment_status}</div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                          <path d="M2 10h20" fill="currentColor" />
                        </svg>
                        <div className="min-w-0">
                          <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                            Not specified
                          </div>
                          <div className="text-xs text-gray-500">Payment information not available</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Agent */}
                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                  <h5 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>Assigned Agent</h5>
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{
                        background: hasValidPhoto(booking.agent.profile_photo)
                          ? 'transparent'
                          : 'linear-gradient(to bottom right, #14b8a6, #0d9488)'
                      }}
                    >
                      {hasValidPhoto(booking.agent.profile_photo) ? (
                        <img
                          src={booking.agent.profile_photo}
                          alt={booking.agent.fullname}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError('agent-main')}
                        />
                      ) : (
                        <span 
                          className="text-white text-sm font-bold" 
                          style={{ fontFamily: 'Poppins', fontWeight: 700 }}
                        >
                          {getAgentInitials(booking.agent.fullname)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 text-sm" style={{ fontFamily: 'Poppins' }}>
                      <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                        {booking.agent.fullname}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Booking Agent</div>
                      {booking.agent.email && (
                        <div className="text-xs text-gray-500 mt-1 break-words" style={{ wordBreak: 'break-word' }}>
                          {booking.agent.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4">
              {/* Status */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Status</h5>
                  <div 
                    className="text-sm font-medium flex items-center gap-2"
                    style={{ color: getStatusColor(booking.status) }}
                  >
                    {booking.status === 'pending' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {booking.status === 'booked' && (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {getStatusText(booking.status)}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Duration</h5>
                <div className="text-sm text-gray-700 space-y-2" style={{ fontFamily: 'Poppins' }}>
                  <div>
                    <div className="text-xs text-gray-500">Check-in</div>
                    <div className="break-words" style={{ wordBreak: 'break-word' }}>
                      {formatDate(booking.check_in_date)}
                      {booking.listing.check_in_time && (
                        <span className="text-gray-500"> • {formatTime(booking.listing.check_in_time)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Check-out</div>
                    <div className="break-words" style={{ wordBreak: 'break-word' }}>
                      {formatDate(booking.check_out_date)}
                      {booking.listing.check_out_time && (
                        <span className="text-gray-500"> • {formatTime(booking.listing.check_out_time)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Location</h5>

                <div>
                  {booking.listing.latitude && booking.listing.longitude ? (
                    <div className="w-full overflow-hidden rounded" style={{ borderRadius: 8 }}>
                      <iframe
                        title="Booking location map"
                        src={`https://www.google.com/maps?q=${booking.listing.latitude},${booking.listing.longitude}&output=embed`}
                        width="100%"
                        height={200}
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Map not available. Coordinates missing.</div>
                  )}

                  <div className="mt-4 space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                        <circle cx="12" cy="9" r="1.5" fill="currentColor"></circle>
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Coordinates</div>
                        <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>
                          {booking.listing.latitude && booking.listing.longitude 
                            ? `${booking.listing.latitude}, ${booking.listing.longitude}`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {booking.landmark && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M6 6h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <div>
                          <div className="text-xs text-gray-500">Landmark</div>
                          <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>{booking.landmark}</div>
                        </div>
                      </div>
                    )}

                    {booking.parking_info && (
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 7h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                          <path d="M6 11h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <div>
                          <div className="text-xs text-gray-500">Parking</div>
                          <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>{booking.parking_info}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {booking.listing.latitude && booking.listing.longitude && (
                    <div className="mt-3 text-sm">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.listing.latitude},${booking.listing.longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-[#0B5858] hover:underline"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BookingDetailsPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-[#0B5858] rounded-full animate-spin" />
      </div>
    }>
      <BookingDetailsContent />
    </Suspense>
  );
};

export default BookingDetailsPage;
