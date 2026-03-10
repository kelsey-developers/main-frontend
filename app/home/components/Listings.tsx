'use client';

import React from 'react';
import type { ListingView } from '@/types/listing';
import PropertyCard from '@/components/PropertyCard';

interface ListingsProps {
  apartments: ListingView[];
  isLoading: boolean;
  onApartmentClick: (apartmentId: string) => void;
  error?: string | null;
}

const Listings: React.FC<ListingsProps> = ({
  apartments,
  isLoading,
  onApartmentClick,
  error
}) => {
  // Skeleton component
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse border border-gray-100">
      <div className="h-56 bg-gray-300"></div>
      <div className="p-6">
        <div className="flex justify-between items-baseline mb-4">
          <div className="h-7 bg-gray-300 rounded w-32"></div>
          <div className="h-5 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="h-6 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
        <div className="flex justify-between mb-4">
          <div className="h-4 bg-gray-300 rounded w-16"></div>
          <div className="h-4 bg-gray-300 rounded w-16"></div>
          <div className="h-4 bg-gray-300 rounded w-20"></div>
        </div>
        <div className="flex gap-1 mb-4">
          <div className="h-6 bg-gray-300 rounded-full w-16"></div>
          <div className="h-6 bg-gray-300 rounded-full w-20"></div>
          <div className="h-6 bg-gray-300 rounded-full w-14"></div>
        </div>
        <div className="h-4 bg-gray-300 rounded mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {isLoading ? (
        // Show skeleton loading
        Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))
      ) : error ? (
        // Show error message
        <div className="col-span-full flex flex-col items-center justify-center py-12">
          <div className="text-red-500 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>
              Error Loading Listings
            </p>
            <p className="text-gray-600" style={{fontFamily: 'Poppins'}}>
              {error}
            </p>
          </div>
        </div>
      ) : apartments.length === 0 ? (
        // Show no listings message
        <div className="col-span-full flex flex-col items-center justify-center py-12">
          <div className="text-gray-500 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xl font-semibold mb-2" style={{fontFamily: 'Poppins', fontWeight: 600}}>
              No Available Listings
            </p>
            <p className="text-gray-600" style={{fontFamily: 'Poppins', fontWeight: 400}}>
              There are currently no properties available. Please check back later.
            </p>
          </div>
        </div>
      ) : (
        // Show actual listings
        apartments.map((apartment, index) => (
          <div 
            key={apartment.id}
            className="animate-fade-in-up"
            style={{animationDelay: `${0.5 + (index * 0.1)}s`, animationDuration: '400ms'}}
          >
            <PropertyCard
              apartment={apartment}
              onApartmentClick={onApartmentClick}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default Listings;
