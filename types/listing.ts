export interface ListingOwner {
  id: string;
  fullname: string;
  email: string;
}

export interface AssignedAgent {
  id: string;
  username: string;
  fullname: string;
}

/** Discount rule for stay-length based pricing */
export interface DiscountRule {
  id: string;
  minNights: number;
  discountType: 'percentage' | 'fixed';
  discountPercent?: number;
  discountAmount?: number;
  label: string;
}

/** Holiday pricing rule — surcharge or discount on specific dates */
export interface HolidayPricingRule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  adjustmentType: 'increase' | 'discount';
  adjustmentMode: 'percentage' | 'fixed';
  adjustmentPercent?: number;
  adjustmentAmount?: number;
}

export interface Listing {
  id: string;
  title: string;
  unit_number?: string;
  tower_building?: string;
  description?: string;
  price: number;
  price_unit: string;
  currency: string;
  location: string;
  city?: string;
  country?: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  property_type: string;
  main_image_url?: string;
  image_urls?: string[];
  amenities?: string[];
  is_available: boolean;
  is_featured: boolean;
  latitude?: number;
  longitude?: number;
  check_in_time?: string;
  check_out_time?: string;
  min_pax?: number;
  max_capacity?: number;
  excess_pax_fee?: number;
  has_parking?: boolean;
  parking_fee?: number;
  created_at: string;
  updated_at: string;
  owner?: ListingOwner | null;
  bookings_count?: number;
  assigned_agents?: AssignedAgent[];
  assigned_agent_ids?: string[];
  discount_rules?: DiscountRule[];
  holiday_pricing_rules?: HolidayPricingRule[];
}

export interface ListingView {
  id: string;
  title: string;
  description?: string;
  price: number;
  price_unit: string;
  currency: string;
  location: string;
  city?: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  property_type: string;
  main_image_url?: string;
  amenities?: string[];
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  details: string;
  formatted_price: string;
}
