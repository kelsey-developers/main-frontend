'use client';

import type { SalesReportFilters } from '../types';
import { defaultSalesReportFilters } from '../types';

interface FilterSidebarProps {
  filters: SalesReportFilters;
  onFiltersChange: (filters: SalesReportFilters) => void;
  filterEnabled: boolean;
  onFilterEnabledChange: (enabled: boolean) => void;
  onApplyFilters: () => void;
}

const PROPERTY_TYPES = ['All', 'Condo', 'Apartment', 'Penthouse', 'House'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LOCATIONS = ['All', 'Davao City', 'Manila', 'Cebu', 'Matina'];

/** Year the system was launched; year list runs from this up to current year and grows each year */
const SYSTEM_START_YEAR = 2026;
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: Math.max(0, currentYear - SYSTEM_START_YEAR + 1) },
  (_, i) => String(currentYear - i)
);

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  filterEnabled,
  onFilterEnabledChange,
  onApplyFilters,
}) => {
  const update = (key: keyof SalesReportFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };
  const updateQuick = (updates: Partial<Pick<SalesReportFilters, 'filterMethod' | 'timePeriod' | 'timePeriodScope'>>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  return (
    <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
    <div className="w-full">
      <div className="flex flex-row gap-2 justify-between items-center">
        <h2
          className="text-xl font-bold text-gray-900 mb-1"
          style={{ fontFamily: 'Poppins' }}
        >
          Filters
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium text-gray-600 select-none"
            style={{ fontFamily: 'Poppins' }}
          >
            {filterEnabled ? 'On' : 'Off'}
          </span>
          <button
            type="button"
            onClick={() => onFilterEnabledChange(!filterEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              filterEnabled ? 'bg-[#0B5858]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                filterEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
      <div className="space-y-4">
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
            value={filterEnabled ? filters.propertyType : ''}
            onChange={(e) => update('propertyType', e.target.value)}
            disabled={!filterEnabled}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Poppins' }}
          >
            {!filterEnabled && (
              <option value=""></option>
            )}
            {filterEnabled &&
              PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
          <div className="border-b-2  border-gray-300 py-2"></div>
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
            value={filterEnabled ? filters.location : ''}
            onChange={(e) => update('location', e.target.value)}
            disabled={!filterEnabled}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Poppins' }}
          >
            {!filterEnabled && (
              <option value=""></option>
            )}
            {filterEnabled &&
              LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
          </select>
          <div className="border-b-2 border-gray-300 py-2"></div>
        </div>
        <div>
          <label
            className={`block text-sm font-medium mb-1 ${filterEnabled ? 'text-gray-700' : 'text-gray-400'}`}
            style={{ fontFamily: 'Poppins' }}
          >
            Time Period
          </label>
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 rounded-lg p-2 grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => filterEnabled && updateQuick({ filterMethod: 'quick' })}
                disabled={!filterEnabled}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  !filterEnabled
                    ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed'
                    : filters.filterMethod === 'quick'
                      ? 'bg-white border-[#0B5858] text-gray-900 shadow-sm'
                      : 'bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                Quick Select
              </button>
              <button
                type="button"
                onClick={() => filterEnabled && updateQuick({ filterMethod: 'custom' })}
                disabled={!filterEnabled}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  !filterEnabled
                    ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed'
                    : filters.filterMethod === 'custom'
                      ? 'bg-white border-[#0B5858] text-gray-900 shadow-sm '
                      : 'bg-gray-200 border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                Custom Filter
              </button>
            </div>
          </div>
          {filterEnabled && filters.filterMethod === 'custom' ? (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>Start Date</p>
            </div>
            <select
              value={filters.timePeriodStart}
              onChange={(e) => update('timePeriodStart', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="" disabled>Month</option>
              {MONTHS.map((Months) => (
                <option key={Months} value={Months}>
                  {Months}
                </option>
              ))}
            </select>
            <select
              value={filters.timePeriodStartYear}
              onChange={(e) => update('timePeriodStartYear', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="" disabled>Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Poppins' }}>End Date</p>
            </div>
            <select
              value={filters.timePeriodEnd}
              onChange={(e) => update('timePeriodEnd', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="" disabled>Month</option>
              {MONTHS.map((Months) => (
                <option key={Months} value={Months}>
                  {Months}
                </option>
              ))}
            </select>
            <select
              value={filters.timePeriodEndYear}
              onChange={(e) => update('timePeriodEndYear', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              <option value="" disabled>Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          ) : (
            <div className="flex flex-col gap-2 py-3">
            <p className={`text-sm font-medium ${filterEnabled ? 'text-gray-700' : 'text-gray-400'}`} style={{ fontFamily: 'Poppins' }}>View By</p>
            <select
              value={filterEnabled ? filters.timePeriod : ''}
              onChange={(e) => updateQuick({ timePeriod: e.target.value as 'week' | 'month' | 'year' })}
              disabled={!filterEnabled}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins' }}
            >
              {!filterEnabled && <option value=""></option>}
              {filterEnabled && (
                <>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </>
              )}
            </select>
            <select
              value={filterEnabled ? filters.timePeriodScope : ''}
              onChange={(e) => updateQuick({ timePeriodScope: e.target.value as 'this' | 'last' })}
              disabled={!filterEnabled}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins' }}
            >
              {!filterEnabled && <option value=""></option>}
              {filterEnabled && (
                <>
                  <option value="this">This {filters.timePeriod === 'week' ? 'week' : filters.timePeriod === 'month' ? 'month' : 'year'}</option>
                  <option value="last">Last {filters.timePeriod === 'week' ? 'week' : filters.timePeriod === 'month' ? 'month' : 'year'}</option>
                </>
              )}
            </select>
          </div>
          )}
        </div>
      </div>
    </div>
      <div className="flex flex-row gap-2 justify-end">
        <button
          type="button"
          onClick={() => onFiltersChange({ ...defaultSalesReportFilters })}
          disabled={!filterEnabled}
          className="px-4 py-2.5 w-full rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Poppins' }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApplyFilters}
          disabled={!filterEnabled}
          className="px-4 py-2.5 w-full rounded-lg border border-transparent bg-[#0B5858] text-white text-sm font-medium shadow-sm hover:bg-[#0B5858]/90 focus:ring-2 focus:ring-[#0B5858]/20 focus:outline-none transition-colors disabled:bg-gray-300 disabled:text-gray-100 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Poppins' }}
        >
          Set filter
        </button>
      </div>
    </div>
  );
};

export default FilterSidebar;
