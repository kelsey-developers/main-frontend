export interface Listing {
  id: string;
  title: string;
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
  created_at: string;
  updated_at: string;
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
