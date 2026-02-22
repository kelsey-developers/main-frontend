'use client';

import React from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import BookingLinkedTable from '../components/BookingLinkedTable';
import { mockBookingLinkedRows } from '../lib/mockData';

export default function BookingsPage() {
  return (
    <>
      <FinancePageHeader
        title="Booking-linked data"
        description="For every booking: unit, dates, guest type, base price, discounts, extra heads, extra hours, add-ons (pool, towels, etc.)"
      />
      <BookingLinkedTable rows={mockBookingLinkedRows} />
    </>
  );
}
