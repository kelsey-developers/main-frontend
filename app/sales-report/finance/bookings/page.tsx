'use client';

import React, { useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import HorizontalFilter from '../components/HorizontalFilter';
import BookingLinkedTable from '../components/BookingLinkedTable';
import { mockBookingLinkedRows } from '../lib/mockData';
import { defaultSalesReportFilters } from '../types';
import type { SalesReportFilters } from '../types';

export default function BookingsPage() {
  const [filters, setFilters] = useState<SalesReportFilters>(defaultSalesReportFilters);

  return (
    <>
      <FinancePageHeader
        title="Booking-linked data"
        description="For every booking: unit, dates, guest type, base price, discounts, extra heads, extra hours, add-ons (pool, towels, etc.)"
      />
      <HorizontalFilter filters={filters} onFiltersChange={setFilters} />
      <div className="mt-4">
        <BookingLinkedTable rows={mockBookingLinkedRows} />
      </div>
    </>
  );
}
