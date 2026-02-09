'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Hero from '@/app/home/components/Hero';
import ResultsSection from '@/app/home/components/ResultsSection';
import type { ListingView } from '@/types/listing';
import { getFeaturedListings, getAvailableLocations } from '@/lib/mockData';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [apartments, setApartments] = useState<ListingView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch mock listings
    const fetchListings = async () => {
      try {
        setError(null);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const listings = getFeaturedListings();
        setApartments(listings);
        
        const locations = getAvailableLocations();
        setAvailableLocations(locations);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load listings. Please try again later.');
        setApartments([]);
      } finally {
        // Wait for slower hero animations to complete before showing listings
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    };

    fetchListings();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setIsLocationDropdownOpen(false);
        setIsPriceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleListingClick = (listingId: string) => {
    router.push(`/unit/${listingId}`);
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Search and filter functions - Navigate to all listings page with search params
  const handleSearch = () => {
    // Navigate to all listings page with search parameters
    const params = new URLSearchParams();
    if (searchLocation) params.append('location', searchLocation);
    if (priceRange.min > 0) params.append('minPrice', priceRange.min.toString());
    if (priceRange.max < 10000) params.append('maxPrice', priceRange.max.toString());
    
    router.push(`/listings?${params.toString()}`);
  };  

  const handleLocationSelect = (location: string) => {
    setSearchLocation(location);
    setIsLocationDropdownOpen(false);
  };

  const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    setPriceRange(prev => ({ ...prev, [field]: value }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar />
      
      {/* Hero Section */}
      <Hero
        searchLocation={searchLocation}
        setSearchLocation={setSearchLocation}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        onSearch={handleSearch}
        availableLocations={availableLocations}
        isLocationDropdownOpen={isLocationDropdownOpen}
        setIsLocationDropdownOpen={setIsLocationDropdownOpen}
        isPriceDropdownOpen={isPriceDropdownOpen}
        setIsPriceDropdownOpen={setIsPriceDropdownOpen}
        handleLocationSelect={handleLocationSelect}
        handlePriceRangeChange={handlePriceRangeChange}
      />

      {/* Results Section */}
      <ResultsSection
        apartments={apartments}
        isLoading={isLoading}
        onApartmentClick={handleListingClick}
      />

      <Footer />
    </div>
  );
}

