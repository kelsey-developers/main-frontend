'use client';

import type { SalesReportFilters } from '../types';
import { defaultSalesReportFilters } from '../types';

interface HorizontalFilterProps {
  filters: SalesReportFilters;
  onFiltersChange: (filters: SalesReportFilters) => void;
}

const PROPERTY_TYPES = ['All', 'Condo', 'Apartment', 'Penthouse', 'House'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LOCATIONS = ['All', 'Davao City', 'Manila', 'Cebu', 'Matina'];

const SYSTEM_START_YEAR = 2026;
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: Math.max(0, currentYear - SYSTEM_START_YEAR + 1) },
  (_, i) => String(currentYear - i)
);

const inputClass =
  'px-3 py-2 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors min-w-0';

const HorizontalFilter: React.FC<HorizontalFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const update = (key: keyof SalesReportFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const updateQuick = (updates: Partial<Pick<SalesReportFilters, 'filterMethod' | 'timePeriod' | 'timePeriodScope'>>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const btnActive = 'bg-white border-[#0B5858] text-gray-900 shadow-sm';
  const btnInactive = 'bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-50';
  const btnScopeActive = 'bg-teal-900 border-[#0B5858] text-white shadow-sm';

  return (
    <div className="w-full space-y-3">
      <section className="w-full p-3 min-[921px]:p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h2
        className="text-sm min-[921px]:text-base font-bold text-gray-900 mb-2 min-[921px]:mb-3"
        style={{ fontFamily: 'Poppins' }}
      >
        Filters
      </h2>
      <div className="flex flex-col min-[921px]:flex-row min-[921px]:flex-wrap items-stretch min-[921px]:items-end gap-3 min-[921px]:gap-4">
        {/* Unit Type */}
        <div className="flex flex-col gap-1 w-full min-w-0 min-[921px]:w-auto min-[921px]:min-w-[25vh]">
          <label
            htmlFor="horizontal-filter-unit-type"
            className="text-sm font-medium text-gray-700"
            style={{ fontFamily: 'Poppins' }}
          >
            Property Type
          </label>
          <select
            id="horizontal-filter-unit-type"
            value={filters.propertyType}
            onChange={(e) => update('propertyType', e.target.value)}
            className={inputClass + ' w-full'}
            style={{ fontFamily: 'Poppins' }}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1 w-full min-w-0 min-[921px]:w-auto min-[921px]:min-w-[25vh]">
          <label
            htmlFor="horizontal-filter-location"
            className="text-sm font-medium text-gray-700"
            style={{ fontFamily: 'Poppins' }}
          >
            Location
          </label>
          <select
            id="horizontal-filter-location"
            value={filters.location}
            onChange={(e) => update('location', e.target.value)}
            className={inputClass + ' w-full'}
            style={{ fontFamily: 'Poppins' }}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Time Period */}
        <div className="flex flex-col gap-3 w-full min-w-0 min-[921px]:flex-1">
          <div className="flex flex-col min-[921px]:flex-row min-[921px]:flex-wrap items-stretch min-[921px]:items-center gap-3 min-[921px]:gap-2">
            <div className="flex flex-col gap-1 w-full min-[921px]:w-auto">
              <span className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>Time Period</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQuick({ filterMethod: 'quick' })}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    filters.filterMethod === 'quick' ? btnActive : btnInactive
                  }`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  Quick Select
                </button>
                <button
                  type="button"
                  onClick={() => updateQuick({ filterMethod: 'custom' })}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    filters.filterMethod === 'custom' ? btnActive : btnInactive
                  }`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  Custom Filter
                </button>
              </div>
            </div>

            {filters.filterMethod === 'custom' ? (
              <div className="flex flex-col min-[921px]:flex-row flex-wrap items-stretch min-[921px]:items-end gap-3 min-[921px]:gap-2 w-full min-[921px]:flex-1 min-w-0">
                <div className="flex flex-col gap-1 w-full min-[921px]:flex-1 min-w-0 min-[921px]:min-w-[70px]">
                  <span className="text-sm font-medium text-gray-600">Start</span>
                  <div className="flex gap-1.5 min-w-0">
                    <select
                      value={filters.timePeriodStart}
                      onChange={(e) => update('timePeriodStart', e.target.value)}
                      className={inputClass + ' flex-1 min-w-0'}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <option value="" disabled>Month</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={filters.timePeriodStartYear}
                      onChange={(e) => update('timePeriodStartYear', e.target.value)}
                      className={inputClass + ' flex-1 min-w-0'}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <option value="" disabled>Year</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-full min-[921px]:flex-1 min-w-0 min-[921px]:min-w-[70px]">
                  <span className="text-sm font-medium text-gray-600">End</span>
                  <div className="flex gap-1.5 min-w-0">
                    <select
                      value={filters.timePeriodEnd}
                      onChange={(e) => update('timePeriodEnd', e.target.value)}
                      className={inputClass + ' flex-1 min-w-0'}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <option value="" disabled>Month</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={filters.timePeriodEndYear}
                      onChange={(e) => update('timePeriodEndYear', e.target.value)}
                      className={inputClass + ' flex-1 min-w-0'}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <option value="" disabled>Year</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-[921px]:flex-row flex-wrap items-stretch min-[921px]:items-center gap-3 min-[921px]:gap-2 w-full min-[921px]:flex-1 min-w-0">
                <div className="flex flex-col gap-1 w-full min-[921px]:flex-1 min-w-0 min-[921px]:min-w-[80px]">
                  <span className="text-sm font-medium text-gray-600">View by</span>
                  <select
                    value={filters.timePeriod}
                    onChange={(e) => updateQuick({ timePeriod: e.target.value as 'week' | 'month' | 'year' })}
                    className={inputClass + ' w-full'}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 w-full min-[921px]:flex-1 min-w-0 min-[921px]:min-w-[80px]">
                  <span className="text-sm font-medium text-gray-600">Scope</span>
                  <select
                    value={filters.timePeriodScope}
                    onChange={(e) => updateQuick({ timePeriodScope: e.target.value as 'this' | 'last' })}
                    className={inputClass + ' w-full'}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    <option value="this">This {filters.timePeriod === 'week' ? 'week' : filters.timePeriod === 'month' ? 'month' : 'year'}</option>
                    <option value="last">Last {filters.timePeriod === 'week' ? 'week' : filters.timePeriod === 'month' ? 'month' : 'year'}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          onClick={() => onFiltersChange({ ...defaultSalesReportFilters })}
          className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none transition-colors"
          style={{ fontFamily: 'Poppins' }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => onFiltersChange({ ...filters })}
          className="px-4 py-2.5 rounded-lg border border-transparent bg-[#0B5858] text-white text-sm font-medium shadow-sm hover:bg-[#0B5858]/90 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none transition-colors"
          style={{ fontFamily: 'Poppins' }}
        >
          Set filter
        </button>
      </div>
    </div>
  );
};

export default HorizontalFilter;
