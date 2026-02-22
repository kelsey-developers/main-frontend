'use client';

import React from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import ExportSection from '../components/ExportSection';

export default function ExportPage() {
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
