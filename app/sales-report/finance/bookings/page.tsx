'use client';

import React, { useMemo, useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import HorizontalFilter from '../components/HorizontalFilter';
import BookingLinkedTable from '../components/BookingLinkedTable';
import { mockBookingLinkedRows } from '../lib/mockData';
import { filterBookingRows } from '../lib/filters';
import { defaultSalesReportFilters } from '../types';
import type { SalesReportFilters } from '../types';

export default function BookingsPage() {
  const [filters, setFilters] = useState<SalesReportFilters>(defaultSalesReportFilters);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const update = (key: keyof SalesReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const filteredRows = useMemo(() => filterBookingRows(mockBookingLinkedRows, filters), [filters]);
  return (
    <>
      <FinancePageHeader
        title="Booking-linked data"
        description="For every booking: unit, dates, guest type, base price, discounts, extra heads, extra hours, add-ons"
      />

      <div className="mb-4">
        <input
          type="search"
          value={filters.searchName}
          onChange={(e) => update('searchName', e.target.value)}
          placeholder="Search..."
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
          style={{ fontFamily: 'Poppins' }}
          aria-label="Search"
        />
      </div>
      <button 
      type="button" 
      onClick={() => setFiltersPanelOpen((o) => !o)} 
      className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white 
      shadow-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
        {filtersPanelOpen ? 'Hide filters' : 'Filters'}
      </button>
      <div className={`mt-4 ${filtersPanelOpen ? 'block' : 'hidden lg:block'}`}>
        <HorizontalFilter filters={filters} onFiltersChange={setFilters} />
      </div>
      <div className="mt-4">
        <BookingLinkedTable rows={filteredRows} />
      </div>  
    </>
  );
}
