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

/** Damage incident (DamageReport) from API - matches expected JSON schema */
export interface DamageIncident {
  id: string;
  bookingId?: string;
  unitId?: string;
  reportedByUserId?: string;
  resolvedByUserId?: string;
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
  estimatedCost?: number;
  actualCost?: number;
  createdAt?: string;
  updatedAt?: string;
  referenceId?: string;
  warehouseId?: string;
  items?: LostBrokenItem[];
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
 *
 * Create must NOT send reportedByUserId in the body: createDamageIncident() drops it (_dropped) so Prisma never
 * inserts an FK that fails. Pass auth user id via createDamageIncident(payload, { reporterUserId }) only — that
 * sets header X-Reporter-User-Id. Backend then sets reportedByUserId when the id matches a market User row, or
 * reportedByExternalId when it does not.
 */
export interface CreateDamageIncidentPayload {
  bookingId?: string;
  unitId?: string;
  /** Stripped before POST — use options.reporterUserId (header) instead */
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
  status?: 'open' | 'charged_to_guest' | 'absorbed' | 'settled';
  /** Optional: backend may accept for warehouse write-off context */
  warehouseId?: string;
  /** Optional: line items if backend supports nested create */
  items?: Array<{
    productId: string;
    unitId?: string;
    quantity: number;
    itemCost?: number;
  }>;
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
  status?: string;
  /** Required for warehouse write-off; omit for unit write-off */
  warehouseId?: string;
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
  return list.map((inc) => (normalizeIncident(inc) ?? inc) as DamageIncident);
}

/** Get a single damage incident by ID */
export async function getDamageIncident(id: string): Promise<DamageIncident | null> {
  const res = await apiClient.get<unknown>(`/api/damage-incidents/${id}`);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  return incident ? (normalizeIncident(incident) as DamageIncident) : null;
}

/**
 * Second argument for createDamageIncident.
 * When reporterUserId is set, the request is sent with header X-Reporter-User-Id (body reportedByUserId is _dropped).
 */
export type CreateDamageIncidentOptions = {
  reporterUserId?: string;
};

/**
 * Create damage incident. Body never includes reportedByUserId — it is removed before send so no FK violation.
 * Backend uses X-Reporter-User-Id (and auth fallback) to set reportedByUserId or reportedByExternalId.
 */
export async function createDamageIncident(
  payload: CreateDamageIncidentPayload,
  options?: CreateDamageIncidentOptions
): Promise<DamageIncident> {
  const { reportedByUserId: _dropped, ...body } = payload;
  void _dropped;
  const headers: Record<string, string> = {};
  if (options?.reporterUserId) {
    headers['X-Reporter-User-Id'] = options.reporterUserId;
  }
  const res = await apiClient.post<unknown>('/api/damage-incidents', body, {
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return normalizeIncident(incident) as DamageIncident;
  const list = extractList<DamageIncident>(res, ['data', 'damageIncidents', 'incidents']);
  if (list.length > 0) return normalizeIncident(list[0]) as DamageIncident;
  throw new Error('Invalid create response: missing damage incident');
}

/** Update an existing damage incident */
export async function updateDamageIncident(
  id: string,
  payload: UpdateDamageIncidentPayload
): Promise<DamageIncident> {
  const res = await apiClient.patch<unknown>(`/api/damage-incidents/${id}`, payload);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return normalizeIncident(incident) as DamageIncident;
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
