'use client';

import React from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import ChargesAndAddonsSection from '../components/ChargesAndAddonsSection';
import { mockChargeTypes } from '../lib/mockData';

export default function ChargesAddonsPage() {
  return (
    <>
      <FinancePageHeader
        title="Charges & add-ons"
        description="See how extra head fee, pool fee, early/late check-out, cleaning fee, etc. are applied and pulled into bills/receipts"
      />
      <ChargesAndAddonsSection charges={mockChargeTypes} />
    </>
  );
}
