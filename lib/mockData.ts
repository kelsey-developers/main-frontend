import type { ListingView } from '@/types/listing';

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
