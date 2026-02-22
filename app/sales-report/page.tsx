'use client';

import React, { useState, useMemo } from 'react';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import FilterSidebar from './components/FilterSidebar';
import SummaryCard from './components/SummaryCard';
import SalesTrendChart from './components/SalesTrendChart';
import RevenueByTypeChart from './components/RevenueByTypeChart';
import TopPerformingUnits from './components/TopPerformingUnits';
import { formatPHP } from './lib/format';
import {
  mockSummary,
  mockSalesTrend,
  mockRevenueByType,
  mockTopUnits,
} from './lib/mockData';
import type { SalesReportFilters } from './types';

const defaultFilters: SalesReportFilters = {
  searchName: '',
  propertyType: 'All',
  location: 'All',
  timePeriodStart: 'Jan',
  timePeriodEnd: 'Dec',
};

export default function SalesReportPage() {
  const [filters, setFilters] = useState<SalesReportFilters>(defaultFilters);

  const summaryValues = useMemo(() => {
    return {
      totalSales: formatPHP(mockSummary.totalSales),
      totalRevenue: formatPHP(mockSummary.totalRevenue),
      totalRent: formatPHP(mockSummary.totalRent),
    };
  }, []);

  return (
    <div className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-18">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left sidebar - Filters */}
          <FilterSidebar filters={filters} onFiltersChange={setFilters} />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                title="Total Sales"
                value={summaryValues.totalSales}
                description="Current Period"
                accentColor="green"
              />
              <SummaryCard
                title="Total Revenue"
                value={summaryValues.totalRevenue}
                description="Units rented"
                accentColor="blue"
              />
              <SummaryCard
                title="Total rent"
                value={summaryValues.totalRent}
                description="Units rented"
                accentColor="yellow"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesTrendChart data={mockSalesTrend} />
              <RevenueByTypeChart data={mockRevenueByType} />
            </div>

            {/* Top performing units */}
            <TopPerformingUnits units={mockTopUnits} />
          </div>
        </div>
      </div>
    </div>
  );
}
