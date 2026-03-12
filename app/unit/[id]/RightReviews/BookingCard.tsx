'use client';

import React from 'react';
import type { Listing } from '@/types/listing';

interface BookingCardProps {
  listing: Listing | null;
  isLoading: boolean;
  error?: string | null;
  onReserve: () => void;
}

/**
 * Convert HH:mm format (24-hour) to 12-hour format with AM/PM
 */
const formatTime12Hour = (time24?: string | null): string => {
  if (!time24 || typeof time24 !== 'string') return 'Not set';
  
  const trimmed = time24.trim();
  if (trimmed === '') return 'Not set';
  
  const parts = trimmed.split(':');
  if (parts.length !== 2) return 'Not set';
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 'Not set';
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  const mm = String(minutes).padStart(2, '0');
  
  return `${hour12}:${mm} ${period}`;
};

const BookingCard: React.FC<BookingCardProps> = ({ listing, isLoading, error, onReserve }) => {
  const [isLoggedIn] = React.useState(true); // Mock authentication state

  const handleReserveClick = () => {
    if (!isLoggedIn) {
      alert('Please log in to make a reservation');
      return;
    }
    onReserve();
  };

  if (isLoading) {
    return (
      <div className="w-full xl:w-96">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 top-24 animate-pulse">
          <div className="mb-6">
            <div className="h-6 bg-gray-300 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
          </div>
          <div className="mb-6">
            <div className="h-8 bg-gray-300 rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="h-4 bg-gray-300 rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-300 rounded w-20 animate-pulse"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-16 mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-300 rounded w-20 animate-pulse"></div>
              </div>
            </div>
            <div>
              <div className="h-4 bg-gray-300 rounded w-20 mb-2 animate-pulse"></div>
              <div className="h-5 bg-gray-300 rounded w-24 animate-pulse"></div>
            </div>
          </div>
          <div className="mb-6">
            <div className="h-5 bg-gray-300 rounded w-32 mb-3 animate-pulse"></div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-4 bg-gray-300 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-24 mb-3 animate-pulse"></div>
              <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 bg-gray-300 rounded w-20 animate-pulse"></div>
            <div className="h-5 bg-gray-300 rounded w-16 animate-pulse"></div>
          </div>
          <div className="h-12 bg-gray-300 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 top-24">
        <div className="text-red-500 text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>
            {error || 'Listing not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 top-24">
        {/* Header with Title and Type */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-2xl font-bold text-gray-900 flex-1" style={{fontFamily: 'Poppins', fontWeight: 700}}>
              {listing.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {listing.is_featured && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800" style={{fontFamily: 'Poppins'}}>
                Featured
              </span>
            )}
            <span className="text-sm text-gray-600" style={{fontFamily: 'Poppins'}}>
              {listing.property_type}
            </span>
          </div>
        </div>

        {/* Price Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900" style={{fontFamily: 'Poppins', fontWeight: 700}}>
              {listing.currency} {listing.price?.toLocaleString()}
            </span>
            <span className="text-base text-gray-600" style={{fontFamily: 'Poppins'}}>
              per {listing.price_unit}
            </span>
          </div>
        </div>

        {/* Check-in/Check-out and Guest Section */}
        <div className="mb-6 space-y-4">
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
            <h5 className="text-sm font-semibold mb-2 text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700}}>Stay Duration</h5>
            <div className="flex items-start gap-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-500">Check-in</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatTime12Hour(listing.check_in_time)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 border-l border-gray-200 pl-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-500">Check-out</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatTime12Hour(listing.check_out_time)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
            <h5 className="text-sm font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 700}}>Guest Limit</h5>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-base font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
                Up to {listing.max_capacity ?? listing.bedrooms + 1} guests
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-900" style={{fontFamily: 'Poppins', fontWeight: 700}}>Flexible Cancellation</h4>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed" style={{fontFamily: 'Poppins'}}>
              Free cancellation before check-in. After check-in, the reservation is non-refundable.
            </p>
          </div>
        </div>

        {/* Total Bill */}
        <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-200">
          <span className="text-lg font-bold text-gray-900" style={{fontFamily: 'Poppins', fontWeight: 700}}>Total Bill</span>
          <span className="text-2xl font-bold text-teal-700" style={{fontFamily: 'Poppins', fontWeight: 700}}>
            {listing.currency} {listing.price?.toLocaleString()}
          </span>
        </div>

        {!isLoggedIn ? (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-teal-700 font-medium" style={{fontFamily: 'Poppins'}}>
                Sign in required to make a reservation
              </p>
            </div>
            <button 
              disabled
              className="w-full bg-gray-400 text-white py-3 rounded-lg font-bold uppercase text-sm cursor-not-allowed"
              style={{fontFamily: 'Poppins', fontWeight: 700}}
            >
              Reserve
            </button>
          </div>
        ) : (
          <button 
            onClick={handleReserveClick} 
            className="w-full bg-teal-700 text-white py-3 rounded-lg font-bold uppercase text-sm hover:bg-teal-800 transition-colors cursor-pointer shadow-lg hover:shadow-xl"
            style={{fontFamily: 'Poppins', fontWeight: 700}}
          >
            Reserve
          </button>
        )}
      </div>
    </>
  );
};

export default BookingCard;
