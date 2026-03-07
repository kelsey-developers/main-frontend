'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { mockBookingLinkedRows } from '../../lib/mockData';
import { formatPHP, formatDateLong, formatTime, getNights, getBasePrice, getBookingTotal } from '../../lib/format';

export default function BookingDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const booking = id ? mockBookingLinkedRows.find((r) => r.id === id) : null;

  if (!id || !booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" style={{ fontFamily: 'Poppins' }}>
        <p className="text-gray-600 mb-4">Booking not found.</p>
        <Link
          href="/sales-report/finance/bookings"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
        >
          ← Back to Booking-linked data
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-8" style={{ fontFamily: 'Poppins' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#0B5858' }}>
              Booking Details
            </h1>
            <div className="flex items-center mt-2">
              <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-500">
                Booking ID: {booking.bookingId}
              </span>
            </div>
          </div>
          <Link
            href="/sales-report/finance/bookings"
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-gray-700"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Unit / Booking Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0B5858] uppercase tracking-wide">
                  {booking.guestType}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mt-1">
                {booking.unit}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDateLong(booking.checkIn)}{booking.checkInTime ? ` • ${formatTime(booking.checkInTime)}` : ''} – {formatDateLong(booking.checkOut)}{booking.checkOutTime ? ` • ${formatTime(booking.checkOutTime)}` : ''}
              </p>
            </div>
            <div className="w-full sm:w-44 flex-shrink-0">
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm">
                <div className="text-xs text-gray-500">Booking Reference</div>
                <div className="font-semibold text-gray-800 mt-1 break-words" style={{ wordBreak: 'break-word' }}>
                  {booking.bookingId}
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3">
                <div className='flex items-center justify-between'> 
                  <div className='text-xs text-gray-500'>Nights</div>
                  <div className='font-medium text-gray-800'>{getNights(booking.checkIn, booking.checkOut)}</div>
                </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500">Rate</div>
                    <div className="font-medium text-gray-800">{formatPHP(booking.rate)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="text-sm font-semibold mb-2">Duration</h5>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">Check-in</div>
                  <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>
                    {formatDateLong(booking.checkIn)}
                    {booking.checkInTime && (
                      <span className="text-gray-500"> • {formatTime(booking.checkInTime)}</span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">Check-out</div>
                  <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>
                    {formatDateLong(booking.checkOut)}
                    {booking.checkOutTime && (
                      <span className="text-gray-500"> • {formatTime(booking.checkOutTime)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Charges Summary */}
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-base font-semibold text-gray-800 mb-3">Charges Summary</h4>
            <div className="text-sm text-gray-700 space-y-3">
              <div className="flex justify-between">
                <span>Base price ({getNights(booking.checkIn, booking.checkOut)} night{getNights(booking.checkIn, booking.checkOut) !== 1 ? 's' : ''})</span>
                <span>{formatPHP(getBasePrice(booking.rate, booking.checkIn, booking.checkOut))}</span>
              </div>
              <div className="flex justify-between">
                <span>Discounts</span>
                <span className="text-red-600">-{formatPHP(booking.discounts)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra heads</span>
                <span>{formatPHP(booking.extraHeads)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra hours</span>
                <span>{formatPHP(booking.extraHours)}</span>
              </div>
              <div className="flex justify-between">
                <span>Add-ons{booking.addOns.length ? ` (${booking.addOns.join(', ')})` : ''}</span>
                <span>{formatPHP(booking.addOnsAmount)}</span>
              </div>
              <div className="border-t border-gray-200 mt-4 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-bold text-lg">{formatPHP(getBookingTotal(booking.rate, booking.checkIn, booking.checkOut, booking.discounts, booking.extraHeads, booking.extraHours, booking.addOnsAmount))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guest & Agent Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Guest Information */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="text-sm font-semibold text-gray-800 mb-3">Guest Information</h5>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" />
                    <path d="M4 20a8 8 0 0116 0H4z" />
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                      {booking.guest}
                    </div>
                    <div className="text-xs text-gray-500">Guest name</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8l8.5 6L20 8" />
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium capitalize">{booking.guestType}</div>
                    <div className="text-xs text-gray-500">Guest type</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Agent */}
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h5 className="text-sm font-semibold mb-3">Assigned Agent</h5>
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom right, #14b8a6, #0d9488)' }}
                >
                  <span className="text-white text-sm font-bold">
                    {booking.agent
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || '—'}
                  </span>
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                    {booking.agent}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Booking Agent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
