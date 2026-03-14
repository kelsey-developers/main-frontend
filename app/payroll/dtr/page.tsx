'use client';

import React, { useState, useEffect, useCallback } from 'react';

const PAYROLL_API = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
  employment_type: string;
}

interface DTRRecord {
  dtr_id: number;
  employee_id: number;
  full_name?: string;
  position?: string;
  employment_type?: string;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  overtime_hours: number;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(dt: string | null) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── DTR Modal ────────────────────────────────────────────────────────────────
interface DTRForm {
  employee_id: string;
  work_date: string;
  time_in: string;
  time_out: string;
  notes: string;
}

function DTRModal({
  record,
  employees,
  onClose,
  onSaved,
}: {
  record: DTRRecord | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: (r: DTRRecord) => void;
}) {
  const isEdit = !!record;
  const [form, setForm]       = useState<DTRForm>({
    employee_id: record ? String(record.employee_id) : '',
    work_date:   record?.work_date ?? '',
    time_in:     record?.time_in  ? record.time_in.replace(' ', 'T').slice(0, 16)  : '',
    time_out:    record?.time_out ? record.time_out.replace(' ', 'T').slice(0, 16) : '',
    notes:       record?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState<{ hours: number; ot: number } | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  // Live OT preview
  useEffect(() => {
    if (form.time_in && form.time_out) {
      const hw = (new Date(form.time_out).getTime() - new Date(form.time_in).getTime()) / 3600000;
      if (hw > 0) setPreview({ hours: parseFloat(hw.toFixed(2)), ot: parseFloat(Math.max(0, hw - 8).toFixed(2)) });
      else setPreview(null);
    } else {
      setPreview(null);
    }
  }, [form.time_in, form.time_out]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const set = (k: keyof DTRForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!isEdit && (!form.employee_id || !form.work_date)) {
      setError('Employee and work date are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        work_date: form.work_date,
        notes:     form.notes || null,
      };
      if (!isEdit) body.employee_id = Number(form.employee_id);
      if (form.time_in)  body.time_in  = form.time_in;
      if (form.time_out) body.time_out = form.time_out;

      const url    = isEdit ? `${PAYROLL_API}/api/dtr/${record!.dtr_id}` : `${PAYROLL_API}/api/dtr`;
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

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]';
  const labelClass = 'block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-300 ${visible ? 'bg-black/30 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-md transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 text-base">{isEdit ? 'Edit DTR Entry' : 'Log DTR Entry'}</h2>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">{error}</div>}

          {!isEdit && (
            <div>
              <label className={labelClass}>Employee *</label>
              <select value={form.employee_id} onChange={e => set('employee_id', e.target.value)} className={inputClass}>
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{e.full_name} — {e.position}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Work Date *</label>
            <input type="date" value={form.work_date} onChange={e => set('work_date', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Time In</label>
              <input type="datetime-local" value={form.time_in} onChange={e => set('time_in', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Time Out</label>
              <input type="datetime-local" value={form.time_out} min={form.time_in} onChange={e => set('time_out', e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Live calculation preview */}
          {preview && (
            <div className={`flex gap-4 p-3 rounded-2xl text-sm ${preview.ot > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hours Worked</p>
                <p className="font-bold text-gray-900">{preview.hours}h</p>
              </div>
              {preview.ot > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Overtime</p>
                  <p className="font-bold text-orange-600">{preview.ot}h ⚡</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>Notes</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes…" className={inputClass} />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handleClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl font-medium text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-[#0B5858] hover:bg-[#094444] text-white py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-[#0B5858]/20 disabled:opacity-60">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DTRPage() {
  const [records, setRecords]     = useState<DTRRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalRec, setModalRec]   = useState<DTRRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterEmp, setFilterEmp]     = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]     = useState('');

  // Load employees for dropdown
  useEffect(() => {
    fetch(`${PAYROLL_API}/api/employees`)
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const fetchDTR = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEmp)   params.set('employee_id', filterEmp);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd)   params.set('end', filterEnd);
      const res = await fetch(`${PAYROLL_API}/api/dtr/all?${params}`);
      if (res.ok) setRecords(await res.json());
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [filterEmp, filterStart, filterEnd]);

  useEffect(() => { fetchDTR(); }, [fetchDTR]);

  const filtered = records.filter(r => {
    if (!search) return true;
    return (r.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
           (r.position ?? '').toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this DTR entry? This cannot be undone.')) return;
    setDeleting(id);
    await fetch(`${PAYROLL_API}/api/dtr/${id}`, { method: 'DELETE' });
    setRecords(r => r.filter(x => x.dtr_id !== id));
    setDeleting(null);
  };

  const handleSaved = (saved: DTRRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.dtr_id === saved.dtr_id);
      if (idx >= 0) {
        // Merge employee info for display
        const existing = prev[idx];
        const n = [...prev];
        n[idx] = { ...saved, full_name: existing.full_name, position: existing.position };
        return n;
      }
      // New record — fetch fresh list to get employee info
      fetchDTR();
      return prev;
    });
  };

  const openAdd  = () => { setModalRec(null); setShowModal(true); };
  const openEdit = (r: DTRRecord) => { setModalRec(r); setShowModal(true); };

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Time Records</h1>
          <p className="text-sm text-gray-400 mt-0.5">Log and manage employee attendance</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#0B5858] hover:bg-[#094444] text-white px-5 py-2.5 rounded-2xl font-semibold text-sm transition-colors shadow-lg shadow-[#0B5858]/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Log DTR Entry
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
              placeholder="Search by name…"
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

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading DTR records…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No DTR records found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting the filters or log a new entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Employee', 'Work Date', 'Time In', 'Time Out', 'Hours', 'Overtime', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.dtr_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{r.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{r.position ?? ''}</p>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{fmtDate(r.work_date)}</td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{fmtTime(r.time_in)}</td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{fmtTime(r.time_out)}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {Number(r.hours_worked) > 0 ? `${Number(r.hours_worked).toFixed(1)}h` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {Number(r.overtime_hours) > 0 ? (
                        <span className="flex items-center gap-1 text-orange-600 font-semibold">
                          <span>⚡</span>{Number(r.overtime_hours).toFixed(1)}h OT
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(r.dtr_id)} disabled={deleting === r.dtr_id}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-colors disabled:opacity-50">
                          {deleting === r.dtr_id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <DTRModal
          record={modalRec}
          employees={employees}
          onClose={() => setShowModal(false)}
          onSaved={r => { handleSaved(r); setShowModal(false); }}
        />
      )}
    </div>
  );
}
