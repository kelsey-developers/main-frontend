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

type UnitOption = { id: string; name: string };

type OverrideRow = {
  id: string;
  unitId: string;
  chargeTypeId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  chargeType?: { id: string; code: string; name: string; pricingModel: PricingModel; isActive: boolean };
};

type DefaultRow = {
  id: string;
  unitId: string;
  chargeTypeId: string;
  amount: number;
  chargeType?: { id: string; code: string; name: string; pricingModel: PricingModel; isActive: boolean; defaultAmount?: number | null };
};

const PRICING_LABEL: Record<PricingModel, string> = {
  PER_BOOKING: 'Per booking',
  PER_NIGHT: 'Per night',
  PER_PERSON: 'Per person (extra guests)',
  PER_PERSON_PER_NIGHT: 'Per person per night (extra guests × nights)',
  MANUAL: 'Manual only',
};

function toDateOnly(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  // Per-unit default amounts (e.g. Unit A: 500, Unit B: 800 for cleaning fee)
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [defaults, setDefaults] = useState<DefaultRow[]>([]);
  const [defaultForm, setDefaultForm] = useState({ chargeTypeId: '', amount: '' });

  // Holiday / special-date overrides (per unit, per charge type, per date)
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overrideForm, setOverrideForm] = useState({
    date: toDateOnly(new Date()),
    chargeTypeId: '',
    amount: '',
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
  const perNightChargeTypes = useMemo(
    () => rows.filter((r) => r.pricingModel === 'PER_NIGHT' || r.pricingModel === 'PER_PERSON_PER_NIGHT'),
    [rows]
  );

  const loadUnits = async () => {
    setUnitsLoading(true);
    try {
      const data = await apiClient.get<unknown>('/api/units?limit=200&offset=0');
      const list = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
      const mapped = list
        .map((u) => ({
          id: String(u.id ?? ''),
          name: String(u.title ?? u.name ?? u.code ?? u.id ?? '').trim(),
        }))
        .filter((u) => u.id && u.name);
      setUnits(mapped);
      if (!selectedUnitId && mapped.length > 0) setSelectedUnitId(mapped[0]!.id);
    } finally {
      setUnitsLoading(false);
    }
  };

  const loadDefaults = async (unitId: string) => {
    if (!unitId) {
      setDefaults([]);
      return;
    }
    setDefaultsLoading(true);
    try {
      const data = await apiClient.get<{ defaults?: DefaultRow[] }>(`/api/market/charge-type-defaults?unitId=${encodeURIComponent(unitId)}`);
      setDefaults(Array.isArray(data.defaults) ? data.defaults : []);
    } finally {
      setDefaultsLoading(false);
    }
  };

  const loadOverrides = async (unitId: string) => {
    if (!unitId) {
      setOverrides([]);
      return;
    }
    setOverrideLoading(true);
    try {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - 7);
      const to = new Date();
      to.setUTCDate(to.getUTCDate() + 90);
      const qs = new URLSearchParams({
        unitId,
        from: toDateOnly(from),
        to: toDateOnly(to),
      }).toString();
      const data = await apiClient.get<{ overrides?: OverrideRow[] }>(`/api/market/charge-type-date-overrides?${qs}`);
      setOverrides(Array.isArray(data.overrides) ? data.overrides : []);
    } finally {
      setOverrideLoading(false);
    }
  };

  useEffect(() => {
    void loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUnitId) return;
    void loadDefaults(selectedUnitId);
    void loadOverrides(selectedUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId]);

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
        description="Configure charge types (cleaning fee, extra head, late checkout, etc.). These are auto-attached to new bookings and used for finance reporting."
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

        <AdminSection title="Charge types" subtitle="Toggle active, edit amount/pricing model. Pricing model matches DB (PER_BOOKING, PER_NIGHT, PER_PERSON, etc.). Changes affect new bookings only.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 800, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '18%' }} />
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

                    {/* Code — fixed, truncate */}
                    <td className="px-4 py-3.5 overflow-hidden" style={{ width: '15%' }}>
                      <code className="block font-mono text-[11px] bg-gray-100 text-[#0b5858] px-2 py-0.5 rounded truncate" title={row.code}>
                        {row.code}
                      </code>
                    </td>

                    {/* Name + description — fixed, truncate overflow */}
                    <td className="px-4 py-3.5 overflow-hidden" style={{ width: '20%' }}>
                      <div className="min-h-[2.5rem] flex flex-col justify-center overflow-hidden">
                        <p className="font-semibold text-gray-900 text-sm leading-tight capitalize truncate" title={row.name}>
                          {row.name}
                        </p>
                        {row.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate" title={row.description}>
                            {row.description}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Default amount — fixed width input */}
                    <td className="px-4 py-3.5 overflow-hidden" style={{ width: '12%' }}>
                      <div className="relative w-[90px]">
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
                          maxLength={10}
                        />
                      </div>
                    </td>

                    {/* Pricing model — fixed width select */}
                    <td className="px-4 py-3.5 overflow-hidden" style={{ width: '24%' }}>
                      <select
                        value={row.pricingModel in PRICING_LABEL ? row.pricingModel : 'PER_BOOKING'}
                        onChange={(e) => void saveRow(row, { pricingModel: e.target.value as PricingModel })}
                        className="w-full min-w-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                        title={PRICING_LABEL[row.pricingModel] ?? row.pricingModel}
                      >
                        {Object.entries(PRICING_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Status — fixed width */}
                    <td className="px-4 py-3.5 text-center overflow-hidden" style={{ width: '11%' }}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Toggle — fixed width */}
                    <td className="px-4 py-3.5 text-center overflow-hidden" style={{ width: '18%' }}>
                      <div className="flex justify-center min-w-0">
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        disabled={savingId === row.id}
                        className={`inline-flex shrink-0 items-center justify-center px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 ${
                          row.isActive
                            ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300'
                            : 'border-[#0B5858]/30 bg-white text-[#0B5858] hover:bg-[#e8f4f4]'
                        }`}
                      >
                        {savingId === row.id ? 'Saving…' : row.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      </div>
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

      <div className="mt-6">
        <AdminSection
          title="Per-unit default amounts"
          subtitle="Override the global default amount per unit. E.g. Unit A: Cleaning fee 500, Unit B: 800. Used when auto-attaching charges to new bookings. Changes affect new bookings only."
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Unit</span>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  disabled={unitsLoading || units.length === 0}
                >
                  {units.length === 0 && (
                    <option value="">
                      {unitsLoading ? 'Loading units…' : 'No units found'}
                    </option>
                  )}
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Charge type</span>
                <select
                  value={defaultForm.chargeTypeId}
                  onChange={(e) => setDefaultForm((p) => ({ ...p, chargeTypeId: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  <option value="">Select charge type…</option>
                  {rows.filter((r) => r.isActive).map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.code} — {ct.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Amount (PHP)</span>
                <input
                  value={defaultForm.amount}
                  onChange={(e) => setDefaultForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 500"
                  inputMode="decimal"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={!selectedUnitId || !defaultForm.chargeTypeId || defaultForm.amount.trim() === ''}
              onClick={async () => {
                const amount = Number(defaultForm.amount);
                if (!Number.isFinite(amount) || amount <= 0) return;
                setDefaultsLoading(true);
                try {
                  await apiClient.post('/api/market/charge-type-defaults', {
                    unitId: selectedUnitId,
                    chargeTypeId: defaultForm.chargeTypeId,
                    amount,
                  });
                  setDefaultForm({ chargeTypeId: '', amount: '' });
                  await loadDefaults(selectedUnitId!);
                } finally {
                  setDefaultsLoading(false);
                }
              }}
              className="px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {defaultsLoading ? 'Saving…' : 'Save per-unit amount'}
            </button>

            <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
              <table className="w-full text-sm" style={{ minWidth: 560 }}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {defaults.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <code className="font-mono text-[11px] bg-gray-100 text-[#0b5858] px-2 py-0.5 rounded">
                          {d.chargeType?.code ?? d.chargeTypeId}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{d.chargeType?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        &#8369;{Number(d.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
                          onClick={async () => {
                            setDefaultsLoading(true);
                            try {
                              await apiClient.delete('/api/market/charge-type-defaults', {
                                body: { unitId: d.unitId, chargeTypeId: d.chargeTypeId },
                              });
                              await loadDefaults(selectedUnitId);
                            } finally {
                              setDefaultsLoading(false);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {defaults.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                        {defaultsLoading ? 'Loading…' : 'No per-unit overrides for this unit. Use the form above to add one.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSection>
      </div>

      <div className="mt-6">
        <AdminSection
          title="Holiday / special-date pricing (per unit)"
          subtitle="For PER_NIGHT and PER_PERSON_PER_NIGHT charge types only. Set a different amount on specific dates (e.g. Dec 25). When auto-attaching charges, each night uses this override if set; otherwise the per-unit or global default applies."
        >
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Unit</span>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                  disabled={unitsLoading || units.length === 0}
                >
                  {units.length === 0 && (
                    <option value="">
                      {unitsLoading ? 'Loading units…' : 'No units found'}
                    </option>
                  )}
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Date</span>
                <input
                  type="date"
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, date: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Amount (PHP)</span>
                <input
                  value={overrideForm.amount}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 500"
                  inputMode="decimal"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Charge type (per night)</span>
                <select
                  value={overrideForm.chargeTypeId}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, chargeTypeId: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                >
                  <option value="">Select charge type…</option>
                  {perNightChargeTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.code} — {ct.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={!selectedUnitId || !overrideForm.chargeTypeId || !overrideForm.date || overrideForm.amount.trim() === ''}
                onClick={async () => {
                  const amount = Number(overrideForm.amount);
                  if (!Number.isFinite(amount) || amount < 0) return;
                  setOverrideLoading(true);
                  try {
                    await apiClient.post('/api/market/charge-type-date-overrides', {
                      unitId: selectedUnitId,
                      chargeTypeId: overrideForm.chargeTypeId,
                      date: overrideForm.date,
                      amount,
                    });
                    await loadOverrides(selectedUnitId);
                  } finally {
                    setOverrideLoading(false);
                  }
                }}
                className="mt-6 md:mt-auto px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-semibold hover:bg-[#0a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {overrideLoading ? 'Saving…' : 'Save override'}
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
              <table className="w-full text-sm" style={{ minWidth: 760 }}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overrides
                    .filter((o) => {
                      const pm = o.chargeType?.pricingModel;
                      return pm === 'PER_NIGHT' || pm === 'PER_PERSON_PER_NIGHT';
                    })
                    .map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-3 text-gray-800 font-medium">{o.date}</td>
                        <td className="px-4 py-3">
                          <code className="font-mono text-[11px] bg-gray-100 text-[#0b5858] px-2 py-0.5 rounded">
                            {o.chargeType?.code ?? o.chargeTypeId}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{o.chargeType?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          &#8369;{Number(o.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50"
                            onClick={async () => {
                              setOverrideLoading(true);
                              try {
                                await apiClient.delete('/api/market/charge-type-date-overrides', {
                                  body: {
                                    unitId: o.unitId,
                                    chargeTypeId: o.chargeTypeId,
                                    date: o.date,
                                  },
                                });
                                await loadOverrides(selectedUnitId);
                              } finally {
                                setOverrideLoading(false);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  {overrides.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                        {overrideLoading ? 'Loading overrides…' : 'No holiday overrides yet for this unit.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}

