'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { BookingLinkedRow } from '../../types';
import { formatPHP, formatDateLong, formatTime, getNights, getBasePrice, getBookingTotal } from '../../lib/format';
import { fetchFinanceBookingById } from '../../lib/financeDataService';

function BookingDetailSkeleton() {
  return (
    <div className="pb-8 animate-pulse" style={{ fontFamily: 'Poppins' }}>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-9 w-64 bg-gray-200 rounded-lg mb-2" />
            <div className="h-5 w-40 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-24 bg-gray-200 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="w-full sm:w-37 h-54 sm:h-30 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
            </div>
            <div className="w-full sm:w-44 h-24 bg-gray-100 rounded-lg" />
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-100 rounded-lg" />
              <div className="h-16 bg-gray-100 rounded-lg" />
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
            <div className="h-5 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
            <div className="h-4 w-1/2 bg-gray-100 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded mt-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white h-32 bg-gray-50" />
            <div className="border border-gray-200 rounded-lg p-4 bg-white h-32 bg-gray-50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user } = useAuth();
  const currentUser = user ? { userId: user.id, email: user.email, role: user.roles?.[0] } : null;
  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState<BookingLinkedRow | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = await fetchFinanceBookingById(id, currentUser);
        if (mounted) setBooking(data);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, currentUser?.userId ?? null, currentUser?.email ?? null, currentUser?.role ?? null]);

  if (isLoading) {
    return <BookingDetailSkeleton />;
  }

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
            {booking.imageUrl && (
              <div className="flex-shrink-0 w-full sm:w-37 h-54 sm:h-30 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={booking.imageUrl}
                  alt={booking.unit}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#0B5858] uppercase tracking-wide">
                  {booking.unitType ?? '—'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mt-1">
                {booking.unit}
              </h3>
              {booking.location && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {booking.location}
                </p>
              )}
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
              {(booking.addOnsWithPrice?.length ?? 0) > 0 ? (
                <>
                  <div className="font-semibold text-md text-gray-700 mb-2">Add-ons</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {(booking.addOnsWithPrice ?? []).map((item) => (
                      <li key={item.name} className="flex justify-between gap-4">
                        <span>- {item.name}</span>
                        <span>{formatPHP(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-500">Add-ons subtotal</span>
                    <span>{formatPHP(booking.addOnsAmount)}</span>
                  </div>
                </>
              ) : booking.addOns.length > 0 ? (
                <>
                  <div className="font-medium text-gray-700 mb-1">Add-ons</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {booking.addOns.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Add-ons total</span>
                    <span>{formatPHP(booking.addOnsAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>Add-ons</span>
                  <span>{formatPHP(booking.addOnsAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 mt-4 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-bold text-lg">
                    {formatPHP(
                      booking.totalAmount != null
                        ? booking.totalAmount
                        : getBookingTotal(booking.rate, booking.checkIn, booking.checkOut, booking.discounts, booking.extraHeads, booking.extraHours, booking.addOnsAmount)
                    )}
                  </span>
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
                    <div className="font-medium capitalize">{booking.unitType ?? '—'}</div>
                    <div className="text-xs text-gray-500">Property type</div>
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
                    {((booking.agent ?? '—').split(/\s+/).filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()) || '—'}
                  </span>
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                    {booking.agent ?? '—'}
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
