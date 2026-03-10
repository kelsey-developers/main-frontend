import { apiClient } from './client';

export interface BookingListItem {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

export interface MyBookingItem {
  id: string;
  reference_code?: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  total_amount: number;
  transaction_number: string;
  listing: { title: string; location: string; main_image_url: string };
  client: { first_name: string; last_name: string };
  payment?: { reference_number: string; status: string };
}

export interface CreateBookingInput {
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  extra_guests?: number;
  add_ons?: unknown[];
  landmark?: string;
  parking_info?: string;
  notes?: string;
  request_description?: string;
  payment_method?: string;
  require_payment?: boolean;
  total_amount?: number;
  guest_user_id?: number;
  assigned_agent_id?: string;
  assigned_agent_email?: string;
  assigned_agent_name?: string;
  client?: {
    first_name: string;
    last_name: string;
    nickname?: string;
    email: string;
    contact_number?: string;
    gender?: string;
    birth_date?: string;
    preferred_contact?: string;
    referred_by?: string;
  };
}

export async function getBookings(listingId: string): Promise<BookingListItem[]> {
  if (!listingId) return [];
  try {
    const data = await apiClient.get<unknown>(`/api/bookings?listingId=${encodeURIComponent(listingId)}`);
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

export async function getMyBookings(): Promise<MyBookingItem[]> {
  try {
    const data = await apiClient.get<unknown>(`/api/bookings/my`);
    if (Array.isArray(data)) return data as MyBookingItem[];
    const payload = data as { data?: unknown[]; bookings?: unknown[] };
    const arr = payload?.data ?? payload?.bookings ?? [];
    return arr as MyBookingItem[];
  } catch {
    return [];
  }
}

export async function getBookingById(id: string): Promise<Record<string, unknown> | null> {
  try {
    return await apiClient.get<Record<string, unknown>>(`/api/bookings/${id}`);
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 403 || status === 404) return null;
    throw err;
  }
}
