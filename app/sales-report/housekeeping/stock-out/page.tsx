'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HOUSEKEEPING_BASE = '/sales-report/housekeeping';

/** Stock out is now a modal on the housekeeping dashboard. Redirect and open modal. */
export default function HousekeepingStockOutRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`${HOUSEKEEPING_BASE}?open=stock-out`);
  }, [router]);

  return (
    <div style={{ fontFamily: 'Poppins' }} className="flex min-h-[200px] items-center justify-center text-gray-500">
      Redirecting…
    </div>
  );
}
