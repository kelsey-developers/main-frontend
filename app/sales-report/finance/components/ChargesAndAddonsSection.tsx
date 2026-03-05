import React from 'react';
import type { ChargeType } from '../types';
import { formatPHP } from '../lib/format';

interface ChargesAndAddonsSectionProps {
  charges: ChargeType[];
}

const ChargesAndAddonsSection: React.FC<ChargesAndAddonsSectionProps> = ({ charges }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6">
        <ul className="space-y-4">
          {charges.map((c) => (
            <li key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex-1">
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>{c.name}</p>
                <p className="text-sm text-gray-600 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                  {c.description}{c.defaultAmount != null && ` · Default: ${formatPHP(c.defaultAmount)}`}
                </p>
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>{c.exampleLabel}</p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${c.appliedToBills ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`} style={{ fontFamily: 'Poppins' }}>
                {c.appliedToBills ? 'Applied to bills' : 'Not applied'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChargesAndAddonsSection;
