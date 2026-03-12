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

/** Damage incident (DamageReport) from API */
export interface DamageIncident {
  id: string;
  bookingId?: string;
  unitId?: string;
  reportDate?: string;
  dateReported?: string;
  description?: string;
  cause?: string; // optional per ERD; not collected in create form
  reportedBy?: string;
  estimatedCost?: number;
  actualCost?: number;
  absorbedAmount?: number;
  chargedToGuest?: number;
  status?: string;
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

/** Payload to create a damage incident (matches backend schema) */
export interface CreateDamageIncidentPayload {
  bookingId?: string;
  unitId?: string;
  reportedByUserId?: string;
  resolvedByUserId?: string;
  reportedAt?: string; // ISO datetime
  resolvedAt?: string; // ISO datetime
  description?: string;
  resolutionNotes?: string;
  cost?: number;
  chargedToGuest?: number;
  absorbedAmount?: number;
  status?: 'open' | 'in-review' | 'resolved';
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
  bookingId?: string;
  unitId?: string;
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
  return extractList<DamageIncident>(res, ['data', 'damageIncidents', 'incidents']);
}

/** Get a single damage incident by ID */
export async function getDamageIncident(id: string): Promise<DamageIncident | null> {
  const res = await apiClient.get<unknown>(`/api/damage-incidents/${id}`);
  return extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
}

/** Create a new damage incident */
export async function createDamageIncident(
  payload: CreateDamageIncidentPayload
): Promise<DamageIncident> {
  const res = await apiClient.post<unknown>('/api/damage-incidents', payload);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return incident;
  const list = extractList<DamageIncident>(res, ['data', 'damageIncidents', 'incidents']);
  if (list.length > 0) return list[0];
  throw new Error('Invalid create response: missing damage incident');
}

/** Update an existing damage incident */
export async function updateDamageIncident(
  id: string,
  payload: UpdateDamageIncidentPayload
): Promise<DamageIncident> {
  const body = toSnakeCase(payload) as Record<string, unknown>;
  const res = await apiClient.patch<unknown>(`/api/damage-incidents/${id}`, body);
  const incident = extractOne<DamageIncident>(res, ['data', 'damageIncident', 'incident']);
  if (incident) return incident;
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

/** Get attachment content URL (for display) */
export function getDamageAttachmentContentUrl(attachmentId: string): string {
  return `/api/damage-incidents/attachments/${attachmentId}/content`;
}
