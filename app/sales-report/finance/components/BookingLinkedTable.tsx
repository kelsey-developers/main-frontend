'use client';

import React from 'react';
import Link from 'next/link';
import type { BookingLinkedRow } from '../types';
import { formatPHP, formatDateNumeric, getBasePrice, getBookingTotal } from '../lib/format';

interface BookingLinkedTableProps {
  rows: BookingLinkedRow[];
}

const BookingLinkedTable: React.FC<BookingLinkedTableProps> = ({ rows }) => {
  const isEmpty = !rows || rows.length === 0;
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" style={{ fontFamily: 'Poppins' }}>
          <thead>
            <tr className="bg-gradient-to-r from-[#0b5858] to-[#05807e] rounded-t-xl border-b border-gray-200">
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Booking</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Unit</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Agent</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Guest</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Check-in / Out</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Total</th>
              <th className="px-3 py-3 text-xs font-semibold text-white text-center uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                  No records detected
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-3 py-3 text-sm font-medium text-gray-900 text-center">{row.bookingId}</td>
                <td className="px-3 py-3 text-sm text-gray-700 text-center">{row.unit}</td>
                <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.agent}</td>
                <td className="px-3 py-3 text-sm text-gray-600 text-center">{row.guest}</td>
                <td className="px-3 py-3 text-sm text-gray-600 text-center">{formatDateNumeric(row.checkIn)} – {formatDateNumeric(row.checkOut)}</td>
                <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-center">{formatPHP(getBookingTotal(row.rate, row.checkIn, row.checkOut, row.discounts, row.extraHeads, row.extraHours, row.addOnsAmount))}</td>
                <td className="px-3 py-3 text-sm text-gray-700 text-center">
                  <Link
                    href={`/sales-report/finance/bookings/${row.id}`}
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

export default BookingLinkedTable;
