import type {
  BookingAvailability,
  BookingRecord,
  BookingStatus,
  CreateBookingInput,
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

function normalizeRecord(raw: any): BookingRecord {
  const now = toIsoNow();
  const checkIn = String(raw?.check_in_date ?? raw?.checkInDate ?? now);
  const checkOut = String(raw?.check_out_date ?? raw?.checkOutDate ?? now);
  const addOns = Array.isArray(raw?.add_ons) ? raw.add_ons : Array.isArray(raw?.addOns) ? raw.addOns : [];

  return {
    id: String(raw?.id ?? raw?.booking_id ?? `BK-${Date.now()}`),
    reference_code: raw?.reference_code ? String(raw.reference_code) : undefined,
    listing_id: String(raw?.listing_id ?? raw?.listingId ?? ''),
    check_in_date: checkIn,
    check_out_date: checkOut,
    num_guests: parseNumber(raw?.num_guests ?? raw?.numGuests, 1),
    extra_guests: parseNumber(raw?.extra_guests ?? raw?.extraGuests, 0),
    add_ons: addOns,
    landmark: raw?.landmark ? String(raw.landmark) : undefined,
    parking_info: raw?.parking_info ? String(raw.parking_info) : undefined,
    notes: raw?.notes ? String(raw.notes) : undefined,
    request_description: raw?.request_description ? String(raw.request_description) : undefined,
    payment_method: raw?.payment_method,
    require_payment: raw?.require_payment !== false,
    total_amount: parseNumber(raw?.total_amount ?? raw?.totalAmount, 0),
    status: normalizeStatus(raw?.status, 'pending'),
    transaction_number: String(raw?.transaction_number ?? raw?.transactionNumber ?? `TXN-${Date.now()}`),
    assigned_agent_id: raw?.assigned_agent_id ? String(raw.assigned_agent_id) : undefined,
    assigned_agent_email: raw?.assigned_agent_email ? String(raw.assigned_agent_email) : undefined,
    assigned_agent_name: raw?.assigned_agent_name ? String(raw.assigned_agent_name) : undefined,
    client: {
      first_name: String(raw?.client?.first_name ?? raw?.client?.firstName ?? ''),
      last_name: String(raw?.client?.last_name ?? raw?.client?.lastName ?? ''),
      nickname: raw?.client?.nickname ? String(raw.client.nickname) : undefined,
      email: String(raw?.client?.email ?? ''),
      contact_number: raw?.client?.contact_number ? String(raw.client.contact_number) : undefined,
      gender: raw?.client?.gender ? String(raw.client.gender) : undefined,
      birth_date: raw?.client?.birth_date ? String(raw.client.birth_date) : undefined,
      preferred_contact: raw?.client?.preferred_contact ? String(raw.client.preferred_contact) : undefined,
      referred_by: raw?.client?.referred_by ? String(raw.client.referred_by) : undefined,
    },
    created_at: String(raw?.created_at ?? raw?.createdAt ?? now),
    updated_at: String(raw?.updated_at ?? raw?.updatedAt ?? now),
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
        num_guests: input.num_guests,
        extra_guests: input.extra_guests,
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
