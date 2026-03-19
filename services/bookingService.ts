import type {
  BookingAvailability,
  BookingRecord,
  BookingStatus,
  CreateBookingInput,
  AdditionalService,
  PaymentMethod,
} from '@/types/booking';
import { getBookings, createBooking as createBookingApi } from '@/lib/api/bookings';

const LOCAL_BOOKINGS_KEY = 'booking_temporary_records_v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toIsoNow() {
  return new Date().toISOString();
}

function parseNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeStatus(value: unknown, fallback: BookingStatus = 'pending'): BookingStatus {
  const status = String(value ?? fallback).toLowerCase();
  switch (status) {
    case 'pending':
    case 'pending-payment':
    case 'booked':
    case 'ongoing':
    case 'completed':
    case 'declined':
    case 'cancelled':
    case 'penciled':
    case 'confirmed':
      return status as BookingStatus;
    default:
      return fallback;
  }
}

function normalizeRecord(raw: unknown): BookingRecord {
  const now = toIsoNow();
  const r = raw as Record<string, unknown>;

  const checkIn = String(r['check_in_date'] ?? r['checkInDate'] ?? now);
  const checkOut = String(r['check_out_date'] ?? r['checkOutDate'] ?? now);

  const addOnsRaw = Array.isArray(r['add_ons'])
    ? r['add_ons']
    : Array.isArray(r['addOns'])
      ? r['addOns']
      : [];

  // Normalize add-on lines to a stable schema used across the UI + inventory sync.
  // Note: we treat `id` as the inventory product/item id.
  const normalizedAddOns: AdditionalService[] = (addOnsRaw as unknown[]).map((a) => {
    const rec = a as Record<string, unknown>;
    const idVal = rec['id'] ?? rec['productId'] ?? rec['inventory_product_id'];
    const nameVal = rec['name'] ?? rec['productName'];
    const quantityVal = rec['quantity'] ?? rec['qty'];
    const chargeVal = rec['charge'] ?? rec['unitPrice'] ?? rec['unit_price'] ?? rec['unitCost'] ?? rec['unit_cost'];

    return {
      id: String(idVal ?? ''),
      name: String(nameVal ?? ''),
      quantity: parseNumber(quantityVal, 0),
      charge: parseNumber(chargeVal, 0),
    };
  }).filter((a) => Boolean(a.id) && a.quantity > 0);

  return {
    id: String(r['id'] ?? r['booking_id'] ?? `BK-${Date.now()}`),
    reference_code: r['reference_code'] ? String(r['reference_code']) : undefined,
    listing_id: String(r['listing_id'] ?? r['listingId'] ?? ''),
    check_in_date: checkIn,
    check_out_date: checkOut,
    total_guests: parseNumber(
      r['total_guests'] ??
        r['totalGuests'] ??
        // handle older/alternate property names
        ((r['num_guests'] ?? r['numGuests'] ?? 1) as number) + ((r['extra_guests'] ?? r['extraGuests'] ?? 0) as number),
      1
    ),
    add_ons: normalizedAddOns,
    landmark: r['landmark'] ? String(r['landmark']) : undefined,
    parking_info: r['parking_info'] ? String(r['parking_info']) : undefined,
    notes: r['notes'] ? String(r['notes']) : undefined,
    request_description: r['request_description'] ? String(r['request_description']) : undefined,
    payment_method:
      typeof r['payment_method'] === 'string' ? (r['payment_method'] as PaymentMethod) : undefined,
    require_payment: r['require_payment'] !== false,
    total_amount: parseNumber(r['total_amount'] ?? r['totalAmount'], 0),
    status: normalizeStatus(r['status'], 'pending'),
    transaction_number: String(r['transaction_number'] ?? r['transactionNumber'] ?? `TXN-${Date.now()}`),
    assigned_agent_id: r['assigned_agent_id'] ? String(r['assigned_agent_id']) : undefined,
    assigned_agent_email: r['assigned_agent_email'] ? String(r['assigned_agent_email']) : undefined,
    assigned_agent_name: r['assigned_agent_name'] ? String(r['assigned_agent_name']) : undefined,
    client: (() => {
      const c = r['client'] as Record<string, unknown> | undefined;
      if (!c) return { first_name: '', last_name: '', email: '' };
      return {
        first_name: String(c['first_name'] ?? c['firstName'] ?? ''),
        last_name: String(c['last_name'] ?? c['lastName'] ?? ''),
        nickname: c['nickname'] ? String(c['nickname']) : undefined,
        email: String(c['email'] ?? ''),
        contact_number: c['contact_number'] ? String(c['contact_number']) : undefined,
        gender: c['gender'] ? String(c['gender']) : undefined,
        birth_date: c['birth_date'] ? String(c['birth_date']) : undefined,
        preferred_contact: c['preferred_contact'] ? String(c['preferred_contact']) : undefined,
        referred_by: c['referred_by'] ? String(c['referred_by']) : undefined,
      };
    })(),
    created_at: String(r['created_at'] ?? r['createdAt'] ?? now),
    updated_at: String(r['updated_at'] ?? r['updatedAt'] ?? now),
  };
}

function readLocalBookings(): BookingRecord[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord);
  } catch {
    return [];
  }
}

function writeLocalBookings(records: BookingRecord[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(records));
}

function toAvailability(item: { id: string; check_in_date: string; check_out_date: string; status?: string }): BookingAvailability {
  return {
    id: item.id,
    check_in_date: item.check_in_date,
    check_out_date: item.check_out_date,
    status: item.status,
  };
}

export const BookingService = {
  async getBookingsForListing(listingId: string): Promise<BookingAvailability[]> {
    if (!listingId) return [];

    try {
      const items = await getBookings(listingId);
      return items.map(toAvailability);
    } catch {
      return readLocalBookings()
        .filter((record) => record.listing_id === listingId)
        .map((r) => toAvailability(r));
    }
  },

  async createBooking(input: CreateBookingInput): Promise<BookingRecord> {
    try {
      const payload = await createBookingApi(input);
      return normalizeRecord(payload);
    } catch (err) {
      // Re-throw API errors (409 overlap, 401, etc.) so the UI can show them
      if (err instanceof Error && (err as Error & { status?: number }).status != null) {
        throw err;
      }
      // Fall back to localStorage only when API is unavailable (network error, etc.)
      const now = toIsoNow();
      const records = readLocalBookings();
      const created: BookingRecord = {
        id: `BK-${Date.now()}`,
        listing_id: input.listing_id,
        check_in_date: input.check_in_date,
        check_out_date: input.check_out_date,
        total_guests: input.total_guests,
        add_ons: input.add_ons,
        landmark: input.landmark,
        parking_info: input.parking_info,
        notes: input.notes,
        request_description: input.request_description,
        payment_method: input.payment_method,
        require_payment: input.require_payment,
        total_amount: input.total_amount,
        status: input.require_payment === false ? 'pending' : 'pending-payment',
        transaction_number: `TXN-${Date.now()}`,
        assigned_agent_id: input.assigned_agent_id,
        assigned_agent_email: input.assigned_agent_email,
        assigned_agent_name: input.assigned_agent_name,
        client: input.client,
        created_at: now,
        updated_at: now,
      };

      records.unshift(created);
      writeLocalBookings(records);
      return created;
    }
  },
};
