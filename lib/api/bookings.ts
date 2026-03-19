import { apiClient } from './client';
import type { AdditionalService, ClientDetailsInput, PaymentMethod } from '@/types/booking';

export interface BookingListItem {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

export interface MyBookingItem {
  id: string;
  unit_id?: string;
  reference_code?: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  raw_status?: string;
  total_amount: number;
  transaction_number: string;
  listing: { title: string; location: string; main_image_url: string };
  client: { first_name: string; last_name: string };
  payment?: { reference_number: string; status: string };
}

function inferRawStatusFromClientStatus(status: unknown): string | undefined {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'booked') return 'confirmed';
  if (normalized === 'pending' || normalized === 'pending-payment') return 'penciled';
  if (normalized === 'ongoing') return 'ongoing';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled' || normalized === 'declined') return 'cancelled';
  return undefined;
}

export interface CreateBookingInput {
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  total_guests: number;
  /**
   * Guest add-ons selected in the reserve flow.
   *
   * Contract expectation (inventory sync):
   * - `id` must correspond to the inventory product/item id the inventory module stocks.
   * - `quantity` is the amount to consume on booking confirmation.
   * - `charge` is the per-unit price captured at booking time (used for totals in booking details).
   */
  add_ons?: AdditionalService[];
  landmark?: string;
  parking_info?: string;
  notes?: string;
  request_description?: string;
  payment_method?: PaymentMethod;
  require_payment?: boolean;
  total_amount?: number;
  guest_user_id?: number;
  assigned_agent_id?: string;
  assigned_agent_email?: string;
  assigned_agent_name?: string;
  client?: ClientDetailsInput;
}

export interface CatalogBookingAddon {
  id?: string;
  name?: string;
  quantity?: number;
  charge?: number;
  notes?: string;
}

type AddBookingChargesResponse = {
  count?: number;
};

type CreateBookingItemRequestResponse = {
  id?: string;
};

type BulkCatalogChargeItem = {
  itemName: string;
  itemCode?: string;
  quantity: number;
  amount: number;
  notes?: string;
};

type BookingItemRequestLineInput = {
  productId: string;
  quantityRequested: number;
  notes?: string;
};

const NO_STORE_OPTIONS = { cache: 'no-store' } as const;

function toBulkCatalogChargeItems(addOns: unknown[]): BulkCatalogChargeItem[] {
  const items: BulkCatalogChargeItem[] = [];

  for (const raw of addOns) {
    if (!raw || typeof raw !== 'object') continue;
    const addon = raw as CatalogBookingAddon;

    const itemName = String(addon.name ?? '').trim();
    const amount = Number(addon.charge);
    const quantity = Math.max(1, Math.floor(Number(addon.quantity ?? 1)));

    if (!itemName) continue;
    if (!Number.isFinite(amount) || amount < 0) continue;

    const itemCode = typeof addon.id === 'string' && addon.id.trim().length > 0
      ? addon.id.trim()
      : undefined;
    const notes = typeof addon.notes === 'string' && addon.notes.trim().length > 0
      ? addon.notes.trim()
      : undefined;

    items.push({
      itemName,
      itemCode,
      quantity,
      amount,
      notes,
    });
  }

  return items;
}

function toBookingItemRequestLines(addOns: unknown[]): BookingItemRequestLineInput[] {
  const lines: BookingItemRequestLineInput[] = [];

  for (const raw of addOns) {
    if (!raw || typeof raw !== 'object') continue;
    const addon = raw as CatalogBookingAddon;

    const productId = typeof addon.id === 'string' ? addon.id.trim() : '';
    const quantity = Math.max(1, Math.floor(Number(addon.quantity ?? 1)));
    const itemName = typeof addon.name === 'string' ? addon.name.trim() : '';
    const noteParts = [itemName ? `catalog:${itemName}` : null, addon.notes?.trim() || null].filter(
      (value): value is string => Boolean(value)
    );

    if (!productId) continue;

    lines.push({
      productId,
      quantityRequested: quantity,
      notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
    });
  }

  return lines;
}

export async function getBookings(listingId: string): Promise<BookingListItem[]> {
  if (!listingId) return [];
  try {
    const data = await apiClient.get<unknown>(
      `/api/bookings?listingId=${encodeURIComponent(listingId)}`,
      NO_STORE_OPTIONS
    );
    if (Array.isArray(data)) return data as BookingListItem[];
    const payload = data as { data?: unknown[]; bookings?: unknown[] };
    const arr = payload?.data ?? payload?.bookings ?? [];
    return arr as BookingListItem[];
  } catch {
    return [];
  }
}

export async function createBooking(input: CreateBookingInput): Promise<{ id: number; [key: string]: unknown }> {
  return apiClient.post('/api/bookings', input);
}

export async function appendCatalogItemsToBookingCharges(
  bookingIdOrRef: string,
  addOns: unknown[]
): Promise<{ posted: number; skipped: number }> {
  const bookingKey = String(bookingIdOrRef ?? '').trim();
  const source = Array.isArray(addOns) ? addOns : [];
  const items = toBulkCatalogChargeItems(source);
  const skipped = Math.max(0, source.length - items.length);

  if (!bookingKey || items.length === 0) {
    return { posted: 0, skipped };
  }

  const response = await apiClient.post<AddBookingChargesResponse>(
    `/api/market/bookings/${encodeURIComponent(bookingKey)}/charges/bulk`,
    { items }
  );

  return {
    posted: Number(response?.count ?? items.length),
    skipped,
  };
}

export async function createBookingItemRequestFromCatalog(
  bookingIdOrRef: string,
  addOns: unknown[]
): Promise<{ requestId: string | null; posted: number; skipped: number }> {
  const bookingKey = String(bookingIdOrRef ?? '').trim();
  const source = Array.isArray(addOns) ? addOns : [];
  const lines = toBookingItemRequestLines(source);
  const skipped = Math.max(0, source.length - lines.length);

  if (!bookingKey || lines.length === 0) {
    return { requestId: null, posted: 0, skipped };
  }

  const response = await apiClient.post<CreateBookingItemRequestResponse>(
    '/api/market/booking-item-requests',
    {
      bookingId: bookingKey,
      reason: 'Booking catalog stock request',
      items: lines,
    }
  );

  return {
    requestId: typeof response?.id === 'string' ? response.id : null,
    posted: lines.length,
    skipped,
  };
}

export async function getMyBookings(): Promise<MyBookingItem[]> {
  const data = await apiClient.get<unknown>(`/api/bookings/my`, NO_STORE_OPTIONS);
  if (Array.isArray(data)) {
    return (data as MyBookingItem[]).map((item) => ({
      ...item,
      raw_status: item.raw_status ?? inferRawStatusFromClientStatus(item.status),
    }));
  }
  const payload = data as { data?: unknown[]; bookings?: unknown[] };
  const arr = payload?.data ?? payload?.bookings ?? [];
  return (arr as MyBookingItem[]).map((item) => ({
    ...item,
    raw_status: item.raw_status ?? inferRawStatusFromClientStatus(item.status),
  }));
}

export async function getBookingById(id: string): Promise<Record<string, unknown> | null> {
  try {
    return await apiClient.get<Record<string, unknown>>(`/api/bookings/${id}`, NO_STORE_OPTIONS);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 403 || status === 404) return null;
    throw err;
  }
}

/** Admin only. Get all bookings with optional status filter. Penciled bookings are sorted by penciled_at ASC. */
export async function getAllBookings(params?: {
  status?: 'penciled' | 'confirmed' | 'cancelled' | 'completed';
  page?: number;
  limit?: number;
}): Promise<{ data: Record<string, unknown>[]; pagination: { page: number; limit: number; total: number; total_pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const url = `/api/bookings/all${qs.toString() ? `?${qs}` : ''}`;
  return apiClient.get(url, NO_STORE_OPTIONS);
}

/** Admin only. Confirm a penciled booking (penciled -> confirmed). */
export async function confirmBooking(bookingId: string): Promise<{ id: string; status: string; confirmed_at: string; confirmed_by_user_id: number }> {
  return apiClient.patch(`/api/bookings/${bookingId}/confirm`, {});
}

/** Admin only. Decline a penciled booking (penciled -> cancelled). */
export async function declineBooking(bookingId: string): Promise<{ id: string; status: string }> {
  return apiClient.patch(`/api/bookings/${bookingId}/decline`, {});
}
