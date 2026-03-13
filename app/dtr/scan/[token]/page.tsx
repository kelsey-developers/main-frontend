'use client';

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

type EmployeeRole = 'HOUSEKEEPING' | 'ADMIN';

interface Employee {
  employee_id: number;
  full_name: string;
  position: string;
  employee_code: string;
  role: EmployeeRole;
}

interface DTRRecord {
  dtr_id: number;
  status: 'OPEN' | 'CLOSED';
  time_in: string;
  time_out?: string;
}

type ScanStep = 'select' | 'confirming' | 'success' | 'error';

export default function DTRScanPage({ params }: { params: { token: string } }) {
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [step, setStep]               = useState<ScanStep>('select');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [action, setAction]           = useState<'TIME_IN' | 'TIME_OUT' | null>(null);
  const [recordedTime, setRecordedTime] = useState('');
  const [errorMsg, setErrorMsg]       = useState('');

  useEffect(() => {
    if (!API_BASE) { setLoading(false); return; }
    fetch(`${API_BASE}/api/employees`)
      .then(r => r.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered     = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );
  const housekeeping = filtered.filter(e => e.role === 'HOUSEKEEPING');
  const admins       = filtered.filter(e => e.role === 'ADMIN');

  const handleSelect = async (emp: Employee) => {
    setSelectedEmp(emp);
    setStep('confirming');

    try {
      // 1. Check today's DTR using the correct endpoint
      const dtrRes = await fetch(`${API_BASE}/api/dtr/employee/${emp.employee_id}/today`);
      const dtr: DTRRecord | null = dtrRes.ok ? await dtrRes.json() : null;

      const isTimedIn = dtr?.status === 'OPEN';
      const nextAction: 'TIME_IN' | 'TIME_OUT' = isTimedIn ? 'TIME_OUT' : 'TIME_IN';
      setAction(nextAction);

      // 2. Perform the action using the correct endpoints
      if (nextAction === 'TIME_IN') {
        const res = await fetch(`${API_BASE}/api/dtr/clock-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: emp.employee_id,
            work_date:  new Date().toISOString().split('T')[0],
          }),
        });
        if (!res.ok) throw new Error('Failed to clock in');
      } else {
        // TIME_OUT — needs the dtr_id from the open record
        const res = await fetch(`${API_BASE}/api/dtr/${dtr!.dtr_id}/clock-out`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to clock out');
      }

      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      });
      setRecordedTime(now);
      setStep('success');
    } catch (e) {
      setErrorMsg('Something went wrong. Please try again or ask your admin.');
      setStep('error');
    }
  };

  const reset = () => {
    setStep('select');
    setSelectedEmp(null);
    setAction(null);
    setRecordedTime('');
    setErrorMsg('');
    setSearch('');
  };

  // ── Confirming ─────────────────────────────────────────────────────────────
  if (step === 'confirming') {
    return (
      <MobileShell>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center">
          <div className="w-20 h-20 bg-[#0B5858]/10 rounded-full flex items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Recording…</p>
            <p className="text-sm text-gray-500 mt-1">{selectedEmp?.full_name}</p>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    const isTimeIn = action === 'TIME_IN';
    return (
      <MobileShell>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl ${isTimeIn ? 'bg-green-500' : 'bg-red-500'}`}>
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className={`text-2xl font-black ${isTimeIn ? 'text-green-700' : 'text-red-600'}`}>
              {isTimeIn ? 'Time In Recorded!' : 'Time Out Recorded!'}
            </p>
            <p className="text-base font-semibold text-gray-700 mt-2">{selectedEmp?.full_name}</p>
            <p className="text-sm text-gray-500 mt-1">{recordedTime}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 text-left space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Employee</span>
              <span className="font-semibold text-gray-900">{selectedEmp?.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Action</span>
              <span className={`font-bold ${isTimeIn ? 'text-green-700' : 'text-red-600'}`}>
                {isTimeIn ? '✓ Time In' : '✗ Time Out'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-gray-900">{recordedTime}</span>
            </div>
          </div>
          <button type="button" onClick={reset}
            className="w-full py-4 bg-[#0B5858] text-white rounded-2xl font-bold text-base hover:bg-[#094444] transition-all active:scale-[0.98]">
            Done
          </button>
        </div>
      </MobileShell>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <MobileShell>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-red-700">Something went wrong</p>
            <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
          </div>
          <button type="button" onClick={reset}
            className="w-full py-4 bg-[#0B5858] text-white rounded-2xl font-bold text-base">
            Try Again
          </button>
        </div>
      </MobileShell>
    );
  }

  // ── Employee selection ─────────────────────────────────────────────────────
  return (
    <MobileShell>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#0B5858] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0B5858]/30">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-black text-gray-900 tracking-tight">Daily Time Record</p>
            <p className="text-xs text-gray-500">Kelsey's Homestay</p>
          </div>
        </div>

        <div className="bg-[#0B5858]/5 rounded-2xl px-4 py-3 flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Today</p>
            <p className="text-sm font-bold text-[#0B5858]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <LiveClock />
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your name…"
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]"
          />
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center font-medium">
          Tap your name to record Time In or Time Out
        </p>
      </div>

      {/* Employee list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-gray-500">No employees loaded</p>
            <p className="text-xs text-gray-400 mt-1">Please check with your admin</p>
          </div>
        ) : (
          <>
            {housekeeping.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Housekeeping · {housekeeping.length}
                </p>
                <div className="space-y-2">
                  {housekeeping.map(emp => (
                    <EmployeeButton key={emp.employee_id} emp={emp} onSelect={handleSelect} />
                  ))}
                </div>
              </div>
            )}
            {admins.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Admin Staff · {admins.length}
                </p>
                <div className="space-y-2">
                  {admins.map(emp => (
                    <EmployeeButton key={emp.employee_id} emp={emp} onSelect={handleSelect} />
                  ))}
                </div>
              </div>
            )}
            {filtered.length === 0 && search && (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-gray-500">No results for &ldquo;{search}&rdquo;</p>
              </div>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {children}
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    setTime(fmt());
    const t = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(t);
  }, []);
  return <p className="text-lg font-mono font-bold text-[#0B5858]">{time}</p>;
}

function EmployeeButton({ emp, onSelect }: { emp: Employee; onSelect: (e: Employee) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emp)}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 active:scale-[0.98] transition-all text-left shadow-sm"
    >
      <div className="w-11 h-11 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-[#0B5858]/20">
        <span className="text-white font-bold text-sm">{emp.full_name.substring(0, 2).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">{emp.full_name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.position}</p>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
        emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
      }`}>
        {emp.role === 'ADMIN' ? 'Admin' : 'HK'}
      </span>
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}