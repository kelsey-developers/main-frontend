/**
 * Fetches bookings and damage incidents from market-backend for finance dashboard.
 * Uses /api/market/* which proxies to MARKET_API_URL.
 * Pass currentUser so the backend can scope data by role (finance = agent's bookings only).
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

/** Raw booking from GET /api/bookings/my (market-backend) */
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
  reference_code: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_amount: number;
  transaction_number?: string;
  charges?: MarketBookingCharge[];
  listing?: { title: string; location?: string; main_image_url?: string; property_type?: string };
  /** Unit property type (e.g. condo, apartment). From listing.property_type or top-level. */
  property_type?: string;
  client?: { first_name?: string; last_name?: string };
  assigned_agent_name?: string;
  agent?: { first_name?: string; last_name?: string; name?: string; fullname?: string };
  /** Per-night unit rate from backend (auth: unit_charge). When set, rate is per-night and totalAmount is the actual total. */
  unit_charge?: number;
  /** Extra charge from excess guests (auth: excess_pax_charge). */
  excess_pax_charge?: number;
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
  reportedAt: string;
  description: string;
  cost: number;
  chargedToGuest: number;
  absorbedAmount: number;
  status: string;
  unit?: { name?: string };
}

interface DamageIncidentsResponse {
  damageIncidents?: MarketDamageIncident[];
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
  const unit = b.listing?.title ?? '—';
  const rawPropertyType = (b.property_type ?? b.listing?.property_type ?? '').trim();
  const unitType = rawPropertyType ? rawPropertyType.charAt(0).toUpperCase() + rawPropertyType.slice(1).toLowerCase() : undefined;
  const totalFromBackend = Number(b.total_amount) || 0;
  const unitCharge = b.unit_charge != null ? Number(b.unit_charge) : undefined;
  const excessPaxCharge = b.excess_pax_charge != null ? Number(b.excess_pax_charge) : undefined;
  const checkIn = typeof b.check_in_date === 'string' ? b.check_in_date.split('T')[0] : '';
  const checkOut = typeof b.check_out_date === 'string' ? b.check_out_date.split('T')[0] : '';
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

  if (unitCharge != null) {
    const ratePerNight = unitCharge;
    const basePrice = ratePerNight * Math.max(1, nights);
    return {
      id: b.id,
      bookingId: b.id,
      unit,
      imageUrl: b.listing?.main_image_url,
      location: b.listing?.location,
      unitType,
      rate: ratePerNight,
      agent,
      guest,
      checkIn: b.check_in_date,
      checkOut: b.check_out_date,
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
    bookingId: b.id,
    unit,
    imageUrl: b.listing?.main_image_url,
    location: b.listing?.location,
    unitType,
    rate: ratePerNight,
    agent,
    guest,
    checkIn: b.check_in_date,
    checkOut: b.check_out_date,
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
  return {
    bookingId: d.bookingId ?? '',
    unit: d.unit?.name ?? d.unitId,
    reportedAt: typeof d.reportedAt === 'string' ? d.reportedAt.split('T')[0] : '',
    description: d.description ?? '',
    cost,
    chargedToGuest: charged,
    absorbed,
    totalLoss: cost,
    status: d.status ?? 'open',
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
  const opts = {
    ...(Object.keys(headers).length ? { headers } : {}),
    credentials: 'include' as RequestCredentials,
  };

  // Try dedicated route first (server-side cookie handling), then market proxy
  for (const endpoint of ['/api/bookings/my', '/api/market/bookings/my']) {
    try {
      const data = await apiClient.get<unknown>(endpoint, opts);
      const list = extractBookingsList(data);
      const completedOnly = list.filter((b) => String(b.status || '').toLowerCase() === 'booked');
      return completedOnly.map(toBookingLinkedRow);
    } catch {
      continue;
    }
  }
  return [];
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
  const opts = {
    ...(Object.keys(headers).length ? { headers } : {}),
    credentials: 'include' as RequestCredentials,
  };
  
  try {
    const data = await apiClient.get<unknown>(`/api/bookings/${id}`, opts);
    const b = extractSingleBooking(data);
    return b ? toBookingLinkedRow(b) : null;
  } catch {
    return null;
  }
}

export async function fetchFinanceDamageIncidents(currentUser?: FinanceAuth | null): Promise<DamagePenalty[]> {
  try {
    const headers = authHeaders(currentUser);
    const data = await apiClient.get<DamageIncidentsResponse>('/api/damage-incidents', {
      ...(Object.keys(headers).length ? { headers } : {}),
    });
    const list = data?.damageIncidents ?? [];
    return list.map(toDamagePenalty);
  } catch {
    return [];
  }
}
