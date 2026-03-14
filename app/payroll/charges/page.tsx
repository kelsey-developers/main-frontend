'use client';

import React, { useState, useEffect, useCallback } from 'react';

const PAYROLL_API = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
}

interface Charge {
  charge_id: number;
  employee_id: number;
  full_name?: string;
  position?: string;
  charge_date: string;
  description: string;
  amount: number;
  created_at: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtPeso(n: number | string) {
  return `₱ ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Charge Modal ─────────────────────────────────────────────────────────────
interface ChargeForm {
  employee_id: string;
  charge_date: string;
  description: string;
  amount: string;
}

function ChargeModal({
  charge,
  employees,
  onClose,
  onSaved,
}: {
  charge: Charge | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: (c: Charge) => void;
}) {
  const isEdit = !!charge;
  const [form, setForm]       = useState<ChargeForm>({
    employee_id: charge ? String(charge.employee_id) : '',
    charge_date: charge?.charge_date ?? '',
    description: charge?.description ?? '',
    amount:      charge ? String(charge.amount) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const set = (k: keyof ChargeForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employee_id || !form.charge_date || !form.description || !form.amount) {
      setError('All fields are required.');
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      setError('Amount must be a valid positive number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = {
        ...(isEdit ? {} : { employee_id: Number(form.employee_id) }),
        charge_date: form.charge_date,
        description: form.description,
        amount:      Number(form.amount),
      };
      const url    = isEdit ? `${PAYROLL_API}/api/charges/${charge!.charge_id}` : `${PAYROLL_API}/api/charges`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? `Server error (${res.status})`);
      }
      onSaved(await res.json());
      handleClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]';
  const lbl = 'block text-xs text-gray-500 mb-1.5';
  const QUICK_DESC = ['Lost towel', 'Lost apron', 'Lost ID', 'Lost uniform', 'Damaged equipment', 'Cash shortage'];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-300 ${visible ? 'bg-black/30 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-[420px] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900">{isEdit ? 'Edit Charge' : 'Record Charge'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Charge Details */}
        <div className="px-6 py-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Charge Details</p>
          <div className="space-y-3">
            {!isEdit && (
              <div>
                <label className={lbl}>Employee *</label>
                <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} className={inp}>
                  <option value="">Select employee…</option>
                  {employees.map(e => (
                    <option key={e.employee_id} value={e.employee_id}>{e.full_name} — {e.position}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={lbl}>Charge Date *</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="date" value={form.charge_date} onChange={e => set('charge_date', e.target.value)}
                  className={`${inp} pl-9`} />
              </div>
            </div>
            <div>
              <label className={lbl}>Description *</label>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="e.g. Lost company ID" className={inp} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {QUICK_DESC.map(d => (
                  <button key={d} type="button" onClick={() => set('description', d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.description === d
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="px-6 py-5 border-t border-gray-100">
          <p className="text-[13px] font-semibold text-gray-900 mb-4">Amount</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱</span>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0.00" className={`${inp} pl-7`} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-2.5 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Charge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChargesPage() {
  const [charges, setCharges]     = useState<Charge[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalChg, setModalChg]   = useState<Charge | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterEmp, setFilterEmp]     = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]     = useState('');

  useEffect(() => {
    fetch(`${PAYROLL_API}/api/employees`)
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchCharges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEmp)   params.set('employee_id', filterEmp);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd)   params.set('end', filterEnd);
      const res = await fetch(`${PAYROLL_API}/api/charges?${params}`);
      if (res.ok) setCharges(await res.json());
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [filterEmp, filterStart, filterEnd]);

  useEffect(() => { fetchCharges(); }, [fetchCharges]);

  const filtered = charges.filter(c => {
    if (!search) return true;
    return (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
           c.description.toLowerCase().includes(search.toLowerCase());
  });

  // Running total of visible charges
  const totalVisible = filtered.reduce((sum, c) => sum + Number(c.amount), 0);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this charge? This cannot be undone.')) return;
    setDeleting(id);
    await fetch(`${PAYROLL_API}/api/charges/${id}`, { method: 'DELETE' });
    setCharges(c => c.filter(x => x.charge_id !== id));
    setDeleting(null);
  };

  const handleSaved = (saved: Charge) => {
    setCharges(prev => {
      const idx = prev.findIndex(c => c.charge_id === saved.charge_id);
      if (idx >= 0) {
        // Preserve display fields
        const existing = prev[idx];
        const n = [...prev];
        n[idx] = { ...saved, full_name: existing.full_name, position: existing.position };
        return n;
      }
      // New charge — refresh to get employee name
      fetchCharges();
      return prev;
    });
  };

  const openAdd  = () => { setModalChg(null); setShowModal(true); };
  const openEdit = (c: Charge) => { setModalChg(c); setShowModal(true); };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Charges</h1>
          <p className="text-sm text-gray-400 mt-0.5">Record penalty deductions for lost or damaged items</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-red-500/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Record Charge
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]" />
          </div>
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30">
            <option value="">All employees</option>
            {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
          </select>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30" />
          <input type="date" value={filterEnd} min={filterStart} onChange={e => setFilterEnd(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30" />
          {(search || filterEmp || filterStart || filterEnd) && (
            <button onClick={() => { setSearch(''); setFilterEmp(''); setFilterStart(''); setFilterEnd(''); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Running total */}
      {filtered.length > 0 && (
        <div className="flex justify-end mb-3">
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Total Charges:</span>
            <span className="font-bold text-red-600">{fmtPeso(totalVisible)}</span>
            {filtered.length !== charges.length && (
              <span className="text-xs text-red-400">({filtered.length} of {charges.length} shown)</span>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading charges…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">{search || filterEmp || filterStart || filterEnd ? 'No charges match your filter' : 'No charges recorded'}</p>
            {!search && !filterEmp && !filterStart && !filterEnd && (
              <p className="text-gray-400 text-sm mt-1">Record a charge to get started</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Employee', 'Charge Date', 'Description', 'Amount', 'Recorded', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.charge_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{c.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{c.position ?? ''}</p>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{fmtDate(c.charge_date)}</td>
                    <td className="py-3.5 px-4 text-gray-700 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        {c.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-red-600">{fmtPeso(c.amount)}</td>
                    <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">{fmtDate(c.created_at)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(c.charge_id)} disabled={deleting === c.charge_id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                          {deleting === c.charge_id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer total row */}
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/50">
                  <td colSpan={3} className="py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {filtered.length} charge{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td className="py-3 px-4 font-bold text-red-600">{fmtPeso(totalVisible)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ChargeModal
          charge={modalChg}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSaved={c => { handleSaved(c); setShowModal(false); }}
        />
      )}
    </div>
  );
}
