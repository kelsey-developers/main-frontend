'use client';

import React, { useMemo, useState } from 'react';
import { mockDamageAdjustments, mockReplenishmentItems, mockStockMovements } from '../../inventory/lib/mockData';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

type ApprovalKind = 'stock-out' | 'write-off' | 'adjustment' | 'negative-override';
type ApprovalRisk = 'low' | 'medium' | 'high';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  risk: ApprovalRisk;
  itemName: string;
  quantity: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  referenceId?: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

const initialRequests: ApprovalRequest[] = [
  {
    id: 'aq-001',
    kind: 'stock-out',
    risk: 'high',
    itemName: mockReplenishmentItems[0]?.name ?? 'Towels',
    quantity: 28,
    reason: 'Bulk room turnover for long-stay block booking.',
    requestedBy: 'Housekeeping Lead',
    requestedAt: '2025-03-08 10:15',
    referenceId: 'BK-2025-011',
    status: 'pending',
  },
  {
    id: 'aq-002',
    kind: 'write-off',
    risk: 'high',
    itemName: mockReplenishmentItems[14]?.name ?? 'Iron',
    quantity: 1,
    reason: 'Unit failed safety check and cannot be repaired.',
    requestedBy: 'Maintenance Officer',
    requestedAt: '2025-03-08 09:30',
    referenceId: 'DI-2025-010',
    status: 'pending',
  },
  {
    id: 'aq-003',
    kind: 'adjustment',
    risk: 'medium',
    itemName: mockReplenishmentItems[12]?.name ?? 'Air freshener',
    quantity: 3,
    reason: 'Physical count mismatch after shelf recount.',
    requestedBy: 'Warehouse Staff',
    requestedAt: '2025-03-08 08:40',
    referenceId: mockDamageAdjustments[2]?.id,
    status: 'pending',
  },
  {
    id: 'aq-004',
    kind: 'negative-override',
    risk: 'high',
    itemName: mockReplenishmentItems[9]?.name ?? 'Laundry detergent',
    quantity: 2,
    reason: 'Urgent service use while stock is currently zero.',
    requestedBy: 'Operations Supervisor',
    requestedAt: '2025-03-07 18:20',
    referenceId: 'OPS-OVR-002',
    status: 'pending',
  },
  {
    id: 'aq-005',
    kind: 'stock-out',
    risk: 'low',
    itemName: mockReplenishmentItems[1]?.name ?? 'Soap (bars)',
    quantity: 6,
    reason: 'Regular unit refill.',
    requestedBy: 'Housekeeping Staff',
    requestedAt: '2025-03-07 14:10',
    referenceId: mockStockMovements.find((entry) => entry.type === 'out')?.id,
    status: 'approved',
    reviewedBy: 'Admin Team A',
    reviewedAt: '2025-03-07 14:30',
  },
];

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('pending');
  const [riskFilter, setRiskFilter] = useState<'all' | ApprovalRisk>('all');
  const [approvalSearch, setApprovalSearch] = useState('');

  const resetFilters = () => {
    setStatusFilter('pending');
    setRiskFilter('all');
    setApprovalSearch('');
  };

  const filteredRequests = useMemo(
    () => {
      const normalizedSearch = approvalSearch.trim().toLowerCase();

      return requests.filter((entry) => {
        if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
        if (riskFilter !== 'all' && entry.risk !== riskFilter) return false;

        if (!normalizedSearch) {
          return true;
        }

        return (
          entry.id.toLowerCase().includes(normalizedSearch) ||
          entry.itemName.toLowerCase().includes(normalizedSearch) ||
          entry.requestedBy.toLowerCase().includes(normalizedSearch) ||
          entry.kind.toLowerCase().includes(normalizedSearch) ||
          (entry.referenceId ?? '').toLowerCase().includes(normalizedSearch)
        );
      });
    },
    [requests, statusFilter, riskFilter, approvalSearch]
  );

  const hasActiveFilters =
    statusFilter !== 'pending' ||
    riskFilter !== 'all' ||
    approvalSearch.trim().length > 0;

  const pendingCount = requests.filter((entry) => entry.status === 'pending').length;
  const highRiskPending = requests.filter((entry) => entry.status === 'pending' && entry.risk === 'high').length;
  const approvedToday = requests.filter((entry) => entry.status === 'approved').length;

  const reviewRequest = (requestId: string, status: Extract<ApprovalStatus, 'approved' | 'rejected'>) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setRequests((prev) =>
      prev.map((entry) =>
        entry.id === requestId
          ? {
              ...entry,
              status,
              reviewedBy: 'Admin/Finance Reviewer',
              reviewedAt: timestamp,
            }
          : entry
      )
    );
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Approval Queue"
        description="Exceptions must be reviewed before stock changes are finalized. Typical approvals include large stock-outs, write-offs, manual adjustments, and negative-stock overrides by admin or finance."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Pending Requests" value={pendingCount} accent="amber" />
        <AdminStatCard label="High Risk Pending" value={highRiskPending} accent="red" />
        <AdminStatCard label="Approved (Sample)" value={approvedToday} accent="teal" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <AdminSection title="Review Requests">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | ApprovalStatus)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  <option value="all">All status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Risk</span>
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as 'all' | ApprovalRisk)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  <option value="all">All risk</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Search</span>
                <input
                  value={approvalSearch}
                  onChange={(event) => setApprovalSearch(event.target.value)}
                  placeholder="Request id, item, requester"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  aria-label="Search approval requests"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold text-gray-800">{filteredRequests.length}</span> of{' '}
                <span className="font-semibold text-gray-800">{requests.length}</span> requests
              </p>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
                <tr>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Request</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Item and Qty</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Risk</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Requested By</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{entry.kind}</div>
                      <div className="text-xs text-gray-500 mt-1">{entry.id.toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">{entry.referenceId ?? 'No reference'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{entry.itemName}</div>
                      <div className="text-xs text-gray-500 mt-1">Qty: {entry.quantity}</div>
                      <div className="text-xs text-gray-500 mt-1 max-w-[280px]">{entry.reason}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          entry.risk === 'high'
                            ? 'bg-red-100 text-red-700'
                            : entry.risk === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {entry.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{entry.requestedBy}</div>
                      <div className="text-xs text-gray-500 mt-1">{entry.requestedAt}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          entry.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : entry.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.status}
                      </span>
                      {entry.reviewedBy ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.reviewedBy} at {entry.reviewedAt}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={entry.status !== 'pending'}
                          onClick={() => reviewRequest(entry.id, 'approved')}
                          className="px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4] disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={entry.status !== 'pending'}
                          onClick={() => reviewRequest(entry.id, 'rejected')}
                          className="px-2.5 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      No approval requests match the selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>Approval Policy (MVP)</h3>
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-200 p-3">
              Stock-out greater than 20 units requires admin or finance approval.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Any reusable item write-off requires finance validation and audit note.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Negative-stock override is blocked unless approved first.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Rejected request cannot adjust stock quantities.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
