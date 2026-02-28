'use client';

import React, { useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import HorizontalFilter from '../components/HorizontalFilter';
import DamagePenaltySection from '../components/DamagePenaltySection';
import { mockDamagePenaltyMonths } from '../lib/mockData';
import { defaultSalesReportFilters } from '../types';
import type { SalesReportFilters } from '../types';

export default function DamagePenaltyPage() {
  const [filters, setFilters] = useState<SalesReportFilters>(defaultSalesReportFilters);

  return (
    <>
      <FinancePageHeader
        title="Damage & penalty impact"
        description="View monthly losses due to damage (amounts charged vs absorbed) so finance can reconcile"
      />
      <HorizontalFilter filters={filters} onFiltersChange={setFilters} />
      <div className="mt-4">
        <DamagePenaltySection months={mockDamagePenaltyMonths} />
      </div>
    </>
  );
}
