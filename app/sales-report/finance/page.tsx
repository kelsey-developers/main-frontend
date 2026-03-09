'use client';

import React, { useState } from 'react';
import FilterSidebar from './components/FilterSidebar';
import FinanceDashboardLinks from './components/FinanceDashboardLinks';
import FinanceSummaryCards from './components/FinanceSummaryCards';
import SalesTrendChart from './components/SalesTrendChart';
import RevenueByTypeChart from './components/RevenueByTypeChart';

import {
  mockDashboardSummary,
  mockSalesTrend,
  mockRevenueByProperty,
  mockRevenueByChannel,
  mockRevenueByAgent,
  mockRevenueByType,
  mockTopUnits,
} from './lib/mockData';
import type { SalesReportFilters } from './types';

const defaultFilters: SalesReportFilters = {
  searchName: '',
  propertyType: 'All',
  location: 'All',
  filterMethod: 'quick',
  timePeriod: 'week',
  timePeriodScope: 'this',
  timePeriodStart: '',
  timePeriodStartYear: '',
  timePeriodEnd: '',
  timePeriodEndYear: '',
};

export default function SalesReportPage() {
  const [filters, setFilters] = useState<SalesReportFilters>(defaultFilters);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="  mx-auto px-4 sm:px-6 lg:px-8 pb-18 bg-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins' }}>
              Finance dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-600" style={{ fontFamily: 'Poppins' }}>
              Revenue overview, booking-linked data, charges & add-ons, damage impact, and export for accounting
            </p>
          </div>
          {/* Mobile: show Filters toggle */}
          <button
            type="button"
            onClick={() => setFiltersPanelOpen((o) => !o)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontFamily: 'Poppins' }}
          >
            {filtersPanelOpen ? 'Hide filters' : 'Filters'}
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left sidebar - Filters only; on mobile visible when toggled. Feature links at bottom on mobile. */}
          <aside
            className={`w-full lg:w-72 flex-shrink-0 ${filtersPanelOpen ? 'block' : 'hidden lg:block'}`}
          >
            <div className="space-y-6">
              <FilterSidebar filters={filters} onFiltersChange={setFilters} />
              {/* Feature links only in sidebar on desktop; hidden in aside on mobile */}
              <div className="max-lg:hidden lg:block">
                <FinanceDashboardLinks />
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Summary cards */}
            <FinanceSummaryCards summary={mockDashboardSummary} />

            {/* Sales trend row */}
            <SalesTrendChart data={mockSalesTrend} />

            {/* Revenue breakdown row */}
            <RevenueByTypeChart
              byProperty={mockRevenueByProperty}
              byChannel={mockRevenueByChannel}
              byAgent={mockRevenueByAgent}
              byType={mockRevenueByType}
            />

            {/* Feature links at bottom on mobile; on desktop they stay in the sidebar */}
            <div className="lg:hidden pt-4">
              <FinanceDashboardLinks />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
