// PATH: main-frontend-mock/services/dtrService.ts

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

// GET today's DTR record for an employee
export async function getTodayDTR(
  employeeId: number,
  date: string
): Promise<DTRRecord | null> {
  const res = await fetch(
    `${API_BASE}/api/dtr/employee/${employeeId}/today`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch DTR record');
  const data = await res.json();
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

// POST clock in
export async function timeIn(
  employeeId: number,
  date: string,
  shiftStart?: string,
  shiftEnd?: string
): Promise<DTRRecord> {
  const res = await fetch(`${API_BASE}/api/dtr/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      work_date:   date,
      shift_start: shiftStart,
      shift_end:   shiftEnd,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time in');
  }
  return res.json();
}

// PATCH clock out
export async function timeOut(
  employeeId: number,
  dtrId: number
): Promise<DTRRecord> {
  const res = await fetch(`${API_BASE}/api/dtr/${dtrId}/clock-out`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, hoursWorked: 0 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to record time out');
  }
  return res.json();
}

// GET task logs for an employee
export async function getTodayTasks(
  employeeId: number,
  date: string
): Promise<TaskLog[]> {
  const res = await fetch(
    `${API_BASE}/api/dtr/employee/${employeeId}/tasks`
  );
  if (!res.ok) return [];
  return res.json();
}

// POST upload task proof photo
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

  const res = await fetch(
    `${API_BASE}/api/dtr/${dtrId}/employee/${employeeId}/proof`,
    {
      method: 'POST',
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to upload task photo');
  }
  return res.json();
}