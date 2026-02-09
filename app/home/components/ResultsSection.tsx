'use client';

import React from 'react';
import Link from 'next/link';
import type { ListingView } from '@/types/listing';
import Listings from './Listings';

interface ResultsSectionProps {
  apartments: ListingView[];
  isLoading: boolean;
  onApartmentClick: (apartmentId: string) => void;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  apartments,
  isLoading,
  onApartmentClick
}) => {
  return (
    <div className="bg-white py-1 -mt-48 sm:-mt-52 md:-mt-56 animate-fade-in" style={{animationDelay: '1.6s', animationDuration: '400ms'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-6 md:pt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <h2 
            className="text-2xl sm:text-3xl font-bold text-black animate-fade-in-left"
            style={{fontFamily: 'Poppins', fontWeight: 700, animationDelay: '1.8s', animationDuration: '400ms'}}
          >
            Featured listings
          </h2>
        </div>

        {/* Listings Grid */}
        <Listings
          apartments={apartments}
          isLoading={isLoading}
          onApartmentClick={onApartmentClick}
          error={null}
        />

        {/* See More Section */}
        <div className="flex items-center justify-center mt-8 sm:mt-12 mb-12 sm:mb-16">
          <Link 
            href="/listings"
            className="group relative inline-flex items-center gap-2 px-8 py-3 text-[#0B5858] font-medium border-2 border-[#0B5858] rounded-lg hover:bg-[#0B5858] hover:text-white transition-all duration-300 overflow-hidden"
            style={{fontFamily: 'Poppins', fontWeight: 600}}
          >
            <span className="relative z-10">View All Listings</span>
            <svg 
              className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="absolute inset-0 bg-[#0B5858] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;
