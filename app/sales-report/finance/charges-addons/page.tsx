'use client';

import React, { useEffect, useState } from 'react';
import FinancePageHeader from '../components/FinancePageHeader';
import ChargesAndAddonsSection from './components/ChargesAndAddonsSection';
import { fetchChargeTypes } from '../lib/chargeTypesService';
import type { ChargeType } from '../types';

export default function ChargesAddonsPage() {
  const [charges, setCharges] = useState<ChargeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchChargeTypes();
        if (mounted) setCharges(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <FinancePageHeader
        title="Charges & add-ons"
        description="See how extra head fee, pool fee, early/late check-out, cleaning fee, etc. are applied and pulled into bills/receipts"
      />
      <ChargesAndAddonsSection charges={loading ? [] : charges} />
    </>
  );
}
