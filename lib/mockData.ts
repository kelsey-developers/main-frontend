import type { ListingView, Listing } from '@/types/listing';

export const mockListings: ListingView[] = [
  {
    id: '1',
    title: 'Luxury Beachfront Villa',
    description: 'Experience paradise in this stunning beachfront villa with panoramic ocean views, private pool, and direct beach access. Perfect for families and groups seeking luxury.',
    price: 8500,
    price_unit: 'night',
    currency: '₱',
    location: 'Boracay, Aklan, Philippines',
    city: 'Boracay',
    bedrooms: 4,
    bathrooms: 3,
    square_feet: 2500,
    property_type: 'villa',
    main_image_url: '/heroimage.png',
    amenities: ['Beach Access', 'Private Pool', 'WiFi', 'Air Conditioning', 'Full Kitchen'],
    is_available: true,
    is_featured: true,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
    details: 'Luxury beachfront property',
    formatted_price: '₱8,500 / night'
  },
  {
    id: '2',
    title: 'Modern City Condo',
    description: 'Contemporary 2-bedroom condo in the heart of Manila. Walking distance to shopping malls, restaurants, and entertainment. Great for business travelers and tourists.',
    price: 3500,
    price_unit: 'night',
    currency: '₱',
    location: 'Makati, Metro Manila, Philippines',
    city: 'Makati',
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1200,
    property_type: 'condo',
    main_image_url: '/heroimage.png',
    amenities: ['WiFi', 'Gym Access', 'Pool', 'Parking', 'Security'],
    is_available: true,
    is_featured: true,
    created_at: '2025-01-20T00:00:00Z',
    updated_at: '2025-02-03T00:00:00Z',
    details: 'Modern condo in business district',
    formatted_price: '₱3,500 / night'
  },
  {
    id: '3',
    title: 'Cozy Mountain Retreat',
    description: 'Escape to this charming mountain cabin surrounded by nature. Features fireplace, mountain views, and hiking trails nearby. Perfect for a peaceful getaway.',
    price: 4200,
    price_unit: 'night',
    currency: '₱',
    location: 'Tagaytay, Cavite, Philippines',
    city: 'Tagaytay',
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1800,
    property_type: 'house',
    main_image_url: '/heroimage.png',
    amenities: ['Fireplace', 'Mountain View', 'Garden', 'BBQ Area', 'Parking'],
    is_available: true,
    is_featured: true,
    created_at: '2025-01-25T00:00:00Z',
    updated_at: '2025-02-05T00:00:00Z',
    details: 'Peaceful mountain escape',
    formatted_price: '₱4,200 / night'
  }
];

export const mockLocations = ['Boracay', 'Makati', 'Tagaytay', 'Cebu City', 'Palawan'];

export const getFeaturedListings = (): ListingView[] => {
  return mockListings.filter(listing => listing.is_featured).slice(0, 3);
};

export const getAvailableLocations = (): string[] => {
  return mockLocations;
};

// Detailed unit listings for unit-view pages
export const unitListings: Record<string, Listing> = {
  '1': {
    id: '1',
    title: 'Apartment complex in Davao',
    location: 'Medina, Apilaya Davao City',
    city: 'Davao City',
    price: 4320,
    currency: '₱',
    price_unit: 'night',
    bedrooms: 2,
    bathrooms: 1,
    square_feet: 800,
    property_type: 'Apartment',
    description: 'A beautiful apartment complex in the heart of Davao City with modern amenities and great location. This spacious 2-bedroom unit features a modern kitchen, comfortable living area, and stunning city views. Perfect for families or business travelers looking for a home away from home.',
    main_image_url: '/heroimage.png',
    image_urls: ['/heroimage.png', '/heroimage.png', '/heroimage.png'],
    amenities: ['WiFi', 'Air Conditioning', 'Kitchen', 'Parking', 'TV', 'Washing Machine', 'Security', '24/7 Reception'],
    is_featured: true,
    is_available: true,
    latitude: 7.1907,
    longitude: 125.4553,
    country: 'Philippines',
    check_in_time: '14:00',
    check_out_time: '11:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  '2': {
    id: '2',
    title: 'Modern Condo in Manila',
    location: 'Makati, Metro Manila',
    city: 'Manila',
    price: 3500,
    currency: '₱',
    price_unit: 'night',
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 600,
    property_type: 'Condo',
    description: 'Modern condominium in the business district of Makati with stunning city views. This stylish studio unit offers a contemporary living space with premium finishes and access to world-class amenities including a swimming pool, gym, and sky lounge.',
    main_image_url: '/heroimage.png',
    image_urls: ['/heroimage.png', '/heroimage.png'],
    amenities: ['WiFi', 'Air Conditioning', 'Pool', 'Gym', 'Parking', 'Security'],
    is_featured: false,
    is_available: true,
    latitude: 14.5547,
    longitude: 121.0244,
    country: 'Philippines',
    check_in_time: '15:00',
    check_out_time: '12:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  '3': {
    id: '3',
    title: 'Cozy House in Cebu',
    location: 'Lahug, Cebu City',
    city: 'Cebu City',
    price: 2800,
    currency: '₱',
    price_unit: 'night',
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1200,
    property_type: 'House',
    description: 'Cozy family house in a quiet neighborhood of Cebu with garden and parking space. This charming 3-bedroom home provides a peaceful retreat with modern comforts, spacious rooms, and a lovely outdoor area perfect for relaxation and family gatherings.',
    main_image_url: '/heroimage.png',
    image_urls: ['/heroimage.png', '/heroimage.png', '/heroimage.png', '/heroimage.png'],
    amenities: ['WiFi', 'Air Conditioning', 'Garden', 'Parking', 'Kitchen', 'BBQ Area', 'Pet Friendly'],
    is_featured: false,
    is_available: true,
    latitude: 10.3157,
    longitude: 123.8854,
    country: 'Philippines',
    check_in_time: '13:00',
    check_out_time: '10:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

export const getListingById = (id: string): Listing | undefined => {
  return unitListings[id];
};

export const getListingsByCity = (city: string, excludeId?: string): Listing[] => {
  return Object.values(unitListings).filter(
    l => l.city === city && l.id !== excludeId
  );
};

export const getAllUnitListings = (): Listing[] => {
  return Object.values(unitListings);
};
