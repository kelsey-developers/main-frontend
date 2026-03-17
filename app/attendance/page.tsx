'use client';

import { useState, useEffect, useCallback } from 'react';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const PAYROLL_PUBLIC = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? '';

interface DtrRecord {
  dtr_id: number;
  employee_id: number;
  employee_code: string;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  overtime_hours: number;
  status: 'OPEN' | 'CLOSED';
  shift_start: string | null;
  shift_end: string | null;
  full_name: string;
  position: string;
}

interface EmployeeProfile {
  employee_id: number;
  employee_code: string;
  full_name: string;
  position: string;
}

function parseUTC(dt: string): Date {
  return new Date(dt.includes('Z') || dt.includes('+') ? dt : dt.replace(' ', 'T') + 'Z');
}
function fmt12(dt: string | null): string {
  if (!dt) return '—';
  return parseUTC(dt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}
function fmtHours(h: number): string {
  if (!h) return '0h 0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
function fmtShift(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return m === 0 ? `${h12} ${ampm}` : `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function AttendancePage() {
  const { user, isEmployee, roleLoading } = useAuth();
  const router = useRouter();

  const [profile,    setProfile]    = useState<EmployeeProfile | null>(null);
  const [today,      setToday]      = useState<DtrRecord | null>(null);
  const [history,    setHistory]    = useState<DtrRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [clock,      setClock]      = useState<Date | null>(null);
  const [clocking,   setClocking]   = useState(false);
  const [clockMsg,   setClockMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setClock(new Date());
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!roleLoading && !isEmployee) router.replace('/home');
  }, [roleLoading, isEmployee, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/my-profile`);
      if (res.ok) setProfile(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchDTR = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/my`);
      if (!res.ok) return;
      const records: DtrRecord[] = await res.json();
      const todayStr = new Date().toISOString().slice(0, 10);
      setToday(records.find(r => r.work_date === todayStr) ?? null);
      setHistory(records);
      if (!profile && records.length > 0) {
        setProfile(prev => prev ?? {
          employee_id: records[0].employee_id,
          employee_code: records[0].employee_code,
          full_name: records[0].full_name,
          position: records[0].position,
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [profile]);

  useEffect(() => {
    if (!roleLoading && isEmployee) { fetchProfile(); fetchDTR(); }
  }, [roleLoading, isEmployee]);

  const handleTimeIn = async () => {
    if (!profile?.employee_id || clocking) return;
    setClocking(true);
    setClockMsg(null);
    try {
      const res = await fetch(`${PAYROLL_PUBLIC}/api/dtr/public/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: profile.employee_id }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? 'Failed to record Time In');
      }
      setClockMsg({ type: 'success', text: 'Time In recorded successfully!' });
      await fetchDTR();
    } catch (e: any) {
      setClockMsg({ type: 'error', text: e.message ?? 'Something went wrong. Try again.' });
    } finally {
      setClocking(false);
    }
  };

  const timeStr   = clock?.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) ?? '';
  const todayStr  = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isClockedIn  = !!(today?.time_in && !today?.time_out);
  const isClockedOut = !!(today?.time_in && today?.time_out);

  if (roleLoading || (!isEmployee && !roleLoading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.firstName} {user?.lastName} · {todayStr}</p>
      </div>

      {/* Clock card */}
      <div className="rounded-3xl p-6 text-white text-center" style={{ background: 'linear-gradient(135deg, #0B5858 0%, #0d7a7a 100%)' }}>
        <p className="text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.5px' }}>
          {timeStr}
        </p>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-green-400 animate-pulse' : isClockedOut ? 'bg-blue-300' : 'bg-yellow-300'}`} />
          {isClockedIn ? "Clocked In \u2014 You're working" : isClockedOut ? 'Shift Complete' : 'Not Yet Clocked In'}
        </div>

        {/* Today's times */}
        {today && (
          <div className="flex flex-col items-center gap-3 mb-5">
            {fmtShift(today.shift_start, today.shift_end) && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <svg className="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Shift: {fmtShift(today.shift_start, today.shift_end)}
              </div>
            )}
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <p className="opacity-60 text-xs mb-0.5">Time In</p>
                <p className="font-semibold">{fmt12(today.time_in)}</p>
              </div>
              <div>
                <p className="opacity-60 text-xs mb-0.5">Time Out</p>
                <p className="font-semibold">{fmt12(today.time_out)}</p>
              </div>
              <div>
                <p className="opacity-60 text-xs mb-0.5">Hours</p>
                <p className="font-semibold">{fmtHours(today.hours_worked)}</p>
              </div>
              {today.overtime_hours > 0 && (
                <div>
                  <p className="opacity-60 text-xs mb-0.5">Overtime</p>
                  <p className="font-semibold text-yellow-300">{fmtHours(today.overtime_hours)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time In button — only show if not yet clocked in today */}
        {!isClockedIn && !isClockedOut && (
          <button
            type="button"
            onClick={handleTimeIn}
            disabled={clocking || !profile}
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-4 bg-white text-[#0B5858] rounded-2xl font-bold text-base hover:bg-gray-50 active:scale-[0.98] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {clocking ? (
              <>
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-[#0B5858] border-r-transparent" />
                Recording…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time In
              </>
            )}
          </button>
        )}

        {/* Clocked in state — no button, just note */}
        {isClockedIn && (
          <p className="text-sm text-white/70 text-center">
            Your Time In is recorded. Your admin will record your Time Out.
          </p>
        )}

        {/* Done for the day */}
        {isClockedOut && (
          <p className="text-sm text-white/70 text-center">
            Your shift is complete for today. See you tomorrow!
          </p>
        )}
      </div>

      {/* Feedback message */}
      {clockMsg && (
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 text-sm font-semibold ${
          clockMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {clockMsg.type === 'success'
            ? <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {clockMsg.text}
        </div>
      )}

      {/* Attendance History */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-700">Attendance History</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent mx-auto" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No attendance records yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((r) => (
              <div key={r.dtr_id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(r.work_date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt12(r.time_in)} → {fmt12(r.time_out)}</p>
                  {fmtShift(r.shift_start, r.shift_end) && (
                    <p className="text-xs text-[#0B5858] font-medium mt-0.5">{fmtShift(r.shift_start, r.shift_end)}</p>
                  )}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{fmtHours(r.hours_worked)}</p>
                    {r.overtime_hours > 0 && (
                      <p className="text-[11px] text-amber-500 font-medium">+{fmtHours(r.overtime_hours)} OT</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    r.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'CLOSED' ? 'Done' : 'Open'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
