'use client';

import React from 'react';
import FinancePageHeader from '../components/FinancePageHeader';

export default function FuturePage() {
  return (
    <>
      <FinancePageHeader
        title="Coming soon"
        description="Planned enhancements for finance"
      />
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-dashed border-amber-200">
        <div className="p-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Poppins' }}>Simple P&L view</p>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>Sales − operating costs for supplies & cleaning</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Poppins' }}>E-invoicing & official receipts</p>
            <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>Integration with e-invoicing or official receipts</p>
          </div>
        </div>
      </div>
    </>
  );
}
