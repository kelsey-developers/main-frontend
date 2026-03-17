// Payroll backend — public DTR endpoints (no auth required)
const PAYROLL_API = process.env.NEXT_PUBLIC_PAYROLL_API_URL ?? '';

export interface DTRRecord {
  dtr_id: number;
  employee_id: number;
  work_date: string;
  time_in: string;
  time_out?: string;
  hours_worked?: number;
  status: 'OPEN' | 'CLOSED';
  // Legacy fields kept for interface compat — payroll backend doesn't return these
  proof_photo?: string;
  tasks_completed?: string;
  shift_start?: string;
  shift_end?: string;
}

export interface TaskLog {
  task_id: number;
  unit_name: string;
  task_type: string;
  completed_at: string;
  proof_photo_url: string;
  status: 'COMPLETED' | 'VERIFIED';
}

// GET today's DTR record for an employee
export async function getTodayDTR(
  employeeId: number,
  _date: string
): Promise<DTRRecord | null> {
  const res = await fetch(`${PAYROLL_API}/api/dtr/public/today/${employeeId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch DTR record');
  return res.json();
}

// POST clock in by employee_id (public endpoint — no auth)
export async function timeIn(
  employeeId: number,
  _date: string,
  shiftStart?: string,
  shiftEnd?: string
): Promise<DTRRecord> {
  const res = await fetch(`${PAYROLL_API}/api/dtr/public/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, shift_start: shiftStart ?? null, shift_end: shiftEnd ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time in');
  }
  return res.json();
}

// POST clock out by employee_id (public endpoint — no auth)
export async function timeOut(
  employeeId: number,
  _dtrId: number
): Promise<DTRRecord> {
  const res = await fetch(`${PAYROLL_API}/api/dtr/public/clock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time out');
  }
  return res.json();
}

// Not supported in payroll backend — kept for interface compat
export async function getTodayTasks(
  _employeeId: number,
  _date: string
): Promise<TaskLog[]> {
  return [];
}

export async function uploadTaskPhoto(
  _employeeId: number,
  _dtrId: number,
  _file: File,
  _taskType: string,
  _location: string
): Promise<TaskLog> {
  throw new Error('Task photo upload is not supported');
}
