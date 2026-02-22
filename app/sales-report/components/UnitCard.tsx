import React from 'react';
import type { TopUnit } from '../types';

interface UnitCardProps {
  unit: TopUnit;
}

function formatSales(value: number): string {
  if (value >= 1_000_000) return `₱ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱ ${(value / 1_000).toFixed(0)}k`;
  return `₱ ${value.toLocaleString()}`;
}

const UnitCard: React.FC<UnitCardProps> = ({ unit }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
      <div className="relative w-full sm:w-40 h-40 sm:h-auto sm:min-h-[120px] flex-shrink-0 bg-gray-200">
        <img
          src={unit.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex-1 flex flex-col justify-center min-w-0">
        <h4
          className="text-base font-bold text-gray-900 mb-1 line-clamp-1"
          style={{ fontFamily: 'Poppins' }}
        >
          {unit.title}
        </h4>
        <p
          className="text-sm text-gray-600 mb-2"
          style={{ fontFamily: 'Poppins' }}
        >
          {unit.location}
        </p>
        <p
          className="text-lg font-bold text-gray-900"
          style={{ fontFamily: 'Poppins' }}
        >
          {formatSales(unit.totalSales)}{' '}
          <span className="text-sm font-normal text-gray-600">total sales</span>
        </p>
      </div>
    </div>
  );
};

export default UnitCard;
