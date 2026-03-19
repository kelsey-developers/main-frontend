/**
 * Fetches bookings and damage incidents from market-backend for finance dashboard.
 * Bookings: /api/market/bookings/my → MARKET_API_URL (market syncs from Kelsey, returns DB data).
 * Damage incidents: /api/damage-incidents → MARKET_API_URL.
 */

import { apiClient } from '@/lib/api/client';
import { getNights } from './format';
import type { BookingLinkedRow, DamagePenalty } from '../types';

/** Current user identity so backend can filter: admin = all, finance = bookings where agent matches. */
export interface FinanceAuth {
  userId?: string | number;
  email?: string;
  role?: string;
}

/** Raw booking from GET /api/market/bookings/my (market-backend) */
interface MarketBookingCharge {
  id: string;
  category: string;
  name: string;
  amount: number;
  quantity: number;
  notes?: string;
}

interface MarketBookingItem {
  id: string;
  reference_code?: string;
  check_in_date: string;
  check_out_date: string;
  checkin_date?: string;
  checkout_date?: string;
  check_in_time?: string;
  check_out_time?: string;
  status: string;
  total_amount: number;
  transaction_number?: string;
  charges?: MarketBookingCharge[];
  listing?: {
    id?: string;
    title?: string;
    unit_name?: string;
    location?: string;
    main_image_url?: string;
    property_type?: string;
    unit_type?: string;
    check_in_time?: string;
    check_out_time?: string;
  };
  unit?: {
    id?: string;
    name?: string;
    title?: string;
    location?: string;
    property_type?: string;
    unit_type?: string;
    check_in_time?: string;
    check_out_time?: string;
  };
  /** Unit property type (e.g. condo, apartment). From listing.property_type or top-level. */
  property_type?: string;
  unit_type?: string;
  client?: { first_name?: string; last_name?: string };
  assigned_agent_name?: string;
  agent?: { first_name?: string; last_name?: string; name?: string; fullname?: string };
  /** Per-night unit rate from backend (auth: unit_charge). When set, rate is per-night and totalAmount is the actual total. */
  unit_charge?: number;
  /** Extra charge from excess guests (auth: excess_pax_charge). */
  excess_pax_charge?: number;
}

interface FinanceRequestOptions {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

function toCanonicalUnitType(value: string): string {
  const cleaned = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const normalized = cleaned.toLowerCase();

  if (normalized.includes('condo')) return 'Condo';
  if (normalized.includes('apartment')) return 'Apartment';
  if (normalized.includes('penthouse')) return 'Penthouse';
  if (normalized.includes('house')) return 'House';

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function mergeBookingItems(base: MarketBookingItem, detail: MarketBookingItem): MarketBookingItem {
  return {
    ...base,
    ...detail,
    listing: {
      ...(base.listing ?? {}),
      ...(detail.listing ?? {}),
    },
    unit: {
      ...(base.unit ?? {}),
      ...(detail.unit ?? {}),
    },
    client: {
      ...(base.client ?? {}),
      ...(detail.client ?? {}),
    },
    agent: {
      ...(base.agent ?? {}),
      ...(detail.agent ?? {}),
    },
    charges:
      Array.isArray(detail.charges) && detail.charges.length > 0
        ? detail.charges
        : base.charges,
  };
}

async function fetchMarketBookingByIdRaw(id: string, opts: FinanceRequestOptions): Promise<MarketBookingItem | null> {
  if (!id) return null;
  try {
    const data = await apiClient.get<unknown>(`/api/bookings/${id}`, opts);
    return extractSingleBooking(data);
  } catch {
    return null;
  }
}

/** Extract bookings array from backend response (raw array, or { bookings }, or { data }, etc.) */
function extractBookingsList(data: unknown): MarketBookingItem[] {
  if (Array.isArray(data)) return data as MarketBookingItem[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const key of ['bookings', 'data', 'items', 'results']) {
      const val = o[key];
      if (Array.isArray(val)) return val as MarketBookingItem[];
    }
  }
  return [];
}

/** Raw damage incident from GET /api/damage-incidents (market-backend) */
interface MarketDamageIncident {
  id: string;
  bookingId: string | null;
  unitId: string;
  unitAddress?: string;
  unitType?: string;
  location?: string;
  reportedAt: string;
  resolvedAt?: string;
  description: string;
  reasonOfDamage?: string;
  cause?: string;
  resolutionNotes?: string;
  reportedBy?: string;
  reportedByName?: string;
  cost: number;
  chargedToGuest: number;
  absorbedAmount: number;
  status: string;
  proofUrls?: string[];
  attachmentUrls?: string[];
  attachments?: Array<{ id: string; url?: string }>;
  items?: Array<{ item?: string; name?: string; type?: 'loss' | 'broken' | string }>;
  unit?: { name?: string };
}

interface DamageIncidentsResponse {
  damageIncidents?: MarketDamageIncident[];
  data?: MarketDamageIncident[];
  incidents?: MarketDamageIncident[];
}

function normalizeDamageIncidentStatus(raw: string | undefined): 'open' | 'resolved' {
  const status = (raw ?? 'open').toLowerCase().replace(/\s+/g, '_');
  if (status === 'open') return 'open';
  if (
    status === 'resolved' ||
    status === 'charged_to_guest' ||
    status === 'absorbed' ||
    status === 'settled' ||
    status === 'in-review' ||
    status === 'in_review'
  ) {
    return 'resolved';
  }
  return 'open';
}

function isResolvedDamageIncident(d: MarketDamageIncident): boolean {
  return normalizeDamageIncidentStatus(d.status) === 'resolved';
}

function extractDamageIncidentsList(data: DamageIncidentsResponse | MarketDamageIncident[] | unknown): MarketDamageIncident[] {
  if (Array.isArray(data)) return data as MarketDamageIncident[];
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  for (const key of ['damageIncidents', 'data', 'incidents', 'items', 'results']) {
    const v = o[key];
    if (Array.isArray(v)) return v as MarketDamageIncident[];
  }
  return [];
}

function extractSingleDamageIncident(data: unknown): MarketDamageIncident | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.id != null && (o.bookingId != null || o.unitId != null || o.description != null)) {
    return o as unknown as MarketDamageIncident;
  }
  for (const key of ['damageIncident', 'incident', 'data', 'item']) {
    const v = o[key];
    if (v && typeof v === 'object' && (v as Record<string, unknown>).id != null) {
      return v as unknown as MarketDamageIncident;
    }
  }
  return null;
}

function toProofUrls(d: MarketDamageIncident): string[] {
  const direct = Array.isArray(d.proofUrls) ? d.proofUrls.filter(Boolean) : [];
  const attachmentUrls = Array.isArray(d.attachmentUrls) ? d.attachmentUrls.filter(Boolean) : [];
  const attachmentContentUrls = Array.isArray(d.attachments)
    ? d.attachments
        .map((a) => {
          if (a?.url) return a.url;
          if (a?.id) return `/api/damage-incidents/attachments/${encodeURIComponent(String(a.id))}/content`;
          return null;
        })
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];

  const merged = [...direct, ...attachmentUrls, ...attachmentContentUrls];
  return Array.from(new Set(merged));
}


function toBookingLinkedRow(b: MarketBookingItem): BookingLinkedRow {
  const guest = [b.client?.first_name, b.client?.last_name].filter(Boolean).join(' ').trim() || 'Guest';
  const agentFromApi = b.agent;
  const agentStr =
    (b.assigned_agent_name && b.assigned_agent_name.trim()) ||
    (agentFromApi && typeof agentFromApi === 'object' && (agentFromApi as { name?: string }).name?.trim()) ||
    (agentFromApi && typeof agentFromApi === 'object' && (agentFromApi as { fullname?: string }).fullname?.trim()) ||
    [agentFromApi?.first_name, agentFromApi?.last_name].filter(Boolean).join(' ').trim();
  const agent = agentStr || '—';
  const unit = b.listing?.title ?? b.listing?.unit_name ?? b.unit?.title ?? b.unit?.name ?? '—';
  const rawPropertyType = (
    b.property_type ??
    b.unit_type ??
    b.listing?.property_type ??
    b.listing?.unit_type ??
    b.unit?.property_type ??
    b.unit?.unit_type ??
    ''
  ).trim();
  const unitType = rawPropertyType ? toCanonicalUnitType(rawPropertyType) : undefined;
  const totalFromBackend = Number(b.total_amount) || 0;
  const unitCharge =
    b.unit_charge != null && Number.isFinite(Number(b.unit_charge)) ? Number(b.unit_charge) : undefined;
  const excessPaxCharge = b.excess_pax_charge != null ? Number(b.excess_pax_charge) : undefined;
  const rawCheckIn = b.check_in_date ?? b.checkin_date ?? '';
  const rawCheckOut = b.check_out_date ?? b.checkout_date ?? '';
  const checkIn = typeof rawCheckIn === 'string' ? rawCheckIn.split('T')[0] : '';
  const checkOut = typeof rawCheckOut === 'string' ? rawCheckOut.split('T')[0] : '';
  const nights = getNights(checkIn, checkOut) || 1;

  const chargeLines = Array.isArray(b.charges) ? b.charges : [];
  const addons = chargeLines.filter((c) => String(c.category).toLowerCase() === 'addon');
  const addOnsWithPrice = addons.map((c) => ({
    name: c.name,
    amount: (Number(c.amount) || 0) * Math.max(1, Number(c.quantity) || 1),
  }));
  const addOnsAmount = addOnsWithPrice.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const extraHeadLine = addons.find((c) => {
    const code = String(c.notes ?? '');
    if (/AUTO:\s*EXTRA/i.test(code) && /HEAD/i.test(code)) return true;
    const n = normalize(String(c.name ?? ''));
    return n.includes('extra head') || n.includes('extra guest');
  });
  const extraHoursLine = addons.find((c) => {
    const n = normalize(String(c.name ?? ''));
    return n.includes('early') || n.includes('late') || n.includes('hour');
  });
  const extraHeadsFromAddons = extraHeadLine ? (Number(extraHeadLine.amount) || 0) * Math.max(1, Number(extraHeadLine.quantity) || 1) : 0;
  const extraHours = extraHoursLine ? (Number(extraHoursLine.amount) || 0) * Math.max(1, Number(extraHoursLine.quantity) || 1) : 0;

  const extraHeads = excessPaxCharge != null ? excessPaxCharge : extraHeadsFromAddons;

  // Treat `unit_charge = 0` as "unknown" so we don't show empty base pricing when backend didn't populate nightlyRate.
  if (unitCharge != null && unitCharge > 0) {
    const ratePerNight = unitCharge;
    const basePrice = ratePerNight * Math.max(1, nights);
    return {
      id: b.id,
      bookingId: b.reference_code || b.id,
      unit,
      imageUrl: b.listing?.main_image_url,
      location: b.listing?.location ?? b.unit?.location,
      unitType,
      rate: ratePerNight,
      agent,
      guest,
      checkIn: checkIn,
      checkOut: checkOut,
      checkInTime: b.check_in_time ?? b.listing?.check_in_time ?? b.unit?.check_in_time,
      checkOutTime: b.check_out_time ?? b.listing?.check_out_time ?? b.unit?.check_out_time,
      guestType: 'direct',
      basePrice,
      discounts: 0,
      extraHeads,
      extraHours,
      addOns: addOnsWithPrice.map((c) => c.name),
      addOnsWithPrice,
      addOnsAmount,
      totalAmount: totalFromBackend,
    };
  }

  // Rate = base total of the booking / nights (not full total / nights), so list matches detail "Rate (per night)"
  const baseTotal = Math.max(0, totalFromBackend - extraHeads - extraHours - addOnsAmount);
  const ratePerNight = baseTotal / Math.max(1, nights);
  const basePrice = baseTotal;
  return {
    id: b.id,
    bookingId: b.reference_code || b.id,
    unit,
    imageUrl: b.listing?.main_image_url,
    location: b.listing?.location ?? b.unit?.location,
    unitType,
    rate: ratePerNight,
    agent,
    guest,
    checkIn: checkIn,
    checkOut: checkOut,
    checkInTime: b.check_in_time ?? b.listing?.check_in_time ?? b.unit?.check_in_time,
    checkOutTime: b.check_out_time ?? b.listing?.check_out_time ?? b.unit?.check_out_time,
    guestType: 'direct',
    basePrice,
    discounts: 0,
    extraHeads,
    extraHours,
    addOns: addOnsWithPrice.map((c) => c.name),
    addOnsWithPrice,
    addOnsAmount,
    totalAmount: totalFromBackend,
  };
}

function toDamagePenalty(d: MarketDamageIncident): DamagePenalty {
  const charged = Number(d.chargedToGuest) || 0;
  const absorbed = Number(d.absorbedAmount) || 0;
  const cost = Number(d.cost) || 0;
  const items = Array.isArray(d.items)
    ? d.items
        .map((entry) => {
          const itemName = String(entry.item ?? entry.name ?? '').trim();
          if (!itemName) return null;
          const itemType = String(entry.type ?? 'broken').toLowerCase();
          return {
            item: itemName,
            type: itemType === 'loss' ? 'loss' : 'broken',
          };
        })
        .filter((entry): entry is { item: string; type: 'loss' | 'broken' } => entry != null)
    : undefined;

  const status = normalizeDamageIncidentStatus(d.status);
  return {
    damageId: String(d.id ?? ''),
    bookingId: d.bookingId ?? '',
    unit: d.unit?.name ?? d.unitId,
    unitAddress: d.unitAddress,
    unitType: d.unitType,
    location: d.location,
    reportedAt: typeof d.reportedAt === 'string' ? d.reportedAt.split('T')[0] : '',
    description: d.description ?? '',
    reasonOfDamage: d.reasonOfDamage ?? d.cause ?? d.resolutionNotes,
    reportedBy: d.reportedByName ?? d.reportedBy,
    proofUrls: toProofUrls(d),
    items,
    cost,
    chargedToGuest: charged,
    absorbed,
    totalLoss: cost,
    status,
  };
}

function authHeaders(currentUser?: FinanceAuth | null): Record<string, string> {
  if (!currentUser) return {};
  const h: Record<string, string> = {};
  if (currentUser.userId != null) h['x-user-id'] = String(currentUser.userId);
  if (currentUser.email) h['x-user-email'] = currentUser.email;
  if (currentUser.role) h['x-user-role'] = currentUser.role;
  return h;
}

export async function fetchFinanceBookings(currentUser?: FinanceAuth | null): Promise<BookingLinkedRow[]> {
  const headers = authHeaders(currentUser);
  const opts: FinanceRequestOptions = {
    ...(Object.keys(headers).length ? { headers } : {}),
    credentials: 'include' as RequestCredentials,
  };

  // Bookings from market API (market-backend syncs from Kelsey, returns DB data).
  try {
    const data = await apiClient.get<unknown>('/api/market/bookings/my', opts);
    const list = extractBookingsList(data);
    const completedOnly = list.filter((b) => String(b.status || '').toLowerCase() === 'booked');
    return completedOnly.map(toBookingLinkedRow);
  } catch {
    return [];
  }
}

/** Extract a single booking from GET /api/bookings/:id response (object or { data }, { booking }, etc.). */
function extractSingleBooking(data: unknown): MarketBookingItem | null {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (o.id != null && o.check_in_date != null) return o as unknown as MarketBookingItem;
    for (const key of ['booking', 'data', 'item']) {
      const val = o[key];
      if (val && typeof val === 'object' && (val as Record<string, unknown>).id != null) {
        return val as unknown as MarketBookingItem;
      }
    }
  }
  return null;
}

export async function fetchFinanceBookingById(
  id: string,
  currentUser?: FinanceAuth | null
): Promise<BookingLinkedRow | null> {
  if (!id) return null;
  const headers = authHeaders(currentUser);
  const opts: FinanceRequestOptions = {
    ...(Object.keys(headers).length ? { headers } : {}),
    credentials: 'include' as RequestCredentials,
  };
  
  const b = await fetchMarketBookingByIdRaw(id, opts);
  return b ? toBookingLinkedRow(b) : null;
}

export async function fetchFinanceDamageIncidents(currentUser?: FinanceAuth | null): Promise<DamagePenalty[]> {
  try {
    const headers = authHeaders(currentUser);
    const data = await apiClient.get<DamageIncidentsResponse>('/api/damage-incidents', {
      ...(Object.keys(headers).length ? { headers } : {}),
      credentials: 'include' as RequestCredentials,
    });
    const list = extractDamageIncidentsList(data);
    return list.filter(isResolvedDamageIncident).map(toDamagePenalty);
  } catch {
    return [];
  }
}

export async function fetchFinanceDamageIncidentById(
  id: string,
  currentUser?: FinanceAuth | null
): Promise<DamagePenalty | null> {
  if (!id) return null;
  try {
    const headers = authHeaders(currentUser);
    const data = await apiClient.get<unknown>(`/api/damage-incidents/${id}`, {
      ...(Object.keys(headers).length ? { headers } : {}),
      credentials: 'include' as RequestCredentials,
    });
    const incident = extractSingleDamageIncident(data);
    if (!incident || !isResolvedDamageIncident(incident)) return null;
    return toDamagePenalty(incident);
  } catch {
    return null;
  }
}
