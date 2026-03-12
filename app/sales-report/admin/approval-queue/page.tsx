'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';
import { apiClient } from '@/lib/api/client';

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
  requestedBy: string | null;
  requestedAt: string;
  referenceId?: string | null;
  referenceType?: string | null;
  status: ApprovalStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('pending');
  const [riskFilter, setRiskFilter] = useState<'all' | ApprovalRisk>('all');
  const [approvalSearch, setApprovalSearch] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'all' ? '?status=all' : '';
      const data = await apiClient.get<ApprovalRequest[]>(`/api/approval-requests${statusParam}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const resetFilters = () => {
    setStatusFilter('pending');
    setRiskFilter('all');
    setApprovalSearch('');
  };

  const reviewRequest = async (requestId: string, status: Extract<ApprovalStatus, 'approved' | 'rejected'>) => {
    setReviewingId(requestId);
    try {
      await apiClient.patch(`/api/approval-requests/${requestId}`, { status });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin' } : r
        )
      );
    } catch {
      // keep UI state on error
    } finally {
      setReviewingId(null);
    }
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

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Approval Queue"
        description="Exceptions must be reviewed before stock changes are finalized. Typical approvals include large stock-outs, write-offs, manual adjustments, and negative-stock overrides by admin or finance."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Pending Requests" value={loading ? '—' : pendingCount} accent="amber" />
        <AdminStatCard label="High Risk Pending" value={loading ? '—' : highRiskPending} accent="red" />
        <AdminStatCard label="Approved" value={loading ? '—' : approvedToday} accent="teal" />
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
                {loading ? 'Loading…' : (
                  <>
                    Showing <span className="font-semibold text-gray-800">{filteredRequests.length}</span> of{' '}
                    <span className="font-semibold text-gray-800">{requests.length}</span> requests
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadRequests()}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset filters
                </button>
              </div>
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
                      <div>{entry.requestedBy ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {typeof entry.requestedAt === 'string'
                          ? new Date(entry.requestedAt).toLocaleString()
                          : entry.requestedAt}
                      </div>
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
                          {entry.reviewedBy} at{' '}
                          {entry.reviewedAt
                            ? new Date(entry.reviewedAt).toLocaleString()
                            : '—'}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={entry.status !== 'pending' || reviewingId === entry.id}
                          onClick={() => void reviewRequest(entry.id, 'approved')}
                          className="px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4] disabled:opacity-40"
                        >
                          {reviewingId === entry.id ? '…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          disabled={entry.status !== 'pending' || reviewingId === entry.id}
                          onClick={() => void reviewRequest(entry.id, 'rejected')}
                          className="px-2.5 py-1.5 rounded border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          {reviewingId === entry.id ? '…' : 'Reject'}
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
