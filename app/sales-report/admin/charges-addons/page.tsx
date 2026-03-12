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
    const data = await apiClient.get<ListResponse>('/api/charge-types?includeInactive=true');
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
      await apiClient.patch(`/api/charge-types/${row.id}`, { isActive: !row.isActive });
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
      await apiClient.patch(`/api/charge-types/${row.id}`, payload);
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
      await apiClient.post('/api/charge-types', {
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

        <AdminSection title="Charge types" subtitle="Toggle active, edit amount/model. Changes affect new bookings only.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <colgroup>
                <col style={{ width: 160 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 168 }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 112 }} />
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-[#0b5858] to-[#05807e]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Default</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Pricing Model</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f8fffe] transition-colors align-middle">

                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <code className="block font-mono text-[11px] bg-gray-100 text-[#0b5858] px-2 py-0.5 rounded w-fit max-w-[136px] truncate">
                        {row.code}
                      </code>
                    </td>

                    {/* Name + description */}
                    <td className="px-4 py-3.5 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate capitalize">
                        {row.name}
                      </p>
                      {row.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{row.description}</p>
                      )}
                    </td>

                    {/* Default amount — inline editable */}
                    <td className="px-4 py-3.5">
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none pointer-events-none">
                          &#8369;
                        </span>
                        <input
                          key={row.id}
                          defaultValue={row.defaultAmount ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const parsed = v.length ? Number(v) : null;
                            if (v.length && !Number.isFinite(parsed)) return;
                            if ((row.defaultAmount ?? null) === parsed) return;
                            void saveRow(row, { defaultAmount: parsed });
                          }}
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white"
                          placeholder="0"
                          inputMode="decimal"
                        />
                      </div>
                    </td>

                    {/* Pricing model */}
                    <td className="px-4 py-3.5">
                      <select
                        value={row.pricingModel}
                        onChange={(e) => void saveRow(row, { pricingModel: e.target.value as PricingModel })}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                      >
                        {Object.entries(PRICING_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        disabled={savingId === row.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 whitespace-nowrap ${
                          row.isActive
                            ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300'
                            : 'border-[#0B5858]/30 bg-white text-[#0B5858] hover:bg-[#e8f4f4]'
                        }`}
                      >
                        {savingId === row.id ? 'Saving…' : row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      {loading ? 'Loading…' : 'No charge types yet. Create one on the left.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}

