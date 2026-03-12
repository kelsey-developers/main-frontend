/**
 * DTR service — calls the backend API for all Daily Time Record data.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface DTRRecord {
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

export interface TaskLog {
  task_id: number;
  unit_name: string;
  task_type: string;
  completed_at: string;
  proof_photo_url: string;
  status: 'COMPLETED' | 'VERIFIED';
}

/**
 * Get the DTR record for a specific employee on a given date.
 * Returns null if no record exists yet.
 */
export async function getTodayDTR(
  employeeId: number,
  date: string
): Promise<DTRRecord | null> {
  const res = await fetch(
    `${API_BASE}/api/dtr?employee_id=${employeeId}&date=${date}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch DTR record');
  const data = await res.json();
  // API may return an array or a single object
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Record time-in for an employee.
 */
export async function timeIn(
  employeeId: number,
  date: string,
  shiftStart?: string,
  shiftEnd?: string
): Promise<DTRRecord> {
  const res = await fetch(`${API_BASE}/api/dtr/time-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_id: employeeId,
      work_date: date,
      shift_start: shiftStart,
      shift_end: shiftEnd,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time in');
  }
  return res.json();
}

/**
 * Record time-out for an open DTR record.
 */
export async function timeOut(
  employeeId: number,
  dtrId: number
): Promise<DTRRecord> {
  const res = await fetch(`${API_BASE}/api/dtr/time-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, dtr_id: dtrId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time out');
  }
  return res.json();
}

/**
 * Get task logs for an employee on a given date.
 */
export async function getTodayTasks(
  employeeId: number,
  date: string
): Promise<TaskLog[]> {
  const res = await fetch(
    `${API_BASE}/api/dtr/tasks?employee_id=${employeeId}&date=${date}`
  );
  if (!res.ok) return [];
  return res.json();
}

/**
 * Upload a task/work photo for a DTR record.
 */
export async function uploadTaskPhoto(
  employeeId: number,
  dtrId: number,
  file: File,
  taskType: string,
  location: string
): Promise<TaskLog> {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('employee_id', String(employeeId));
  formData.append('dtr_id', String(dtrId));
  formData.append('task_type', taskType);
  formData.append('location', location);

  const res = await fetch(`${API_BASE}/api/dtr/upload-task`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to upload task photo');
  }
  return res.json();
}
