'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';

// All calls go through the Next.js proxy so the phone only needs to reach
// the frontend — no direct phone→payroll-backend connection required.

const SHIFT_OPTIONS = [
  { label: '9:00 AM – 3:00 PM',  start: '09:00', end: '15:00' },
  { label: '10:00 AM – 4:00 PM', start: '10:00', end: '16:00' },
  { label: '11:00 AM – 5:00 PM', start: '11:00', end: '17:00' },
  { label: '12:00 PM – 6:00 PM', start: '12:00', end: '18:00' },
];

interface EmployeeProfile {
  employee_id: number;
  full_name: string;
  position: string;
  employee_code: string;
}

interface DTRRecord {
  status: 'OPEN' | 'CLOSED';
  time_in?: string;
  time_out?: string;
  shift_start?: string;
  shift_end?: string;
}

function parseUTC(dt: string): Date {
  return new Date(dt.includes('Z') || dt.includes('+') ? dt : dt.replace(' ', 'T') + 'Z');
}
function fmt12(dt: string): string {
  return parseUTC(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

type Step = 'init' | 'shift_select' | 'confirm' | 'loading' | 'success' | 'error';

export default function ScanPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [profile,       setProfile]       = useState<EmployeeProfile | null>(null);
  const [todayDTR,      setTodayDTR]      = useState<DTRRecord | null>(null);
  const [step,          setStep]          = useState<Step>('init');
  const [action,        setAction]        = useState<'TIME_IN' | 'TIME_OUT' | null>(null);
  const [selectedShift, setSelectedShift] = useState<typeof SHIFT_OPTIONS[0] | null>(null);
  const [recordedTime,  setRecordedTime]  = useState('');
  const [errorMsg,      setErrorMsg]      = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/my-profile`);
        if (res.status === 401 || res.status === 403) {
          router.replace(`/login?redirect=/scan/${params.token}`);
          return;
        }
        if (!res.ok) {
          throw new Error('Unable to load your profile. The server may be unavailable.');
        }
        const emp: EmployeeProfile = await res.json();
        setProfile(emp);

        const todayRes = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/public/today/${emp.employee_id}`);
        const dtr: DTRRecord | null = todayRes.ok ? await todayRes.json() : null;
        setTodayDTR(dtr);

        // If already timed in → go straight to confirm (for Time Out)
        // If not timed in → show shift selection first
        if (dtr?.time_in && !dtr?.time_out) {
          setAction('TIME_OUT');
          setStep('confirm');
        } else if (dtr?.time_in && dtr?.time_out) {
          // Already fully done for today
          setAction(null);
          setStep('confirm');
        } else {
          // Not timed in yet — pick shift first
          setAction('TIME_IN');
          setStep('shift_select');
        }
      } catch {
        setErrorMsg('Unable to load your profile. Please try again.');
        setStep('error');
      }
    })();
  }, []);

  const handleRecord = async () => {
    if (!profile || !action) return;
    setStep('loading');
    try {
      const endpoint = action === 'TIME_IN' ? 'clock-in' : 'clock-out';
      const body: any = { employee_id: profile.employee_id };
      if (action === 'TIME_IN' && selectedShift) {
        body.shift_start = selectedShift.start;
        body.shift_end   = selectedShift.end;
      }
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/public/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error ?? 'Failed to record attendance');
      }
      setRecordedTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setStep('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Something went wrong. Please try again.');
      setStep('error');
    }
  };

  // ── Init ─────────────────────────────────────────────────────────────────
  if (step === 'init') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
          <div className="w-20 h-20 bg-[#0B5858]/10 rounded-full flex items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
          </div>
          <p className="text-base font-bold text-gray-700">Loading your profile…</p>
        </div>
      </Shell>
    );
  }

  // ── Shift Selection (only shown before Time In) ───────────────────────────
  if (step === 'shift_select') {
    return (
      <Shell>
        <div className="flex flex-col flex-1 px-5 py-6 gap-5">
          {/* Employee card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold">{profile?.full_name.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile?.full_name}</p>
              <p className="text-sm text-gray-500">{profile?.position}</p>
            </div>
          </div>

          {/* Shift picker */}
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1">Select Your Shift</p>
            <p className="text-xs text-gray-400 mb-4">Standard shift is 6 hours. Choose your schedule for today.</p>
            <div className="grid grid-cols-2 gap-3">
              {SHIFT_OPTIONS.map(opt => (
                <button
                  key={opt.start}
                  type="button"
                  onClick={() => setSelectedShift(opt)}
                  className={`py-4 px-3 rounded-2xl border-2 text-sm font-bold text-center transition-all ${
                    selectedShift?.start === opt.start
                      ? 'border-[#0B5858] bg-[#0B5858] text-white shadow-lg shadow-[#0B5858]/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#0B5858]/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button
              type="button"
              onClick={() => setStep('confirm')}
              disabled={!selectedShift}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-base hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg shadow-green-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
            {!selectedShift && (
              <p className="text-xs text-center text-gray-400">Please select a shift to continue</p>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
          <div className="w-20 h-20 bg-[#0B5858]/10 rounded-full flex items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">Recording {action === 'TIME_IN' ? 'Time In' : 'Time Out'}…</p>
            <p className="text-sm text-gray-500 mt-1">{profile?.full_name}</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === 'success') {
    const isIn = action === 'TIME_IN';
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center py-10">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl ${isIn ? 'bg-green-500' : 'bg-[#0B5858]'}`}>
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className={`text-3xl font-black ${isIn ? 'text-green-700' : 'text-[#0B5858]'}`}>
              {isIn ? 'Time In!' : 'Time Out!'}
            </p>
            <p className="text-base font-semibold text-gray-700 mt-2">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 mt-1">{recordedTime}</p>
            {isIn && selectedShift && (
              <p className="text-xs text-[#0B5858] font-semibold mt-2 bg-[#0B5858]/10 px-3 py-1 rounded-full inline-block">
                Shift: {selectedShift.label}
              </p>
            )}
          </div>
          <div className="w-full max-w-xs bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Summary</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Employee</span>
              <span className="font-semibold text-gray-900">{profile?.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Action</span>
              <span className={`font-bold ${isIn ? 'text-green-700' : 'text-[#0B5858]'}`}>
                {isIn ? '✓ Time In' : '✓ Time Out'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-gray-900">{recordedTime}</span>
            </div>
            {isIn && selectedShift && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shift</span>
                <span className="font-semibold text-gray-900">{selectedShift.label}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center max-w-xs">Attendance recorded. You may close this page.</p>
        </div>
      </Shell>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-6 text-center py-10">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-red-700">Something went wrong</p>
            <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
          </div>
          <button type="button" onClick={() => router.replace(`/login?redirect=/scan/${params.token}`)}
            className="w-full max-w-xs py-4 bg-[#0B5858] text-white rounded-2xl font-bold text-base hover:bg-[#094444] transition-all">
            Log In to Continue
          </button>
        </div>
      </Shell>
    );
  }

  // ── Confirm — final action screen ─────────────────────────────────────────
  const isTimedIn  = !!(todayDTR?.time_in && !todayDTR?.time_out);
  const isComplete = !!(todayDTR?.time_in && todayDTR?.time_out);

  return (
    <Shell>
      <div className="flex flex-col flex-1 px-5 py-6 gap-5">
        {/* Date + clock */}
        <div className="bg-[#0B5858]/5 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Today</p>
            <p className="text-sm font-bold text-[#0B5858]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <LiveClock />
        </div>

        {/* Employee card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-[#0B5858]/20">
            <span className="text-white font-bold text-lg">{profile?.full_name.substring(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-gray-900 truncate">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{profile?.position}</p>
            <p className="text-xs text-gray-400 mt-0.5">{profile?.employee_code}</p>
          </div>
        </div>

        {/* Today's record */}
        {todayDTR?.time_in && (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today&apos;s Record</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time In</span>
              <span className="font-semibold text-gray-900">{fmt12(todayDTR.time_in)}</span>
            </div>
            {todayDTR.time_out && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time Out</span>
                <span className="font-semibold text-gray-900">{fmt12(todayDTR.time_out)}</span>
              </div>
            )}
            {selectedShift && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shift</span>
                <span className="font-semibold text-gray-900">{selectedShift.label}</span>
              </div>
            )}
          </div>
        )}

        {/* Action */}
        {isComplete ? (
          <div className="flex flex-col items-center gap-3 mt-auto text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-700">Shift Complete</p>
            <p className="text-sm text-gray-400">You have already completed your shift for today.</p>
          </div>
        ) : (
          <div className="mt-auto space-y-3">
            {/* Selected shift badge (for time out) */}
            {isTimedIn && selectedShift && (
              <div className="bg-[#0B5858]/5 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Shift</span>
                <span className="text-sm font-bold text-[#0B5858]">{selectedShift.label}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRecord}
              className={`w-full py-5 rounded-2xl font-bold text-lg text-white transition-all active:scale-[0.98] shadow-lg ${
                isTimedIn
                  ? 'bg-[#0B5858] hover:bg-[#094444] shadow-[#0B5858]/20'
                  : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
              }`}
            >
              {isTimedIn ? '✓ Record Time Out' : '✓ Record Time In'}
            </button>
            <p className="text-xs text-center text-gray-400">
              {isTimedIn ? 'Tap to record your Time Out for today' : 'Tap to record your Time In for today'}
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="px-5 pt-8 pb-5 border-b border-gray-100 bg-white flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0B5858] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0B5858]/30">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-black text-gray-900 tracking-tight">Daily Time Record</p>
          <p className="text-xs text-gray-500">Kelsey&apos;s Homestay</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
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
