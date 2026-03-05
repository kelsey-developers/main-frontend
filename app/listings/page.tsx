'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockListings } from '@/lib/mockData';
import type { ListingView } from '@/types/listing';
import CompactPropertyCard from './components/CompactPropertyCard';

const AllListingsContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state with URL params
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState(() => searchParams.get('location') || '');
  const [propertyType, setPropertyType] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState(() => ({
    min: parseInt(searchParams.get('minPrice') || '0'),
    max: parseInt(searchParams.get('maxPrice') || '10000')
  }));
  const [bedroomsRange, setBedroomsRange] = useState({ min: 0, max: 10 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [listings, setListings] = useState<ListingView[]>([]);
  const [allListings, setAllListings] = useState<ListingView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('A-Z');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([]);
  const [availableAmenities, setAvailableAmenities] = useState<string[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isBedroomsDropdownOpen, setIsBedroomsDropdownOpen] = useState(false);
  const [isAmenitiesDropdownOpen, setIsAmenitiesDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced search effect - skip initial mount to avoid double filtering
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Skip search on initial mount since filtering is already done in fetchListings
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isLoading && allListings.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 500);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, searchLocation, propertyType, recentlyAdded, selectedAmenities, priceRange, bedroomsRange, allListings]);

  // Handle URL parameters change
  useEffect(() => {
    const locationParam = searchParams.get('location');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');

    if (locationParam !== null && searchLocation !== locationParam) {
      setSearchLocation(locationParam);
    }
    if (minPriceParam) {
      const minPrice = parseInt(minPriceParam);
      if (priceRange.min !== minPrice) {
        setPriceRange(prev => ({ ...prev, min: minPrice }));
      }
    }
    if (maxPriceParam) {
      const maxPrice = parseInt(maxPriceParam);
      if (priceRange.max !== maxPrice) {
        setPriceRange(prev => ({ ...prev, max: maxPrice }));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Fetch all listings from mock data
    const fetchListings = async () => {
      try {
        setError(null);
        const fetchedListings = mockListings;
        setAllListings(fetchedListings);
        
        // Extract unique locations for dropdown
        const locations = [...new Set(fetchedListings.map(listing => listing.city).filter((city): city is string => Boolean(city)))];
        setAvailableLocations(locations);
        
        // Extract unique property types
        const types = [...new Set(fetchedListings.map(listing => listing.property_type).filter((type): type is string => Boolean(type)))];
        setAvailablePropertyTypes(types);
        
        // Extract unique amenities
        const amenitiesSet = new Set<string>();
        fetchedListings.forEach(listing => {
          if (listing.amenities && Array.isArray(listing.amenities)) {
            listing.amenities.forEach(amenity => {
              if (amenity) amenitiesSet.add(amenity);
            });
          }
        });
        setAvailableAmenities(Array.from(amenitiesSet).sort());
        
        // Set max price from actual data (only if not from URL)
        const maxPrice = Math.max(...fetchedListings.map(l => l.price || 0));
        setPriceRange(prev => {
          const newMax = maxPrice > 0 ? maxPrice : 10000;
          // Only update if current max is still the default 10000
          return prev.max === 10000 ? { ...prev, max: newMax } : prev;
        });
        
        // Set max bedrooms from actual data
        const maxBedrooms = Math.max(...fetchedListings.map(l => l.bedrooms || 0));
        setBedroomsRange(prev => ({ ...prev, max: maxBedrooms > 0 ? maxBedrooms : 10 }));
        
        // Apply initial filtering based on current state (including URL params)
        let initialFiltered = [...fetchedListings];
        
        // Filter by location if set
        if (searchLocation) {
          initialFiltered = initialFiltered.filter(listing =>
            listing.city?.toLowerCase().includes(searchLocation.toLowerCase())
          );
        }
        
        // Filter by price range
        initialFiltered = initialFiltered.filter(listing =>
          listing.price >= priceRange.min && listing.price <= priceRange.max
        );
        
        // Set the initial filtered listings
        setListings(initialFiltered);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load listings. Please try again later.');
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchLocation, priceRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setIsLocationDropdownOpen(false);
        setIsPriceDropdownOpen(false);
        setIsTypeDropdownOpen(false);
        setIsBedroomsDropdownOpen(false);
        setIsAmenitiesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleListingClick = (listingId: string) => {
    router.push(`/unit-view?id=${listingId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const performSearch = () => {
    if (allListings.length === 0) return;
    
    setIsLoading(true);
    try {
      setError(null);
      
      let filteredListings = [...allListings];

      // Filter by name
      if (searchName) {
        filteredListings = filteredListings.filter(listing =>
          listing.title.toLowerCase().includes(searchName.toLowerCase())
        );
      }

      // Filter by location
      if (searchLocation) {
        filteredListings = filteredListings.filter(listing =>
          listing.city?.toLowerCase().includes(searchLocation.toLowerCase())
        );
      }

      // Filter by property type
      if (propertyType) {
        filteredListings = filteredListings.filter(listing =>
          listing.property_type === propertyType
        );
      }

      // Filter by price range
      filteredListings = filteredListings.filter(listing =>
        listing.price >= priceRange.min && listing.price <= priceRange.max
      );

      // Filter by bedrooms range
      filteredListings = filteredListings.filter(listing =>
        listing.bedrooms >= bedroomsRange.min && listing.bedrooms <= bedroomsRange.max
      );

      // Filter by recently added
      if (recentlyAdded) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filteredListings = filteredListings.filter(listing => {
          const listingDate = new Date(listing.created_at);
          return listingDate >= oneWeekAgo;
        });
      }

      // Filter by amenities
      if (selectedAmenities.length > 0) {
        filteredListings = filteredListings.filter(listing => {
          if (!listing.amenities || !Array.isArray(listing.amenities)) return false;
          return selectedAmenities.every(amenity => 
            listing.amenities!.includes(amenity)
          );
        });
      }
      
      setListings(filteredListings);
    } catch (err) {
      console.error('Error searching listings:', err);
      setError('Failed to search listings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchLocation('');
    setPropertyType('');
    setRecentlyAdded(false);
    setSelectedAmenities([]);
    setPriceRange({ min: 0, max: Math.max(...allListings.map(l => l.price || 0)) || 10000 });
    setBedroomsRange({ min: 0, max: Math.max(...allListings.map(l => l.bedrooms || 0)) || 10 });
    setSortBy('A-Z');
  };

  const hasActiveFilters = () => {
    return searchName !== '' || searchLocation !== '' || propertyType !== '' || 
           recentlyAdded || selectedAmenities.length > 0 ||
           priceRange.min !== 0 || priceRange.max < 10000 ||
           bedroomsRange.min !== 0 || bedroomsRange.max < 10;
  };

  const handleLocationSelect = (location: string) => {
    setSearchLocation(location);
    setIsLocationDropdownOpen(false);
  };

  const handlePropertyTypeSelect = (type: string) => {
    setPropertyType(type);
    setIsTypeDropdownOpen(false);
  };

  const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    setPriceRange(prev => ({ ...prev, [field]: value }));
  };

  const handleBedroomsRangeChange = (field: 'min' | 'max', value: number) => {
    setBedroomsRange(prev => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const sortedListings = [...listings].sort((a, b) => {
    switch (sortBy) {
      case 'Price: Low to High':
        return (a.price || 0) - (b.price || 0);
      case 'A-Z':
        return (a.title || '').localeCompare(b.title || '');
      default:
        return 0;
    }
  });

  // Compact Skeleton component
  const SkeletonCard = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse border border-gray-100">
      <div className="h-40 bg-gray-300"></div>
      <div className="p-3">
        <div className="h-4 bg-gray-300 rounded w-full mb-3"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3 mb-2"></div>
        <div className="flex justify-between mb-2">
          <div className="h-3 bg-gray-300 rounded w-8"></div>
          <div className="h-3 bg-gray-300 rounded w-8"></div>
        </div>
        <div className="h-5 bg-gray-300 rounded w-24"></div>
      </div>
    </div>
  );

  if (error && listings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 relative" style={{overflow: 'visible'}}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0" style={{overflow: 'visible'}}>
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-200 sticky top-[64px] z-40" style={{overflow: 'visible'}}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                {hasActiveFilters() && (
                  <button onClick={clearFilters} className="px-3 py-1.5 text-xs text-[#0B5858] hover:text-[#094747] transition-colors font-medium flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Name Search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name</label>
                  <input type="text" placeholder="Property name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none transition-all text-sm" />
                </div>

                {/* Location Dropdown */}
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <input type="text" placeholder="All locations" value={searchLocation} readOnly onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none cursor-pointer transition-all bg-white text-sm" />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isLocationDropdownOpen && (
                      <div className="absolute z-[99999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-auto">
                        <button onClick={() => { setSearchLocation(''); setIsLocationDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors">All locations</button>
                        {availableLocations.map((location) => (
                          <button key={location} onClick={() => { setSearchLocation(location); setIsLocationDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors">{location}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Type Dropdown */}
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                  <div className="relative">
                    <input type="text" placeholder="All types" value={propertyType} readOnly onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none cursor-pointer transition-all bg-white text-sm" />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isTypeDropdownOpen && (
                      <div className="absolute z-[99999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-auto">
                        <button onClick={() => { setPropertyType(''); setIsTypeDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors">All types</button>
                        {availablePropertyTypes.map((type) => (
                          <button key={type} onClick={() => { setPropertyType(type); setIsTypeDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors capitalize">{type}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recently Added */}
                <div className="relative">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <input type="checkbox" checked={recentlyAdded} onChange={(e) => setRecentlyAdded(e.target.checked)} className="w-4 h-4 text-[#0B5858] border-gray-300 rounded focus:ring-[#0B5858] focus:ring-2" />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">Recently Added (Last 7 days)</span>
                  </label>
                </div>

                {/* Price Range */}
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                  <div className="relative">
                    <input type="text" placeholder={`₱${priceRange.min} - ₱${priceRange.max}`} readOnly onClick={() => setIsPriceDropdownOpen(!isPriceDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none cursor-pointer transition-all text-sm" />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isPriceDropdownOpen && (
                      <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                            <input type="range" min="0" max="5000" step="100" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-gray-700 mt-1">₱{priceRange.min}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                            <input type="range" min="0" max="15000" step="100" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-gray-700 mt-1">₱{priceRange.max}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bedrooms Range */}
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <div className="relative">
                    <input type="text" placeholder={`${bedroomsRange.min} - ${bedroomsRange.max}`} readOnly onClick={() => setIsBedroomsDropdownOpen(!isBedroomsDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none cursor-pointer transition-all text-sm" />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isBedroomsDropdownOpen && (
                      <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Min Bedrooms</label>
                            <input type="range" min="0" max={bedroomsRange.max} step="1" value={bedroomsRange.min} onChange={(e) => setBedroomsRange(prev => ({ ...prev, min: parseInt(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-gray-700 mt-1">{bedroomsRange.min}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Bedrooms</label>
                            <input type="range" min={bedroomsRange.min} max="10" step="1" value={bedroomsRange.max} onChange={(e) => setBedroomsRange(prev => ({ ...prev, max: parseInt(e.target.value) }))} className="w-full" />
                            <div className="text-xs text-gray-700 mt-1">{bedroomsRange.max}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities Filter */}
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amenities
                    {selectedAmenities.length > 0 && <span className="ml-2 text-xs text-[#0B5858]">({selectedAmenities.length})</span>}
                  </label>
                  <div className="relative">
                    <input type="text" placeholder="Select amenities..." value={selectedAmenities.length > 0 ? `${selectedAmenities.length} selected` : ''} readOnly onClick={() => setIsAmenitiesDropdownOpen(!isAmenitiesDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent outline-none cursor-pointer transition-all text-sm" />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isAmenitiesDropdownOpen && (
                      <div className="absolute z-[99999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl p-3 max-h-80 overflow-auto">
                        {availableAmenities.map((amenity) => (
                          <label key={amenity} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedAmenities.includes(amenity)} onChange={() => setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity])} className="w-4 h-4 text-[#0B5858] border-gray-300 rounded focus:ring-[#0B5858] focus:ring-2" />
                            <span className="text-sm text-gray-700">{amenity}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Listings Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-base font-semibold">{listings.length} {listings.length === 1 ? 'result' : 'results'}</span>
              </div>
              
              {/* Sort Dropdown */}
              <div className="relative flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm cursor-pointer focus:outline-none focus:border-[#0B5858] transition-all hover:border-gray-400">
                  <option value="A-Z">A-Z</option>
                  <option value="Price: Low to High">Price: Low to High</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, index) => (<SkeletonCard key={index} />))}
              </div>
            ) : error && listings.length > 0 ? (
              <div className="mb-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">{error}</p>
                </div>
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-500 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-xl font-semibold mb-2">
                    No Listings Found
                  </p>
                  <p className="text-gray-600">
                    Try adjusting your search criteria
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {sortedListings.map((apartment, index) => (
                  <div 
                    key={apartment.id}
                    className="animate-fade-in-up"
                    style={{animationDelay: `${(index * 0.05)}s`, animationDuration: '300ms'}}
                  >
                    <CompactPropertyCard
                      apartment={apartment}
                      onApartmentClick={handleListingClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const ListingsLoading = () => (
  <div className="min-h-screen bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B5858] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listings...</p>
        </div>
      </div>
    </div>
  </div>
);

// Main component with Suspense boundary
const AllListingsPage: React.FC = () => {
  return (
    <Suspense fallback={<ListingsLoading />}>
      <AllListingsContent />
    </Suspense>
  );
};

export default AllListingsPage;
