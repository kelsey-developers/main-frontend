'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import HorizontalFilter from '../components/HorizontalFilter';
import DamagePenaltySection from './DamagePenaltySection';
import { filterDamageIncidents } from '../lib/filters';
import { defaultSalesReportFilters } from '../types';
import type { DamagePenalty, SalesReportFilters } from '../types';
import { exportDamagePenaltyToCsv, exportDamagePenaltyToPdf } from '../lib/exportDamagePenalty';
import { logExport } from '../lib/audit';

function DamagePenaltyPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-72 bg-gray-200 rounded-lg" />
      <div className="h-10 w-full max-w-md bg-gray-100 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-12 bg-gray-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-100 px-3 py-3">
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getDefaultViewFilters(): SalesReportFilters {
  return {
    ...defaultSalesReportFilters,
    filterMethod: 'quick',
    timePeriod: 'month',
    timePeriodScope: 'this',
    searchName: '',
    propertyType: 'All',
    location: 'All',
  };
}

export default function DamagePenaltyPage() {
  const [draftFilters, setDraftFilters] = useState<SalesReportFilters>(defaultSalesReportFilters);
  const [appliedFilters, setAppliedFilters] = useState<SalesReportFilters>(defaultSalesReportFilters);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [incidents, setIncidents] = useState<DamagePenalty[]>([]);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const exportPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportPanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target as Node)) {
        setExportPanelOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportPanelOpen]);

  const update = (key: keyof SalesReportFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);
  const effectiveFilters = filterEnabled ? appliedFilters : getDefaultViewFilters();

  const filteredIncidents = useMemo(
    () => filterDamageIncidents(incidents, effectiveFilters),
    [incidents, effectiveFilters],
  );

  const handleExportCsv = () => {
    setExportingCsv(true);
    try {
      exportDamagePenaltyToCsv(filteredIncidents);
      logExport('damage-penalty', 'csv', effectiveFilters, filteredIncidents.length);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      exportDamagePenaltyToPdf(filteredIncidents);
      logExport('damage-penalty', 'pdf', effectiveFilters, filteredIncidents.length);
    } catch (e) {
      console.error(e);
    } finally {
      setExportingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <FinancePageHeader
          title="Damage & penalty impact"
          description="View monthly losses due to damage (amounts charged vs absorbed) so finance can reconcile"
        />
        <DamagePenaltyPageSkeleton />
      </>
    );
  }

  return (
    <>
      <FinancePageHeader
        title="Damage & penalty impact"
        description="View monthly losses due to damage (amounts charged vs absorbed) so finance can reconcile"
      />
      <div className="mb-4 flex flex-1 min-w-0 gap-2">
        <input
          type="search"
          value={draftFilters.searchName}
          onChange={(e) => update('searchName', e.target.value)}
          placeholder="Search..."
          className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-colors"
          style={{ fontFamily: 'Poppins' }}
          aria-label="Search"
        />
        <div className="relative shrink-0" ref={exportPanelRef}>
          <button
            type="button"
            onClick={() => setExportPanelOpen((o) => !o)}
            disabled={filteredIncidents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: 'Poppins' }}
            aria-expanded={exportPanelOpen}
            aria-haspopup="true"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          {exportPanelOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  handleExportCsv();
                  setExportPanelOpen(false);
                }}
                disabled={exportingCsv || exportingPdf || filteredIncidents.length === 0}
                className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Poppins' }}
              >
                {exportingCsv ? 'Exporting…' : 'Export CSV'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportPdf();
                  setExportPanelOpen(false);
                }}
                disabled={exportingCsv || exportingPdf || filteredIncidents.length === 0}
                className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Poppins' }}
              >
                {exportingPdf ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFiltersPanelOpen((o) => !o)}
        className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        style={{ fontFamily: 'Poppins' }}
      >
        {filtersPanelOpen ? 'Hide filters' : 'Filters'}
      </button>
      <div className={`mt-4 ${filtersPanelOpen ? 'block' : 'hidden lg:block'}`}>
        <HorizontalFilter
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
          filterEnabled={filterEnabled}
          onFilterEnabledChange={setFilterEnabled}
          onApplyFilters={() => {
            if (filterEnabled) {
              setAppliedFilters(draftFilters);
            }
          }}
        />
      </div>
      <div className="mt-4">
        <DamagePenaltySection incidents={filteredIncidents} />
      </div>
    </>
  );
}
