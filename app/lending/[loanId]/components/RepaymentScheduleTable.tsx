'use client';

import React from 'react';
import type { ScheduleEntry } from '@/types/lending';

interface Props {
  schedules: ScheduleEntry[];
}

/** Chip style for table status pills — matches feat/cleaning-services (backgroundColor, color, boxShadow). */
type ChipStyle = { backgroundColor: string; color: string; boxShadow: string };
const chipShadow = (r: number, g: number, b: number, a = 0.35) =>
  `0 1px 0 rgba(${r},${g},${b},${a})`;

const STATUS_CONFIG: Record<ScheduleEntry['status'], { label: string; chipStyle: ChipStyle }> = {
  upcoming: { label: 'Upcoming', chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } },
  paid:     { label: 'Paid',     chipStyle: { backgroundColor: 'rgba(11, 88, 88, 0.15)', color: '#0B5858', boxShadow: chipShadow(11, 88, 88, 0.32) } },
  overdue:  { label: 'Overdue', chipStyle: { backgroundColor: '#fef2f2', color: '#b91c1c', boxShadow: chipShadow(239, 68, 68, 0.35) } },
  partial:  { label: 'Partial', chipStyle: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#92400e', boxShadow: chipShadow(245, 158, 11, 0.35) } },
};

function fmt(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RepaymentScheduleTable({ schedules }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['#', 'Due Date', 'Principal', 'Interest', 'Total Due', 'Balance', 'Status', 'Paid On'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap first:pl-5 last:pr-5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {schedules.map((entry) => {
            const cfg = STATUS_CONFIG[entry.status];
            return (
              <tr
                key={entry.period}
                className={`hover:bg-gray-50/50 transition-colors ${entry.status === 'overdue' ? 'bg-red-50/30' : ''}`}
              >
                <td className="px-4 py-3 pl-5 font-mono text-xs font-bold text-gray-500">{entry.period}</td>
                <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                  {new Date(entry.dueDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{fmt(entry.principalDue)}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(entry.interestDue)}</td>
                <td className="px-4 py-3 font-bold text-gray-900">{fmt(entry.totalDue)}</td>
                <td className="px-4 py-3 text-gray-600">{fmt(entry.remainingBalance)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={cfg.chipStyle}>
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 pr-5 text-gray-500 text-xs">
                  {entry.paidAt
                    ? new Date(entry.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
