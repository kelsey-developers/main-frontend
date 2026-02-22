'use client';

import React from 'react';
import type { SalesReportFilters } from '../types';

interface FilterSidebarProps {
  filters: SalesReportFilters;
  onFiltersChange: (filters: SalesReportFilters) => void;
}

const PROPERTY_TYPES = ['All', 'Condo', 'Apartment', 'Penthouse', 'House'];
const LOCATIONS = ['All', 'Davao City', 'Manila', 'Cebu', 'Matina'];

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
}) => {
  const update = (key: keyof SalesReportFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <h2
        className="text-xl font-bold text-gray-900 mb-4"
        style={{ fontFamily: 'Poppins' }}
      >
        Filters
      </h2>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="search-name"
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{ fontFamily: 'Poppins' }}
          >
            Search by name
          </label>
          <input
            id="search-name"
            type="text"
            value={filters.searchName}
            onChange={(e) => update('searchName', e.target.value)}
            placeholder="Search..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <div>
          <label
            htmlFor="property-type"
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{ fontFamily: 'Poppins' }}
          >
            Property Type
          </label>
          <select
            id="property-type"
            value={filters.propertyType}
            onChange={(e) => update('propertyType', e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
            style={{ fontFamily: 'Poppins' }}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{ fontFamily: 'Poppins' }}
          >
            Location
          </label>
          <select
            id="location"
            value={filters.location}
            onChange={(e) => update('location', e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
            style={{ fontFamily: 'Poppins' }}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1"
            style={{ fontFamily: 'Poppins' }}
          >
            Time Period
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.timePeriodStart}
              onChange={(e) => update('timePeriodStart', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="Jan">Jan</option>
              <option value="Feb">Feb</option>
              <option value="Mar">Mar</option>
              <option value="Apr">Apr</option>
              <option value="May">May</option>
              <option value="Jun">Jun</option>
              <option value="Jul">Jul</option>
              <option value="Aug">Aug</option>
              <option value="Sep">Sep</option>
              <option value="Oct">Oct</option>
              <option value="Nov">Nov</option>
              <option value="Dec">Dec</option>
            </select>
            <select
              value={filters.timePeriodEnd}
              onChange={(e) => update('timePeriodEnd', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="Jan">Jan</option>
              <option value="Feb">Feb</option>
              <option value="Mar">Mar</option>
              <option value="Apr">Apr</option>
              <option value="May">May</option>
              <option value="Jun">Jun</option>
              <option value="Jul">Jul</option>
              <option value="Aug">Aug</option>
              <option value="Sep">Sep</option>
              <option value="Oct">Oct</option>
              <option value="Nov">Nov</option>
              <option value="Dec">Dec</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
