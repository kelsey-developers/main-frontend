'use client';

import React from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import DamagePenaltySection from '../components/DamagePenaltySection';
import { mockDamagePenaltyMonths } from '../lib/mockData';

export default function DamagePenaltyPage() {
  return (
    <>
      <FinancePageHeader
        title="Damage & penalty impact"
        description="View monthly losses due to damage (amounts charged vs absorbed) so finance can reconcile"
      />
      <DamagePenaltySection months={mockDamagePenaltyMonths} />
    </>
  );
}
