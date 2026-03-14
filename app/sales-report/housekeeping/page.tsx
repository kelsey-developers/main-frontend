  'use client';

  import React, { useState, useEffect } from 'react';
  import Link from 'next/link';
  import { useSearchParams } from 'next/navigation';
  import HousekeepingStockOutModal from './components/HousekeepingStockOutModal';

  const HOUSEKEEPING_BASE = '/sales-report/housekeeping';

  function HousekeepingDashboardSkeleton() {
    return (
      <div style={{ fontFamily: 'Poppins' }} className="animate-pulse">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-9 w-72 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-96 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex justify-center py-16">
          <div className="flex flex-col sm:flex-row gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }



  export default function HousekeepingDashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      if (searchParams.get('open') === 'stock-out') {
        setStockOutModalOpen(true);
        window.history.replaceState({}, '', HOUSEKEEPING_BASE);
      }
    }, [searchParams]);

    if (isLoading) {
      return <HousekeepingDashboardSkeleton />;
    }

    return (
      <div style={{ fontFamily: 'Poppins' }}>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Housekeeping
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Access features to manage housekeeping operations.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl md:max-w-6xl mx-auto py-8 px-4 sm:px-0">
          <button
            type="button"
            onClick={() => setStockOutModalOpen(true)}
            className="col-span-1 bg-white/90 rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-lg hover:border-[#0B5858]/30 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 min-h-[300px]"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#0B5858]/10 text-[#0B5858] ring-2 ring-[#0B5858]/10 my-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h2 className="text-lg mt-2 sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">Stock out</h2>
            <p className="text-sm mt-4 sm:text-base text-gray-600">Get items for a unit from warehouse, to and reflect in the unit</p>
          </button>
          <Link
            href={`/sales-report/inventory/cycle-count?unitOnly=1&returnTo=${encodeURIComponent(HOUSEKEEPING_BASE)}`}
            className="col-span-1 bg-white/90 rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-lg hover:border-[#05807e]/40 focus:outline-none focus:ring-2 focus:ring-[#05807e]/30 min-h-[300px]"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#05807e]/10 text-[#05807e] ring-2 ring-[#05807e]/10 my-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-lg mt-2 sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">Unit cycle count</h2>
            <p className="text-sm mt-4 sm:text-base text-gray-600">Add or remove room stock to match physical count (unit-only adjustments)</p>
          </Link>
          <Link
            href={`${HOUSEKEEPING_BASE}/report`}
            className="col-span-1 bg-white/90 rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col items-center text-center transition transform hover:-translate-y-1 hover:shadow-lg hover:border-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-300/40 min-h-[300px]"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-600 ring-2 ring-red-100 my-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0118 10v9a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg mt-2 sm:text-xl font-semibold text-gray-900 tracking-tight mb-1">Report damage</h2>
            <p className="text-sm mt-4 sm:text-base text-gray-600">Submit lost or broken items report, to be viewed by the management</p>
          </Link>
        </div>
        {stockOutModalOpen && (
          <HousekeepingStockOutModal onClose={() => setStockOutModalOpen(false)} />
        )}
      </div>
    );
  }
