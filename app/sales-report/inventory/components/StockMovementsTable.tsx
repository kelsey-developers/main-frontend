'use client';

import StatusBadge from './StatusBadge';
import type { StockMovementType } from '../types';

export interface StockMovementRow {
  id: string;
  productName: string;
  productSku: string;
  warehouseName: string;
  type: StockMovementType;
  quantity: number;
  createdBy?: string;
  createdAt: string;
}

const MOVEMENT_STATUS_CONFIG: Record<
  StockMovementType,
  { label: string; bgClass: string; textClass: string; dotColor: string }
> = {
  in: {
    label: 'Stock In',
    bgClass: 'bg-green-50 border border-green-200',
    textClass: 'text-green-700',
    dotColor: '#28950e',
  },
  out: {
    label: 'Stock Out',
    bgClass: 'bg-red-50 border border-red-200',
    textClass: 'text-red-700',
    dotColor: '#f10e3b',
  },
  adjustment: {
    label: 'Adjustment',
    bgClass: 'bg-amber-50 border border-amber-200',
    textClass: 'text-amber-700',
    dotColor: '#ce7100',
  },
  damage: {
    label: 'Damage',
    bgClass: 'bg-rose-50 border border-rose-200',
    textClass: 'text-rose-700',
    dotColor: '#e11d48',
  },
};

const TYPE_COLOR: Record<StockMovementType, string> = {
  in: '#28950e',
  out: '#f10e3b',
  adjustment: '#ce7100',
  damage: '#f10e3b',
};

const TYPE_SIGN: Record<StockMovementType, string> = {
  in: '+',
  out: '-',
  adjustment: '±',
  damage: '-',
};

function Qty({ type, quantity }: { type: StockMovementType; quantity: number }) {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: 14,
        color: TYPE_COLOR[type],
        fontFamily: 'Poppins',
      }}
    >
      {TYPE_SIGN[type]}
      {Math.abs(quantity)}
    </span>
  );
}

const StockMovementsTableSkeleton = () => (
  <div className="mt-5 bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'Poppins' }}>
    <table className="w-full border-collapse">
      <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white">
        <tr>
          {['ID', 'PRODUCT', 'WAREHOUSE', 'TYPE', 'QTY', 'BY', 'DATE'].map((header) => (
            <th key={header} className="px-4 py-3 text-left text-xs font-bold tracking-wide text-white/75">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="animate-pulse">
        {Array.from({ length: 8 }).map((_, index) => (
          <tr key={`skeleton-${index}`} className="border-b border-gray-200 last:border-b-0">
            <td className="px-4 py-3">
              <div className="h-3 w-16 rounded bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-3.5 w-32 rounded bg-slate-200 mb-1.5" />
              <div className="h-2.5 w-20 rounded bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-3 w-24 rounded bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-3.5 w-12 rounded bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-3 w-20 rounded bg-slate-200" />
            </td>
            <td className="px-4 py-3">
              <div className="h-3 w-24 rounded bg-slate-200" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function StockMovementsTable({ movements, isLoading }: { movements: StockMovementRow[]; isLoading?: boolean }) {
  if (isLoading) {
    return <StockMovementsTableSkeleton />;
  }

  return (
    <div className="mt-5 bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ fontFamily: 'Poppins' }}>
      <table className="w-full border-collapse">
        <thead className="bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white">
          <tr>
            {['ID', 'PRODUCT', 'WAREHOUSE', 'TYPE', 'QTY', 'BY', 'DATE'].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-bold tracking-wide text-white/75">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {movements.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-10 text-center text-sm text-gray-400">
                No movements found matching your criteria
              </td>
            </tr>
          ) : (
            movements.map((movement) => (
              <tr key={movement.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{movement.id}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">{movement.productName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{movement.productSku}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{movement.warehouseName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={movement.type} statusConfig={MOVEMENT_STATUS_CONFIG} className="text-[11px]" />
                </td>
                <td className="px-4 py-3">
                  <Qty type={movement.type} quantity={movement.quantity} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{movement.createdBy || 'N/A'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{movement.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
