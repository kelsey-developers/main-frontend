import React from 'react';
import Link from 'next/link';
import type { DamagePenalty } from '../types';
import { formatPHP, formatDateNumeric } from '../lib/format';

const DAMAGE_SLUG_SEP = '__';

interface DamagePenaltySectionProps {
  incidents: DamagePenalty[];
}

const DamagePenaltySection: React.FC<DamagePenaltySectionProps> = ({ incidents }) => {
  const isEmpty = !incidents || incidents.length === 0;
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ fontFamily: 'Poppins' }}>
          <thead>
            <tr className=" bg-gradient-to-r from-[#0b5858] to-[#05807e] rounded-t-xl">
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Booking ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Reported at</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Cost</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Charged to guest</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Absorbed</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Total loss</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500 text-sm">
                  No records detected
                </td>
              </tr>
            ) : incidents.map((m) => (
              <tr key={m.bookingId} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">{m.bookingId}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{m.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{/^\d{4}-\d{2}-\d{2}$/.test(String(m.reportedAt)) ? formatDateNumeric(String(m.reportedAt)) : m.reportedAt}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatPHP(m.cost)}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatPHP(m.chargedToGuest)}</td>
                <td className="px-4 py-3 text-sm text-red-600 text-center">{formatPHP(m.absorbed)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">{formatPHP(m.totalLoss)}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">{m.status}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                  <Link
                    href={`/sales-report/finance/damage-penalty/${encodeURIComponent(m.bookingId + DAMAGE_SLUG_SEP + m.unit)}`}
                    className="inline-block px-4 py-2 rounded-lg bg-teal-800 text-white hover:bg-teal-900 transition-colors"
                  >
                    View more
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DamagePenaltySection;
