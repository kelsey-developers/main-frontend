'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CycleCountModal from '../components/CycleCountModal';

export default function CycleCountPage() {
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const warehousePrefill = searchParams.get('warehouseId') || undefined;
  const unitPrefill = searchParams.get('unitId') || undefined;
  const unitOnly = searchParams.get('unitOnly') === '1' || searchParams.get('unitOnly') === 'true';
  const returnTo = searchParams.get('returnTo') ?? '/sales-report/inventory/items';

  useEffect(() => {
    setModalOpen(true);
  }, []);

  return (
    <>
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
          <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
            Inventory
          </Link>
          <span>/</span>
          <Link href="/sales-report/inventory/items" className="text-[#0B5858] hover:underline">
            Items
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Cycle Count</span>
        </nav>
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          Cycle Count / Inventory Adjustment
        </h1>
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
          Add or remove stock to correct warehouse or unit (room) inventory discrepancies
        </p>
      </div>

      <div
        className="p-4 rounded-xl border-l-[3px] text-[13px] text-gray-700 leading-relaxed mb-8"
        style={{
          background: 'rgba(3, 105, 161, 0.08)',
          borderColor: '#0369a1',
          fontFamily: 'Poppins',
        }}
      >
        <strong>Use for:</strong> Cycle count corrections, inventory reconciliations, or write-offs when physical count differs from system.
        <strong className="block mt-2">Do not use for receiving goods</strong> — create a Goods Receipt from the Purchase Order instead.
      </div>

      {modalOpen && (
        <CycleCountModal
          onClose={() => setModalOpen(false)}
          returnTo={returnTo}
          warehousePrefill={warehousePrefill}
          unitPrefill={unitPrefill}
          unitOnly={unitOnly}
        />
      )}
    </>
  );
}
