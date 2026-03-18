import { apiClient } from './client';

/** Convert camelCase keys to snake_case for backend APIs (Rails/Django). */
function toSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      result[snake] = toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

/** Convert snake_case keys to camelCase for frontend consumption. */
function toCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = toCamelCase(value);
    }
    return result;
  }
  return obj;
}

function normalizeIncident<T>(raw: T | null): T | null {
  if (!raw || typeof raw !== 'object') return raw;
  return toCamelCase(raw) as T;
}

/** Ensure reportedByUserId/resolvedByUserId are set from API reportedBy/resolvedBy (object with id or string id). */
function ensureReporterIds(inc: DamageIncident): DamageIncident {
  const out = { ...inc };
  const rb = (out as Record<string, unknown>).reportedBy;
  if (!out.reportedByUserId && rb != null) {
    if (typeof rb === 'object' && rb !== null && 'id' in rb)
      out.reportedByUserId = String((rb as { id: string | number }).id);
    else if (typeof rb === 'string') out.reportedByUserId = rb;
  }
  const resb = (out as Record<string, unknown>).resolvedBy;
  if (out.resolvedByUserId == null && resb != null) {
    if (typeof resb === 'object' && resb !== null && 'id' in resb)
      out.resolvedByUserId = (resb as { id: string | number }).id;
    else if (typeof resb === 'string') out.resolvedByUserId = resb;
  }
  return out;
}

/** Damage incident (DamageReport) from API - matches expected JSON schema */
export interface DamageIncident {
  id: string;
  bookingId?: string;
  unitId?: string;
  reportedByUserId?: string;
  /** Backend returns camelCase resolvedByUserId; value may be string or number */
  resolvedByUserId?: string | number;
  reportedAt?: string;
  resolvedAt?: string;
  description?: string;
  resolutionNotes?: string;
  cost?: number;
  chargedToGuest?: number;
  absorbedAmount?: number;
  status?: string;
  /** Legacy/optional fields */
  reportDate?: string;
  dateReported?: string;
  cause?: string;
  reportedBy?: string;
  /** Backend may return display name when user id is not available */
  reportedByName?: string;
  resolvedByName?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt?: string;
  updatedAt?: string;
  referenceId?: string;
  warehouseId?: string;
  items?: LostBrokenItem[];
  /** write_off = deduct from inventory (do Stock Out); record_only = no deduction (e.g. reusable damaged but stays in place). */
  inventoryAction?: 'write_off' | 'record_only';
  /** Per-unit damage charge (PHP). When no items: only this applies. With write-off items: cost = assignedCharge + raw cost of items. */
  assignedCharge?: number | null;
}

/** Line item (LostBrokenItem) for a damage incident */
export interface LostBrokenItem {
  id?: string;
  productId: string;
  damageReportId?: string;
  unitId?: string;
  quantity: number;
  itemCost?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload to create a damage incident.
 * Send camelCase; the market API proxy forwards the body as-is.
 * No localStorage — create/update go only via POST/PATCH to the API.
 */
export interface CreateDamageIncidentPayload {
  bookingId?: string;
  unitId?: string;
  reportedByUserId?: string;
  /** Display label for reporter when API stores or returns string only */
  reportedBy?: string;
  resolvedByUserId?: string;
  reportedAt?: string; // ISO datetime
  resolvedAt?: string; // ISO datetime
  description?: string;
  resolutionNotes?: string;
  cost?: number;
  chargedToGuest?: number;
  absorbedAmount?: number;
  status?: 'open' | 'resolved';
  /** Optional: backend may accept for warehouse write-off context */
  warehouseId?: string;
  /** Optional: line items if backend supports nested create */
  items?: Array<{
    productId: string;
    unitId?: string;
    quantity: number;
    itemCost?: number;
  }>;
  /** write_off = will deduct from inventory (complete Stock Out after); record_only = no stock deduction (e.g. reusable damaged but in place). */
  inventoryAction?: 'write_off' | 'record_only';
  /** Per-unit damage charge (PHP). Record-only: cost = this. Write-off: cost = this + raw cost of items. */
  assignedCharge?: number | null;
}

/** Payload to update a damage incident */
export interface UpdateDamageIncidentPayload {
  reportDate?: string;
  description?: string;
  reportedBy?: string;
  reportedByUserId?: string;
  resolvedByUserId?: string;
  resolvedAt?: string; // ISO datetime
  resolutionNotes?: string;
  bookingId?: string;
  unitId?: string;
  cost?: number;
  estimatedCost?: number;
  actualCost?: number;
  absorbedAmount?: number;
  chargedToGuest?: number;
  status?: 'open' | 'resolved';
  /** Required for warehouse write-off; omit for unit write-off */
  warehouseId?: string;
  /** write_off | record_only — see CreateDamageIncidentPayload. */
  inventoryAction?: 'write_off' | 'record_only';
  /** Per-unit damage charge (PHP). */
  assignedCharge?: number | null;
}

/** Attachment metadata from API */
export interface DamageAttachment {
  id: string;
  damageReportId?: string;
  filename?: string;
  contentType?: string;
  createdAt?: string;
}

function extractList<T>(res: unknown, keys: string[]): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res !== 'object') return [];
  const obj = res as Record<string, unknown>;
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val as T[];
  }
  return [];
}

function extractOne<T>(res: unknown, keys: string[]): T | null {
  if (!res || typeof res !== 'object') return null;
  const obj = res as Record<string, unknown>;
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === 'object') return val as T;
  }
  return (res as T) ?? null;
}

/** List all damage incidents */
export async function listDamageIncidents(): Promise<DamageIncident[]> {
  const res = await apiClient.get<unknown>('/api/damage-incidents');
  const list = extractList<DamageIncident>(res, ['data', 'damageIncidents', 'incidents']);
  return list.map((inc) =>
    ensureReporterIds((normalizeIncident(inc) ?? inc) as DamageIncident)
  );
}

/** Get a single damage incident by ID */
export async function getDamageIncident(id: string): Promise<DamageIncident | null> {
  const res = await apiClient.get<unknown>(`/api/damage-incidents/${id}`);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (!incident) return null;
  return ensureReporterIds(normalizeIncident(incident) as DamageIncident);
}

/**
 * Create damage incident. POST to /api/damage-incidents only — no localStorage.
 * Include reportedByUserId in the payload when provided (e.g. from options).
 */
export type CreateDamageIncidentOptions = {
  reporterUserId?: string;
};

export async function createDamageIncident(
  payload: CreateDamageIncidentPayload,
  options?: CreateDamageIncidentOptions
): Promise<DamageIncident> {
  const reporterId =
    (options?.reporterUserId != null && String(options.reporterUserId).trim() !== '')
      ? String(options.reporterUserId).trim()
      : (payload.reportedByUserId != null && String(payload.reportedByUserId).trim() !== '')
        ? String(payload.reportedByUserId).trim()
        : undefined;
  if (!reporterId) {
    throw new Error('Cannot create damage report: reporter user id is required (user must be logged in).');
  }
  const body: CreateDamageIncidentPayload = {
    ...payload,
    reportedByUserId: reporterId,
  };
  // Backend may expect snake_case (e.g. reported_by_user_id) to persist; send converted body so it returns the value.
  const bodySnake = toSnakeCase(body) as Record<string, unknown>;
  const res = await apiClient.post<unknown>('/api/damage-incidents', bodySnake);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return ensureReporterIds(normalizeIncident(incident) as DamageIncident);
  const list = extractList<DamageIncident>(res, ['data', 'damageIncidents', 'incidents']);
  if (list.length > 0) return ensureReporterIds(normalizeIncident(list[0]) as DamageIncident);
  throw new Error('Invalid create response: missing damage incident');
}

/** Update an existing damage incident. PATCH to API only — no localStorage. */
export async function updateDamageIncident(
  id: string,
  payload: UpdateDamageIncidentPayload
): Promise<DamageIncident> {
  // Backend may expect snake_case so it persists and returns fields (e.g. resolved_by_user_id).
  const payloadSnake = toSnakeCase(payload) as Record<string, unknown>;
  const res = await apiClient.patch<unknown>(`/api/damage-incidents/${id}`, payloadSnake);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return ensureReporterIds(normalizeIncident(incident) as DamageIncident);
  throw new Error('Invalid update response: missing damage incident');
}

/** List attachments for a damage incident */
export async function listDamageIncidentAttachments(
  id: string
): Promise<DamageAttachment[]> {
  const res = await apiClient.get<unknown>(`/api/damage-incidents/${id}/attachments`);
  return extractList<DamageAttachment>(res, ['data', 'attachments']);
}

/** Upload attachment(s) for a damage incident */
export async function uploadDamageIncidentAttachments(
  id: string,
  files: File[]
): Promise<DamageAttachment[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const res = await apiClient.post<unknown>(
    `/api/damage-incidents/${id}/attachments`,
    formData
  );
  return extractList<DamageAttachment>(res, ['data', 'attachments']);
}

/** Get attachment content URL (for display). Backend: GET /api/damage-incidents/attachments/{attachmentId}/content (302 to attachment URL). */
export function getDamageAttachmentContentUrl(attachmentId: string): string {
  return `/api/damage-incidents/attachments/${attachmentId}/content`;
}
