'use client';

import React, { useEffect, useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import ExportSection from '../components/ExportSection';

function ExportPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-72 bg-gray-200 rounded-lg" />
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6">
        <div className="h-4 w-full max-w-md bg-gray-100 rounded mb-4" />
        <div className="flex gap-3">
          <div className="h-10 w-36 bg-gray-200 rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ExportPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <>
        <FinancePageHeader
          title="Export for accounting"
          description="Export to Excel/CSV for accounting and reconciliation"
        />
        <ExportPageSkeleton />
      </>
    );
  }

  return (
    <>
      <FinancePageHeader
        title="Export for accounting"
        description="Export to Excel/CSV for accounting and reconciliation"
      />
      <ExportSection />
    </>
  );
}
