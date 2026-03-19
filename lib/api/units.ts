import type { Listing, ListingView } from '@/types/listing';
import { apiClient } from './client';
import type { NewListingFormPayload } from '@/components/NewListingForms';

type ApiError = Error & { status?: number };

const isUnitsApiUnavailable = (err: unknown) => {
  if (!(err instanceof Error)) return false;
  const error = err as ApiError;
  const message = error.message.toLowerCase();
  return error.status === 404 || message.includes('api route not found');
};

export async function createUnit(payload: NewListingFormPayload): Promise<Listing> {
  const body: Record<string, unknown> = {
    unit_name: payload.title,
    tower_building: payload.tower_building,
    unit_number: payload.unit_number,
    description: payload.description,
    base_price: payload.price,
    location: payload.location,
    city: payload.city,
    country: payload.country,
    bedroom_count: payload.bedrooms,
    bathroom_count: payload.bathrooms,
    area_sqm: payload.square_feet,
    unit_type: payload.property_type.toLowerCase(),
    min_pax: payload.min_pax,
    max_capacity: payload.max_capacity,
    excess_pax_fee: payload.excess_pax_fee,
    amenities: payload.amenities,
    check_in_time: payload.check_in_time,
    check_out_time: payload.check_out_time,
    latitude: payload.latitude,
    longitude: payload.longitude,
    status: 'available',
    is_featured: false,
    images: buildImages(payload.main_image_url, payload.image_urls),
  };
  if (payload.assigned_agent_ids != null && payload.assigned_agent_ids.length > 0) {
    body.assigned_agent_ids = payload.assigned_agent_ids;
  }
  if (payload.discount_rules != null && payload.discount_rules.length > 0) {
    body.discount_rules = payload.discount_rules;
  }
  if (payload.holiday_pricing_rules != null && payload.holiday_pricing_rules.length > 0) {
    body.holiday_pricing_rules = payload.holiday_pricing_rules;
  }
  const data = await apiClient.post<Record<string, unknown>>('/api/units', body);
  return toListing(data);
}

function buildImages(
  mainUrl: string | undefined,
  imageUrls: string[] | undefined
): { url: string; is_main: boolean; sort_order: number }[] {
  const seen = new Set<string>();
  const images: { url: string; is_main: boolean; sort_order: number }[] = [];
  if (mainUrl && mainUrl.trim()) {
    images.push({ url: mainUrl.trim(), is_main: true, sort_order: 0 });
    seen.add(mainUrl.trim());
  }
  let sortOrder = 1;
  (imageUrls ?? []).forEach((url) => {
    const u = (url || '').trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    images.push({ url: u, is_main: false, sort_order: sortOrder++ });
  });
  return images;
}

export async function listUnitsForManage(params?: { search?: string }): Promise<Listing[]> {
  try {
    const qs = params?.search?.trim() ? `?search=${encodeURIComponent(params.search.trim())}` : '';
    const data = await apiClient.get<unknown[]>(`/api/units/manage${qs}`);
    return Array.isArray(data) ? data.map((u) => toManageListing(u as Record<string, unknown>)) : [];
  } catch (err) {
    if (isUnitsApiUnavailable(err)) return [];
    throw err;
  }
}

export async function updateUnit(
  id: string,
  updates: { status?: 'available' | 'unavailable' | 'maintenance'; is_featured?: boolean; assigned_agent_ids?: string[] }
): Promise<{ id: string; status?: string; is_available?: boolean; is_featured?: boolean; updated_at: string; assigned_agent_ids?: string[] }> {
  return apiClient.patch(`/api/units/${id}`, updates);
}

export async function updateUnitFull(id: string, payload: NewListingFormPayload): Promise<Listing> {
  const body: Record<string, unknown> = {
    unit_name: payload.title,
    tower_building: payload.tower_building,
    unit_number: payload.unit_number,
    description: payload.description,
    base_price: payload.price,
    location: payload.location,
    city: payload.city,
    country: payload.country,
    bedroom_count: payload.bedrooms,
    bathroom_count: payload.bathrooms,
    area_sqm: payload.square_feet,
    unit_type: payload.property_type.toLowerCase(),
    min_pax: payload.min_pax,
    max_capacity: payload.max_capacity,
    excess_pax_fee: payload.excess_pax_fee,
    amenities: payload.amenities,
    check_in_time: payload.check_in_time,
    check_out_time: payload.check_out_time,
    latitude: payload.latitude,
    longitude: payload.longitude,
    images: buildImages(payload.main_image_url, payload.image_urls),
  };
  if (payload.assigned_agent_ids != null) {
    body.assigned_agent_ids = payload.assigned_agent_ids;
  }
  if (payload.discount_rules != null) {
    body.discount_rules = payload.discount_rules;
  }
  if (payload.holiday_pricing_rules != null) {
    body.holiday_pricing_rules = payload.holiday_pricing_rules;
  }
  const data = await apiClient.put<Record<string, unknown>>(`/api/units/${id}`, body);
  return toListing(data);
}

export async function deleteUnit(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiClient.delete(`/api/units/${id}`);
}

function toManageListing(u: Record<string, unknown>): Listing {
  const base = toListing(u);
  const owner = u.owner as { id: string; fullname: string; email: string } | null | undefined;
  const assignedAgents = u.assigned_agents as { id: string; username: string; fullname: string }[] | undefined;
  return {
    ...base,
    owner: owner ? { id: String(owner.id), fullname: owner.fullname || 'N/A', email: owner.email || '' } : null,
    bookings_count: typeof u.bookings_count === 'number' ? u.bookings_count : 0,
    assigned_agents: Array.isArray(assignedAgents) ? assignedAgents : [],
    assigned_agent_ids: Array.isArray(u.assigned_agent_ids) ? u.assigned_agent_ids.map(String) : [],
    discount_rules: Array.isArray(u.discount_rules) ? u.discount_rules : base.discount_rules,
    holiday_pricing_rules: Array.isArray(u.holiday_pricing_rules) ? u.holiday_pricing_rules : base.holiday_pricing_rules,
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

/**
 * Fetch properties (units) for an agent by username. Used by agent profile page.
 * Calls GET /api/agents/:username/properties.
 */
export async function getAgentProperties(username: string): Promise<ListingView[]> {
  try {
    const data = await apiClient.get<unknown[]>(`/api/agents/${encodeURIComponent(username)}/properties`);
    return Array.isArray(data) ? data.map((u) => toListingView(u as Record<string, unknown>)) : [];
  } catch (err) {
    if (err instanceof Error && ((err as Error & { status?: number }).status === 404 || isUnitsApiUnavailable(err))) {
      return [];
    }
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
  const price = Number(u.price ?? u.base_price ?? 0);
  const rawCurrency = String(u.currency ?? '₱');
  // External API sometimes returns garbled currency symbol due to encoding — normalise to ₱
  const currency = rawCurrency === '?' || rawCurrency.trim() === '' ? '₱' : rawCurrency;
  return {
    id: String(u.id),
    title: String(u.title ?? ''),
    description: u.description ? String(u.description) : undefined,
    price,
    price_unit: String(u.price_unit ?? 'night'),
    currency,
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
  const assignedAgentIds = Array.isArray(u.assigned_agent_ids) ? u.assigned_agent_ids.map(String) : undefined;
  return {
    id: String(u.id),
    title: String(u.title ?? ''),
    tower_building: u.tower_building ? String(u.tower_building) : undefined,
    unit_number: u.unit_number ? String(u.unit_number) : undefined,
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
    min_pax: u.min_pax != null ? Number(u.min_pax) : undefined,
    max_capacity: u.max_capacity != null ? Number(u.max_capacity) : undefined,
    excess_pax_fee: u.excess_pax_fee != null ? Number(u.excess_pax_fee) : undefined,
    created_at: String(u.created_at ?? ''),
    updated_at: String(u.updated_at ?? ''),
    ...(assignedAgentIds ? { assigned_agent_ids: assignedAgentIds } : {}),
    ...(Array.isArray(u.discount_rules) ? { discount_rules: u.discount_rules as Listing['discount_rules'] } : {}),
    ...(Array.isArray(u.holiday_pricing_rules) ? { holiday_pricing_rules: u.holiday_pricing_rules as Listing['holiday_pricing_rules'] } : {}),
  };
}
