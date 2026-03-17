'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getTodayDTR, timeIn, timeOut, getTodayTasks, uploadTaskPhoto } from '@/services/dtrService';

const PAYROLL_API = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cleaner {
  employee_id: number;
  full_name: string;
  position: string;
  employee_code: string;
  role: string;
}

interface DTRRecord {
  dtr_id: number;
  employee_id: number;
  work_date: string;
  time_in: string;
  time_out?: string;
  hours_worked?: number;
  status: 'OPEN' | 'CLOSED';
  proof_photo?: string;
  tasks_completed?: string;
  shift_start?: string;
  shift_end?: string;
}

interface TaskLog {
  task_id: number;
  unit_name: string;
  task_type: string;
  completed_at: string;
  proof_photo_url: string;
  status: 'COMPLETED' | 'VERIFIED';
}

// ─── CARD tokens ──────────────────────────────────────────────────────────────
const CARD = {
  base:     'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding:  'p-6',
  header:   'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  label:    'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  subtitle: 'text-xs font-medium text-gray-500',
  innerRow: 'p-4 rounded-2xl border border-gray-100',
} as const;

// ─── Shift options ────────────────────────────────────────────────────────────
const SHIFT_OPTIONS = [
  { label: '9:00 AM – 3:00 PM',  start: '09:00', end: '15:00' },
  { label: '10:00 AM – 4:00 PM', start: '10:00', end: '16:00' },
  { label: '11:00 AM – 5:00 PM', start: '11:00', end: '17:00' },
  { label: '12:00 PM – 6:00 PM', start: '12:00', end: '18:00' },
];

/** Parse a MySQL UTC datetime string ("2026-03-17 12:00:00") as UTC so it
 *  displays correctly in the user's local timezone. */
function parseUTC(dt: string): Date {
  // Replace space with T and append Z to mark as UTC
  return new Date(dt.includes('Z') || dt.includes('+') ? dt : dt.replace(' ', 'T') + 'Z');
}

function getShiftStatus() {
  const now = new Date();
  const earliest = new Date(now); earliest.setHours(9, 0, 0, 0);
  const latest   = new Date(now); latest.setHours(12, 0, 0, 0);
  if (now < earliest) return { label: 'Not Within Shift Hours',   color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' };
  if (now <= latest)  return { label: 'Within Shift Hours',       color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200'  };
  return                     { label: 'Shift Start Hours Passed', color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200'    };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, visible }: { message: string; type: 'success' | 'error'; visible: boolean }) {
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}`}>
      <div className={`px-6 py-4 rounded-2xl shadow-2xl text-white font-semibold flex items-center gap-3 min-w-72 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
        {type === 'success'
          ? <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        }
        {message}
      </div>
    </div>
  );
}

// ─── Employee Picker ──────────────────────────────────────────────────────────
function EmployeePicker({ employees, onSelect, isLoading }: {
  employees: Cleaner[];
  onSelect: (emp: Cleaner) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Time Record</h1>
          <p className="text-sm text-gray-500 mt-1">Select an employee to view or record their DTR.</p>
        </div>
        {/* QR Management button */}
        <Link
          href="/dtr/qr"
          className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98] shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 4h4v4H4V4zm0 12h4v4H4v-4zm12-12h4v4h-4V4z" />
          </svg>
          QR Code
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4">
        <div className={`${CARD.base} ${CARD.padding} border border-gray-200 bg-white`}>
          <p className={`${CARD.label} mb-2`}>Total Employees</p>
          <p className="text-3xl font-bold text-[#0B5858]">{isLoading ? '—' : String(employees.length)}</p>
        </div>
      </div>

      {/* Employee list card — full width */}
      <div className={CARD.base}>
        <div className={CARD.header}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Select Employee</h2>
              <p className={`${CARD.subtitle} mt-0.5`}>Search by name or position</p>
            </div>
            {/* Search bar */}
            <div className="sm:ml-auto relative sm:w-72">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or position…"
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {search && (
            <p className="text-xs text-gray-400 mt-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;</p>
          )}
        </div>

        <div className={CARD.padding}>
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
              <p className="text-sm text-gray-400">Loading employees…</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-500">No employees found</p>
              <p className="text-xs text-gray-400 mt-1">Connect your backend to load employees.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-bold text-gray-500">No results for &ldquo;{search}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div>
              <p className={`${CARD.label} mb-3`}>Employees · {filtered.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(emp => (
                  <EmployeeCard key={emp.employee_id} emp={emp} onSelect={onSelect} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({ emp, onSelect }: { emp: Cleaner; onSelect: (e: Cleaner) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emp)}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all text-left group`}
    >
      <div className="w-11 h-11 bg-gradient-to-br from-[#0B5858] to-[#063d3d] rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-[#0B5858]/20">
        <span className="text-white font-bold text-sm">{(emp.full_name ?? 'ME').substring(0, 2).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 group-hover:text-[#0B5858] transition-colors truncate">{emp.full_name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.position}</p>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-gray-100 text-gray-600">
        Employee
      </span>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#0B5858] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── DTR Detail View ──────────────────────────────────────────────────────────
function DTRDetail({
  cleaner,
  onBack,
  showToast,
}: {
  cleaner: Cleaner;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [currentDTR, setCurrentDTR]       = useState<DTRRecord | null>(null);
  const [todaysTasks, setTodaysTasks]     = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [selectedShift, setSelectedShift] = useState<typeof SHIFT_OPTIONS[0] | null>(null);
  const [currentTime, setCurrentTime]     = useState('');
  const [isMounted, setIsMounted]         = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [taskType, setTaskType]           = useState('Cleaning');
  const [location, setLocation]           = useState('');
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [preview, setPreview]             = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setIsMounted(true);
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    setCurrentTime(fmt());
    const t = setInterval(() => setCurrentTime(fmt()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dtr, tasks] = await Promise.all([
          getTodayDTR(cleaner.employee_id, today),
          getTodayTasks(cleaner.employee_id, today),
        ]);
        if (dtr) {
          setCurrentDTR(dtr);
          if (dtr.status === 'OPEN' && dtr.shift_start) {
            const match = SHIFT_OPTIONS.find(s => s.start === dtr.shift_start);
            if (match) setSelectedShift(match);
          }
        }
        setTodaysTasks(tasks ?? []);
      } catch {
        showToast('Failed to load DTR data', 'error');
      }
    };
    load();
  }, [cleaner.employee_id]);

  // Poll every 10 seconds to reflect QR scan updates in real time
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const dtr = await getTodayDTR(cleaner.employee_id, today);
        if (dtr) setCurrentDTR(dtr);
        const tasks = await getTodayTasks(cleaner.employee_id, today);
        if (tasks) setTodaysTasks(tasks);
      } catch {}
    }, 10_000);
    return () => clearInterval(interval);
  }, [cleaner.employee_id]);

  const isTimedIn   = currentDTR?.status === 'OPEN';
  const shiftStatus = getShiftStatus();
  const hoursWorked = currentDTR?.time_in && isTimedIn
    ? ((Date.now() - parseUTC(currentDTR.time_in).getTime()) / 3_600_000).toFixed(1)
    : (parseFloat(String(currentDTR?.hours_worked ?? 0))).toFixed(1);
  const timeInFmt  = currentDTR?.time_in  ? parseUTC(currentDTR.time_in).toLocaleTimeString('en-US',  { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
  const timeOutFmt = currentDTR?.time_out ? parseUTC(currentDTR.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

  const handleTimeIn = async () => {
    setIsLoading(true);
    try {
      const dtr = await timeIn(cleaner.employee_id, today, selectedShift?.start, selectedShift?.end);
      setCurrentDTR(dtr); showToast('Time In recorded successfully', 'success');
    } catch { showToast('Failed to record Time In', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleTimeOut = async () => {
    if (!currentDTR) return;
    setIsLoading(true);
    try {
      const dtr = await timeOut(cleaner.employee_id, currentDTR.dtr_id);
      setCurrentDTR(dtr); showToast('Time Out recorded successfully', 'success');
    } catch { showToast('Failed to record Time Out', 'error'); }
    finally { setIsLoading(false); }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !location || !currentDTR) return;
    setIsUploading(true);
    try {
      const task = await uploadTaskPhoto(cleaner.employee_id, currentDTR.dtr_id, selectedFile, taskType, location);
      setTodaysTasks(prev => [...prev, task]);
      setSelectedFile(null); setPreview(null); setLocation('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Work photo uploaded', 'success');
    } catch { showToast('Failed to upload photo', 'error'); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {/* ── UPDATED: square back button to match Manage Users style ── */}
        <button type="button" onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daily Time Record</h1>
        </div>
        <div className="ml-auto">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${cleaner.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
            {cleaner.role}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Status',       value: isTimedIn ? '● Signed In' : '○ Not Started', color: isTimedIn ? 'text-green-700' : 'text-gray-400' },
          { label: 'Hours Today',  value: `${hoursWorked}h`,                            color: 'text-blue-700'   },
          { label: 'Photos Today', value: String(todaysTasks.length),                   color: 'text-amber-700'  },
          { label: 'Employee ID',  value: cleaner.employee_code,                         color: 'text-[#0B5858] font-mono' },
        ].map(s => (
          <div key={s.label} className={`${CARD.base} ${CARD.padding}`}>
            <p className={`${CARD.label} mb-2`}>{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left col (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Clock card */}
          <div className={CARD.base}>
            <div className="bg-gradient-to-r from-[#0B5858] to-[#094444] text-white p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <p className="text-xs text-teal-200 mb-1 font-semibold uppercase tracking-widest">Current Time</p>
                  {isMounted && <p className="text-4xl font-mono font-bold">{currentTime}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-teal-200 mb-1 font-semibold uppercase tracking-widest">Today</p>
                  <p className="text-base font-semibold">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {selectedShift && (
                <div className="mb-4 flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2">
                  <svg className="w-4 h-4 text-teal-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-teal-100">Shift: {selectedShift.label}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[['Time In', timeInFmt], ['Time Out', timeOutFmt]].map(([lbl, val]) => (
                  <div key={lbl} className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs text-teal-200 mb-1 font-semibold">{lbl}</p>
                    <p className="text-xl font-bold">{val ?? '-- : --'}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={handleTimeIn}
                  disabled={!!isTimedIn || isLoading || shiftStatus.label !== 'Within Shift Hours'}
                  className={`flex-1 py-3.5 rounded-2xl font-bold transition-all ${
                    !!isTimedIn || isLoading || shiftStatus.label !== 'Within Shift Hours'
                      ? 'bg-white/20 text-white/50 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-400 text-white shadow-lg'
                  }`}>
                  {isLoading ? 'Processing…' : '✓ Time In'}
                </button>
                <button type="button" onClick={handleTimeOut}
                  disabled={!isTimedIn || isLoading}
                  className={`flex-1 py-3.5 rounded-2xl font-bold transition-all ${
                    !isTimedIn || isLoading
                      ? 'bg-white/20 text-white/50 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-lg'
                  }`}>
                  {isLoading ? 'Processing…' : '✗ Time Out'}
                </button>
              </div>

              {isTimedIn && (
                <div className="mt-4 bg-green-500/20 border border-green-400/30 rounded-2xl p-3 text-center">
                  <p className="text-sm font-semibold text-green-100 animate-pulse">
                    ● Currently signed in · {hoursWorked}h on duty
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Shift selector */}
          <div className={CARD.base}>
            <div className={CARD.header}>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Shift Schedule</h2>
              <p className={`${CARD.subtitle} mt-1`}>Standard shift is 6 hours. Select your offset if applicable.</p>
            </div>
            <div className={CARD.padding}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {SHIFT_OPTIONS.map(opt => {
                  const selected = selectedShift?.start === opt.start;
                  return (
                    <button key={opt.start} type="button" disabled={!!isTimedIn}
                      onClick={() => setSelectedShift(opt)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all text-center ${
                        selected
                          ? 'bg-[#0B5858] text-white border-[#0B5858] shadow-md shadow-[#0B5858]/20'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#0B5858]/40 hover:text-[#0B5858]'
                      } ${isTimedIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${shiftStatus.bg} ${shiftStatus.border}`}>
                <span className={`w-2 h-2 rounded-full ${shiftStatus.color.replace('text-', 'bg-')}`} />
                <span className={`text-xs font-bold ${shiftStatus.color}`}>{shiftStatus.label}</span>
              </div>
            </div>
          </div>

          {/* Photo upload — housekeeping only */}
          {cleaner.role === 'HOUSEKEEPING' && (
            <div className={CARD.base}>
              <div className={CARD.header}>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Work Photo Log</h2>
                <p className={`${CARD.subtitle} mt-1`}>Upload photos of completed work as evidence</p>
              </div>
              <div className={CARD.padding}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors mb-4 ${
                    preview ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-[#0B5858]/40'
                  }`}>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setSelectedFile(f);
                      const r = new FileReader(); r.onloadend = () => setPreview(r.result as string); r.readAsDataURL(f);
                    }} />
                  {preview
                    ? <img src={preview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
                    : (
                      <div className="space-y-2 py-4">
                        <svg className="w-9 h-9 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm font-semibold text-gray-500">Click to upload or take a photo</p>
                      </div>
                    )
                  }
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Task Type</label>
                    <select value={taskType} onChange={e => setTaskType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30">
                      {['Cleaning','Laundry','Inspection','Maintenance','Other'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Location / Room</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Room 101"
                      className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30" />
                  </div>
                </div>
                <button type="button" onClick={handlePhotoUpload}
                  disabled={!selectedFile || !location || !isTimedIn || isUploading}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                    !selectedFile || !location || !isTimedIn || isUploading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#0B5858] text-white hover:bg-[#094444] shadow-md shadow-[#0B5858]/20'
                  }`}>
                  {isUploading ? 'Uploading…' : 'Upload Work Photo'}
                </button>
                {!isTimedIn && (
                  <p className="mt-3 text-xs text-center text-amber-700 bg-amber-50 rounded-2xl p-3">
                    You must sign in first to upload work photos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin duty panel */}
          {cleaner.role === 'ADMIN' && (
            <div className={CARD.base}>
              <div className={CARD.header}>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Online Duty Summary</h2>
                <p className={`${CARD.subtitle} mt-1`}>Admins work online — queries, gatepasses, and booking confirmations.</p>
              </div>
              <div className={CARD.padding}>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    { lbl: 'Duty Status',   val: isTimedIn ? '● Online' : '○ Offline', color: isTimedIn ? 'text-green-700' : 'text-gray-400' },
                    { lbl: 'Hours on Duty', val: `${hoursWorked}h`,                    color: 'text-blue-700'   },
                    { lbl: 'Role',          val: 'Admin',                               color: 'text-purple-700' },
                  ].map(s => (
                    <div key={s.lbl} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1 font-semibold">{s.lbl}</p>
                      <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Admin Responsibilities</p>
                  <ul className="text-xs text-blue-700 space-y-1.5">
                    {['Answer queries from agents and guests','Issue gatepasses for check-ins','Accept down-payments for bookings','Coordinate with housekeeping as needed'].map(r => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right col (1/3) ── */}
        <div className="space-y-5">

          {/* Today's work log */}
          {cleaner.role === 'HOUSEKEEPING' && (
            <div className={CARD.base}>
              <div className={CARD.header}>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Today's Work Log</h2>
                <p className={`${CARD.subtitle} mt-1`}>{todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''} completed</p>
              </div>
              <div className={CARD.padding}>
                {todaysTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No photos uploaded yet today</p>
                ) : (
                  <div className="space-y-3">
                    {todaysTasks.map((task, idx) => (
                      <div key={task.task_id ?? idx} className={`${CARD.innerRow} flex gap-3 items-start`}>
                        <img src={task.proof_photo_url} alt="Work" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{task.task_type}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{task.unit_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${task.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {task.status === 'VERIFIED' ? 'Verified' : 'Pending'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {parseUTC(task.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reminders */}
          <div className="bg-[#0B5858]/5 rounded-3xl border border-[#0B5858]/10 p-5">
            <p className="text-xs font-bold text-[#0B5858] uppercase tracking-widest mb-3">Important Reminders</p>
            <ul className="space-y-2 text-xs text-[#0B5858]/80">
              {(cleaner.role === 'HOUSEKEEPING'
                ? ['Always sign in when you arrive','Upload clear photos of completed work','Include room number in description','Sign out before leaving']
                : ['Sign in when you begin online duty','Respond promptly to agent queries','Issue gatepasses and confirm bookings','Sign out at end of shift']
              ).map(r => <li key={r}>• {r}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function CleanerDTRPage() {
  const [employees, setEmployees] = useState<Cleaner[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [cleaner, setCleaner]       = useState<Cleaner | null>(null);
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error'; visible: boolean } | null>(null);
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (t1.current) clearTimeout(t1.current);
    if (t2.current) clearTimeout(t2.current);
    setToast({ message, type, visible: false });
    requestAnimationFrame(() => requestAnimationFrame(() => setToast({ message, type, visible: true })));
    t1.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
      t2.current = setTimeout(() => setToast(null), 400);
    }, 5000);
  };

  useEffect(() => {
    if (!PAYROLL_API) { setLoadingEmp(false); return; }
    fetch(`${PAYROLL_API}/api/dtr/public/employees`)
      .then(r => r.json())
      .then((data: Cleaner[]) => setEmployees(data))
      .catch(() => {})
      .finally(() => setLoadingEmp(false));
  }, []);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} visible={toast.visible} />}
      {cleaner
        ? <DTRDetail cleaner={cleaner} onBack={() => setCleaner(null)} showToast={showToast} />
        : <EmployeePicker employees={employees} onSelect={emp => setCleaner(emp)} isLoading={loadingEmp} />
      }
    </>
  );
}