'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AdminPageHeader, AdminSection } from '../components';

type PricingModel =
  | 'PER_BOOKING'
  | 'PER_NIGHT'
  | 'PER_PERSON'
  | 'PER_PERSON_PER_NIGHT'
  | 'MANUAL';

type ChargeTypeRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  defaultAmount?: number | null;
  pricingModel: PricingModel;
  isActive: boolean;
};

type ListResponse = { chargeTypes: ChargeTypeRow[] };

const PRICING_LABEL: Record<PricingModel, string> = {
  PER_BOOKING: 'Per booking',
  PER_NIGHT: 'Per night',
  PER_PERSON: 'Per person (extra guests)',
  PER_PERSON_PER_NIGHT: 'Per person per night (extra guests × nights)',
  MANUAL: 'Manual only',
};

export default function AdminChargesAddonsPage() {
  const [rows, setRows] = useState<ChargeTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    defaultAmount: '',
    pricingModel: 'PER_BOOKING' as PricingModel,
    isActive: true,
  });

  const load = async () => {
    const data = await apiClient.get<ListResponse>('/api/market/charge-types?includeInactive=true');
    setRows(data.chargeTypes ?? []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const activeCount = useMemo(() => rows.filter((r) => r.isActive).length, [rows]);

  const toggleActive = async (row: ChargeTypeRow) => {
    setSavingId(row.id);
    try {
      await apiClient.patch(`/api/market/charge-types/${row.id}`, { isActive: !row.isActive });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const saveRow = async (row: ChargeTypeRow, updates: Partial<ChargeTypeRow>) => {
    setSavingId(row.id);
    try {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.defaultAmount !== undefined) payload.defaultAmount = updates.defaultAmount;
      if (updates.pricingModel !== undefined) payload.pricingModel = updates.pricingModel;
      await apiClient.patch(`/api/market/charge-types/${row.id}`, payload);
      await load();
    } finally {
      setSavingId(null);
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      const defaultAmount =
        form.defaultAmount.trim().length > 0 ? Number(form.defaultAmount) : undefined;
      await apiClient.post('/api/market/charge-types', {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        defaultAmount: defaultAmount !== undefined && Number.isFinite(defaultAmount) ? defaultAmount : undefined,
        pricingModel: form.pricingModel,
        isActive: form.isActive,
      });
      setForm({
        code: '',
        name: '',
        description: '',
        defaultAmount: '',
        pricingModel: 'PER_BOOKING',
        isActive: true,
      });
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Charges & Add-ons (Master List)"
        description="Finance/admin config. These charge types are auto-attached to new bookings and are used for finance reporting."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: rows.length },
          { label: 'Active', value: activeCount },
          { label: 'Inactive', value: rows.length - activeCount },
          { label: 'Pricing models', value: new Set(rows.map((r) => r.pricingModel)).size },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{s.label}</div>
            <div className="mt-2 text-3xl font-bold text-[#0B5858] tabular-nums">{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-6">
        <AdminSection title="Create charge type" subtitle="Adds to the master list. Code should be stable (e.g. CLEANING_FEE).">
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Code</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="CLEANING_FEE"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Cleaning fee"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description (optional)</span>
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Applied on checkout for cleaning service"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
              />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Default amount</span>
                <input
                  value={form.defaultAmount}
                  onChange={(e) => setForm((p) => ({ ...p, defaultAmount: e.target.value }))}
                  placeholder="e.g. 500"
                  inputMode="decimal"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Pricing model</span>
                <select
                  value={form.pricingModel}
                  onChange={(e) => setForm((p) => ({ ...p, pricingModel: e.target.value as PricingModel }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  {Object.entries(PRICING_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              Active (auto-attached to new bookings)
            </label>
            <button
              type="button"
              onClick={create}
              disabled={creating || !form.code.trim() || !form.name.trim()}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create charge type'}
            </button>
          </div>
        </AdminSection>

        <AdminSection title="Charge types" subtitle="Toggle active, edit amount/model. Changes affect new bookings only (auto charges).">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Name', 'Default', 'Model', 'Active', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      {row.description ? <div className="text-xs text-gray-500 mt-0.5">{row.description}</div> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        defaultValue={row.defaultAmount ?? ''}
                        onBlur={(e) => {
                          const v = String(e.target.value ?? '').trim();
                          const parsed = v.length ? Number(v) : null;
                          if (v.length && !Number.isFinite(parsed)) return;
                          if ((row.defaultAmount ?? null) === parsed) return;
                          void saveRow(row, { defaultAmount: parsed });
                        }}
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={row.pricingModel}
                        onChange={(e) => void saveRow(row, { pricingModel: e.target.value as PricingModel })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                      >
                        {Object.entries(PRICING_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        disabled={savingId === row.id}
                        className="px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {savingId === row.id ? 'Saving…' : row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      {loading ? 'Loading…' : 'No charge types yet. Create one on the left.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}

