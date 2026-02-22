import React from 'react';
import type { DamagePenaltyMonth } from '../types';
import { formatPHP } from '../lib/format';

interface DamagePenaltySectionProps {
  months: DamagePenaltyMonth[];
}

const DamagePenaltySection: React.FC<DamagePenaltySectionProps> = ({ months }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ fontFamily: 'Poppins' }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Charged to guest</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Absorbed</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total loss</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Incidents</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.month}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatPHP(m.chargedToGuest)}</td>
                <td className="px-4 py-3 text-sm text-red-600">{formatPHP(m.absorbed)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPHP(m.totalLoss)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.incidentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DamagePenaltySection;
