'use client';

import React, { useMemo, useState } from 'react';
import { mockDamageAdjustments, mockReplenishmentItems, mockStockMovements } from '../../inventory/lib/mockData';
import type { StockMovementType } from '../../inventory/types';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

type AlertSeverity = 'info' | 'warning' | 'critical';

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
  signal: string;
}

const itemNameById = new Map(mockReplenishmentItems.map((item) => [item.id, item.name]));

export default function AuditAlertsPage() {
  const [movementFilter, setMovementFilter] = useState<'all' | StockMovementType>('all');
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const movementRows = useMemo(() => {
    const sorted = [...mockStockMovements].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (movementFilter === 'all') return sorted.slice(0, 18);
    return sorted.filter((entry) => entry.type === movementFilter).slice(0, 18);
  }, [movementFilter]);

  const alerts = useMemo<AlertItem[]>(() => {
    const rows: AlertItem[] = [];

    mockReplenishmentItems
      .filter((item) => item.currentStock === 0 || item.shortfall >= 10)
      .slice(0, 6)
      .forEach((item) => {
        rows.push({
          id: `low-${item.id}`,
          title: `Low stock: ${item.name}`,
          detail: `Current ${item.currentStock} ${item.unit}, minimum ${item.minStock} ${item.unit}.`,
          severity: item.currentStock === 0 ? 'critical' : 'warning',
          signal: 'Replenishment',
        });
      });

    mockDamageAdjustments
      .filter((entry) => entry.status !== 'resolved')
      .forEach((entry) => {
        rows.push({
          id: `damage-${entry.id}`,
          title: `Damage case ${entry.id.toUpperCase()} still ${entry.status}`,
          detail: `${itemNameById.get(entry.productId) ?? 'Unknown item'} reported by ${entry.reportedBy}. Qty ${entry.quantity}.`,
          severity: entry.severity === 'high' ? 'critical' : 'warning',
          signal: 'Damage and Loss',
        });
      });

    const consumptionByProduct: Record<string, number> = {};
    mockStockMovements
      .filter((entry) => entry.type === 'out')
      .forEach((entry) => {
        consumptionByProduct[entry.productId] = (consumptionByProduct[entry.productId] ?? 0) + entry.quantity;
      });

    Object.entries(consumptionByProduct)
      .filter(([, qty]) => qty >= 40)
      .forEach(([productId, qty]) => {
        rows.push({
          id: `fast-${productId}`,
          title: `Fast-moving item: ${itemNameById.get(productId) ?? 'Unknown item'}`,
          detail: `Recent stock-out total reached ${qty} units. Review reorder threshold.`,
          severity: qty >= 60 ? 'critical' : 'info',
          signal: 'Consumption Trend',
        });
      });

    const missingReferenceCount = mockStockMovements.filter(
      (entry) => !entry.referenceId && (entry.type === 'out' || entry.type === 'adjustment')
    ).length;

    if (missingReferenceCount > 0) {
      rows.push({
        id: 'audit-missing-reference',
        title: 'Audit gap: movement references missing',
        detail: `${missingReferenceCount} stock-out or adjustment entries have no reference id.`,
        severity: 'warning',
        signal: 'Audit Quality',
      });
    }

    return rows;
  }, []);

  const stats = {
    movementCount: mockStockMovements.length,
    activeDamageCases: mockDamageAdjustments.filter((entry) => entry.status !== 'resolved').length,
    criticalAlerts: alerts.filter((entry) => entry.severity === 'critical').length,
    unacknowledged: alerts.filter((entry) => !acknowledged[entry.id]).length,
  };

  const toggleAck = (id: string) => {
    setAcknowledged((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Audit and Alerts"
        description="Monitor stock movement integrity and risk signals. This page helps admin catch low stock, repeated damage, unusual consumption, and incomplete audit references before they become operational issues."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="Movements" value={stats.movementCount} accent="teal" />
        <AdminStatCard label="Open Damage Cases" value={stats.activeDamageCases} accent="amber" />
        <AdminStatCard label="Critical Alerts" value={stats.criticalAlerts} accent="red" />
        <AdminStatCard label="Unacknowledged" value={stats.unacknowledged} accent="slate" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1.7fr] gap-6">
        <AdminSection title="Alert Feed">
          <div className="p-4 space-y-3 max-h-[620px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 ${
                  alert.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : alert.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{alert.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{alert.detail}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-2">{alert.signal}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAck(alert.id)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold border ${
                      acknowledged[alert.id]
                        ? 'border-green-200 text-green-700 bg-green-50'
                        : 'border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    {acknowledged[alert.id] ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection
          title="Stock Movement Audit Trail"
          headerAction={
            <select
              value={movementFilter}
              onChange={(event) => setMovementFilter(event.target.value as 'all' | StockMovementType)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
            >
              <option value="all">All movement types</option>
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
            </select>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
                <tr>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Item</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Qty</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">By</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {movementRows.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-gray-600">{entry.createdAt}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{itemNameById.get(entry.productId) ?? entry.productId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          entry.type === 'in'
                            ? 'bg-green-100 text-green-700'
                            : entry.type === 'out'
                            ? 'bg-blue-100 text-blue-700'
                            : entry.type === 'damage'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.createdBy ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{entry.referenceId ?? 'Missing reference'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
