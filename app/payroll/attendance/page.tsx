'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsQR from 'jsqr';
import { PAYROLL_API_BASE, payrollFetch } from '@/lib/api/payroll';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DtrRecord {
  dtr_id: number;
  employee_id: number;
  employee_code: string;
  full_name: string;
  position: string;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  overtime_hours: number;
  status: 'OPEN' | 'CLOSED';
  photo_in: string | null;
  photo_out: string | null;
  ip_in: string | null;
  ip_out: string | null;
}

function fmt12(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtHours(h: number) {
  if (!h) return '0h 0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
const QR_PREFIX = 'PAYROLL:EMP_CODE:';

function QRScanner({
  onScanned,
}: {
  onScanned: (employeeCode: string) => void;
}) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const streamRef  = useRef<MediaStream | null>(null);
  const lastScan   = useRef<string>('');

  const [started,  setStarted]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
    setStarted(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });

    if (code?.data.startsWith(QR_PREFIX)) {
      const empCode = code.data.slice(QR_PREFIX.length);
      if (empCode !== lastScan.current) {
        lastScan.current = empCode;
        setDetected(empCode);
        // Short pause after detection to avoid double-triggering
        setTimeout(() => {
          lastScan.current = '';
          setDetected(null);
        }, 3000);
        onScanned(empCode);
        return; // pause scanning
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onScanned]);

  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStarted(true);
      setScanning(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCamError('Camera access denied. Please allow camera permission and try again.');
    }
  }, [scanFrame]);

  // Restart scanning after result is dismissed
  const resumeScan = useCallback(() => {
    lastScan.current = '';
    setDetected(null);
    if (streamRef.current) {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, [scanFrame]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="font-bold text-gray-900">QR Scanner</h2>
        <p className="text-xs text-gray-400 mt-0.5">Point camera at an employee's QR code to clock them in or out</p>
      </div>

      <div className="p-6">
        {!started ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-[#0B5858]/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#0B5858]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 14h2m3 0h1M14 17h1m2 0h3M14 20h3m2 0h1" />
              </svg>
            </div>
            {camError && (
              <p className="text-sm text-red-600 text-center max-w-xs">{camError}</p>
            )}
            <button onClick={startCamera}
              className="flex items-center gap-2 bg-[#0B5858] hover:bg-[#094444] text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              Open Camera
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted className="w-full block" />
              {/* Targeting overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-52 h-52 relative transition-all duration-300 ${detected ? 'scale-110' : ''}`}>
                  {/* Corner borders */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute w-8 h-8 ${pos} ${detected ? 'border-green-400' : 'border-white'} transition-colors duration-300`}
                      style={{
                        borderTopWidth:    i < 2 ? 3 : 0,
                        borderBottomWidth: i >= 2 ? 3 : 0,
                        borderLeftWidth:   i % 2 === 0 ? 3 : 0,
                        borderRightWidth:  i % 2 === 1 ? 3 : 0,
                        borderRadius: i === 0 ? '6px 0 0 0' : i === 1 ? '0 6px 0 0' : i === 2 ? '0 0 0 6px' : '0 0 6px 0',
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Scan indicator */}
              {scanning && !detected && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Scanning…
                </div>
              )}
              {detected && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
                  QR Detected
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={() => { stopCamera(); resumeScan(); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Resume scanning button (shown after detection) */}
      {started && detected && (
        <div className="px-6 pb-4 text-center">
          <button onClick={resumeScan}
            className="text-xs text-[#0B5858] font-semibold hover:opacity-70 transition-opacity">
            Scan another employee →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Clock Action Card ─────────────────────────────────────────────────────────
interface ScanResult {
  record: DtrRecord | null;
  employeeCode: string;
}

function ClockActionCard({
  scanResult,
  onDone,
}: {
  scanResult: ScanResult;
  onDone: (record: DtrRecord) => void;
}) {
  const { record, employeeCode } = scanResult;
  const [loading, setLoading]   = useState<'in' | 'out' | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<DtrRecord | null>(null);

  const alreadyIn  = !!record?.time_in && !record?.time_out;
  const alreadyOut = !!record?.time_in && !!record?.time_out;
  const notYet     = !record?.time_in;

  const clock = async (action: 'in' | 'out') => {
    setLoading(action); setError(null);
    try {
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr/scan-clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_code: employeeCode, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error ?? `Error ${res.status}`);
      setSuccess(data as DtrRecord);
      onDone(data as DtrRecord);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-bold text-green-800">{success.full_name}</p>
        <p className="text-sm text-green-600 mt-1">
          {success.time_out ? `Clocked out at ${fmt12(success.time_out)}` : `Clocked in at ${fmt12(success.time_in)}`}
        </p>
        {Number(success.hours_worked) > 0 && (
          <p className="text-xs text-green-500 mt-1">{fmtHours(success.hours_worked)} worked today</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B5858]/20 to-[#0B5858]/30 flex items-center justify-center shrink-0">
          <span className="text-[#0B5858] font-bold text-sm">
            {record?.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('') ?? '?'}
          </span>
        </div>
        <div>
          <p className="font-bold text-gray-900">{record?.full_name ?? employeeCode}</p>
          <p className="text-xs text-gray-400">{record?.position ?? 'Employee'} · {employeeCode}</p>
        </div>
        <div className="ml-auto">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            alreadyIn  ? 'bg-green-100 text-green-700' :
            alreadyOut ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {alreadyIn ? 'Clocked In' : alreadyOut ? 'Shift Complete' : 'Not Clocked In'}
          </span>
        </div>
      </div>

      {record && (
        <div className="flex gap-4 text-center mb-5 bg-gray-50 rounded-2xl py-3">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Time In</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fmt12(record.time_in)}</p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Time Out</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fmt12(record.time_out)}</p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Hours</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fmtHours(record.hours_worked)}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={() => clock('in')} disabled={!!loading || alreadyIn || alreadyOut}
          className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors bg-[#0B5858] text-white hover:bg-[#094444] disabled:opacity-40 disabled:cursor-not-allowed">
          {loading === 'in' ? 'Clocking In…' : 'Clock In'}
        </button>
        <button onClick={() => clock('out')} disabled={!!loading || !alreadyIn}
          className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors border-2 border-[#0B5858] text-[#0B5858] hover:bg-[#0B5858]/10 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading === 'out' ? 'Clocking Out…' : 'Clock Out'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [tab, setTab]             = useState<'scanner' | 'records'>('scanner');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [records, setRecords]     = useState<DtrRecord[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [photoModal, setPhotoModal] = useState<{ src: string; label: string } | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoadingRec(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) { params.set('start', filterDate); params.set('end', filterDate); }
      const res = await payrollFetch(`${PAYROLL_API_BASE}/api/dtr?${params}`);
      if (res.ok) setRecords(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingRec(false); }
  }, [filterDate]);

  useEffect(() => {
    if (tab === 'records') fetchRecords();
  }, [tab, fetchRecords]);

  // When admin scans a QR, look up the employee's today record
  const handleScanned = useCallback(async (employeeCode: string) => {
    try {
      // Find the employee_id by code, then get today's DTR
      const empRes = await payrollFetch(`${PAYROLL_API_BASE}/api/employees`);
      if (!empRes.ok) { setScanResult({ record: null, employeeCode }); return; }
      const emps: any[] = await empRes.json();
      const emp = emps.find(e => e.employee_code === employeeCode);
      if (!emp) { setScanResult({ record: null, employeeCode }); return; }

      const todayStr = new Date().toISOString().slice(0, 10);
      const dtrRes = await payrollFetch(
        `${PAYROLL_API_BASE}/api/dtr?employee_id=${emp.employee_id}&start=${todayStr}&end=${todayStr}`
      );
      const dtrRows: DtrRecord[] = dtrRes.ok ? await dtrRes.json() : [];
      setScanResult({ record: dtrRows[0] ?? null, employeeCode });
    } catch {
      setScanResult({ record: null, employeeCode });
    }
  }, []);

  const handleClockDone = (record: DtrRecord) => {
    // Add/update in records list
    setRecords(prev => {
      const idx = prev.findIndex(r => r.employee_id === record.employee_id && r.work_date === record.work_date);
      if (idx >= 0) { const n = [...prev]; n[idx] = record; return n; }
      return [record, ...prev];
    });
  };

  const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {(['scanner', 'records'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                tab === t ? 'bg-white text-[#0B5858] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'scanner' ? 'QR Scanner' : 'Records'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'scanner' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <QRScanner onScanned={handleScanned} />

          {/* Result card */}
          <div>
            {scanResult ? (
              <ClockActionCard
                scanResult={scanResult}
                onDone={handleClockDone}
              />
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[220px]">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm text-gray-400">Scan an employee QR code to clock them in or out</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Records tab */
        <div>
          {/* Date filter */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-3">
            <label className="text-sm text-gray-500 shrink-0">Date</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858]" />
            <button onClick={fetchRecords}
              className="px-4 py-2 bg-[#0B5858] hover:bg-[#094444] text-white rounded-xl text-sm font-semibold transition-colors">
              Load
            </button>
            <span className="text-xs text-gray-400 ml-auto">{records.length} record{records.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loadingRec ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No attendance records for this date.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Proof', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.dtr_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-900">{r.full_name}</p>
                          <p className="text-xs text-gray-400">{r.position}</p>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.work_date)}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800">{fmt12(r.time_in)}</p>
                          {r.ip_in && <p className="text-[10px] text-gray-300 mt-0.5">{r.ip_in}</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800">{fmt12(r.time_out)}</p>
                          {r.ip_out && <p className="text-[10px] text-gray-300 mt-0.5">{r.ip_out}</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800">{fmtHours(r.hours_worked)}</p>
                          {r.overtime_hours > 0 && (
                            <p className="text-[11px] text-amber-500">+{fmtHours(r.overtime_hours)} OT</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {r.photo_in ? (
                              <button onClick={() => setPhotoModal({ src: r.photo_in!, label: `${r.full_name} — Clock In` })}
                                className="group relative w-8 h-8 rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors">
                                <img src={r.photo_in} alt="clock-in photo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center" title="No clock-in photo">
                                <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                            )}
                            {r.photo_out ? (
                              <button onClick={() => setPhotoModal({ src: r.photo_out!, label: `${r.full_name} — Clock Out` })}
                                className="group relative w-8 h-8 rounded-lg overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-colors">
                                <img src={r.photo_out} alt="clock-out photo" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </button>
                            ) : (
                              r.time_out && (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 border border-dashed border-gray-200 flex items-center justify-center" title="No clock-out photo">
                                  <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {r.status === 'CLOSED' ? 'Done' : 'Open'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPhotoModal(null)}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{photoModal.label}</p>
              <button onClick={() => setPhotoModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img src={photoModal.src} alt={photoModal.label} className="w-full block" />
          </div>
        </div>
      )}
    </div>
  );
}
