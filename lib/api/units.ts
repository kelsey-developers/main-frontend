import type { Listing, ListingView } from '@/types/listing';
import { apiClient } from './client';

type ApiError = Error & { status?: number };

const isUnitsApiUnavailable = (err: unknown) => {
  if (!(err instanceof Error)) return false;
  const error = err as ApiError;
  const message = error.message.toLowerCase();
  return error.status === 404 || message.includes('api route not found');
};

export async function listUnitsForManage(): Promise<Listing[]> {
  try {
    const data = await apiClient.get<unknown[]>('/api/units/manage');
    return Array.isArray(data) ? data.map((u) => toManageListing(u as Record<string, unknown>)) : [];
  } catch (err) {
    if (isUnitsApiUnavailable(err)) return [];
    throw err;
  }
}

export async function updateUnit(
  id: string,
  updates: { status?: 'available' | 'unavailable' | 'maintenance'; is_featured?: boolean }
): Promise<{ id: string; status: string; is_available: boolean; is_featured: boolean; updated_at: string }> {
  return apiClient.patch(`/api/units/${id}`, updates);
}

function toManageListing(u: Record<string, unknown>): Listing {
  const base = toListing(u);
  const owner = u.owner as { id: string; fullname: string; email: string } | null | undefined;
  return {
    ...base,
    owner: owner ? { id: String(owner.id), fullname: owner.fullname || 'N/A', email: owner.email || '' } : null,
    bookings_count: typeof u.bookings_count === 'number' ? u.bookings_count : 0,
  };
}

export interface ListUnitsParams {
  featured?: boolean;
  city?: string;
  limit?: number;
  offset?: number;
}

export async function listUnits(params?: ListUnitsParams): Promise<ListingView[]> {
  const searchParams = new URLSearchParams();
  if (params?.featured) searchParams.set('featured', 'true');
  if (params?.city) searchParams.set('city', params.city);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  try {
    const data = await apiClient.get<unknown[]>(`/api/units${qs ? `?${qs}` : ''}`);
    return (Array.isArray(data) ? data : []).map((u) => toListingView(u as Record<string, unknown>));
  } catch (err) {
    if (isUnitsApiUnavailable(err)) return [];
    throw err;
  }
}

export async function getUnitById(id: string): Promise<Listing | null> {
  try {
    const data = await apiClient.get<Record<string, unknown>>(`/api/units/${id}`);
    return toListing(data);
  } catch (err) {
    if (err instanceof Error && ((err as Error & { status?: number }).status === 404 || isUnitsApiUnavailable(err))) {
      return null;
    }
    throw err;
  }
}

function toListingView(u: Record<string, unknown>): ListingView {
  const price = Number(u.price ?? 0);
  return {
    id: String(u.id),
    title: String(u.title ?? ''),
    description: u.description ? String(u.description) : undefined,
    price,
    price_unit: String(u.price_unit ?? 'night'),
    currency: String(u.currency ?? '₱'),
    location: String(u.location ?? ''),
    city: u.city ? String(u.city) : undefined,
    bedrooms: Number(u.bedrooms ?? 0),
    bathrooms: Number(u.bathrooms ?? 0),
    square_feet: u.square_feet != null ? Number(u.square_feet) : undefined,
    property_type: String(u.property_type ?? ''),
    main_image_url: u.main_image_url ? String(u.main_image_url) : undefined,
    amenities: Array.isArray(u.amenities) ? u.amenities.map(String) : [],
    is_available: Boolean(u.is_available),
    is_featured: Boolean(u.is_featured),
    created_at: String(u.created_at ?? ''),
    updated_at: String(u.updated_at ?? ''),
    details: String(u.description ?? ''),
    formatted_price: `${u.currency ?? '₱'}${price.toLocaleString()} / ${u.price_unit ?? 'night'}`,
  };
}

function toListing(u: Record<string, unknown>): Listing {
  const price = Number(u.price ?? 0);
  return {
    id: String(u.id),
    title: String(u.title ?? ''),
    description: u.description ? String(u.description) : undefined,
    price,
    price_unit: String(u.price_unit ?? 'night'),
    currency: String(u.currency ?? '₱'),
    location: String(u.location ?? ''),
    city: u.city ? String(u.city) : undefined,
    country: u.country ? String(u.country) : undefined,
    bedrooms: Number(u.bedrooms ?? 0),
    bathrooms: Number(u.bathrooms ?? 0),
    square_feet: u.square_feet != null ? Number(u.square_feet) : undefined,
    property_type: String(u.property_type ?? ''),
    main_image_url: u.main_image_url ? String(u.main_image_url) : undefined,
    image_urls: Array.isArray(u.image_urls) ? u.image_urls.map(String) : [],
    amenities: Array.isArray(u.amenities) ? u.amenities.map(String) : [],
    is_available: Boolean(u.is_available),
    is_featured: Boolean(u.is_featured),
    latitude: u.latitude != null ? Number(u.latitude) : undefined,
    longitude: u.longitude != null ? Number(u.longitude) : undefined,
    check_in_time: u.check_in_time ? String(u.check_in_time) : undefined,
    check_out_time: u.check_out_time ? String(u.check_out_time) : undefined,
    created_at: String(u.created_at ?? ''),
    updated_at: String(u.updated_at ?? ''),
  };
}
