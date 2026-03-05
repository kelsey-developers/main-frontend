'use client';

import React from 'react';
import type { BookingLinkedRow } from '../types';
import { formatPHP } from '../lib/format';

interface BookingLinkedTableProps {
  rows: BookingLinkedRow[];
}

const BookingLinkedTable: React.FC<BookingLinkedTableProps> = ({ rows }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ fontFamily: 'Poppins' }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Check-in / Out</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Guest type</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Base</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Discounts</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Extras</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Add-ons</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.bookingId}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.checkIn} – {row.checkOut}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{row.guestType}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatPHP(row.basePrice)}</td>
                <td className="px-4 py-3 text-sm text-red-600">-{formatPHP(row.discounts)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">Heads: {formatPHP(row.extraHeads)} · Hrs: {formatPHP(row.extraHours)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.addOns.join(', ') || '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPHP(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingLinkedTable;
