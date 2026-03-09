'use client';

import React from 'react';
import type { Listing, ListingView } from '@/types/listing';

interface PropertiesInSameAreaProps {
  listings: (Listing | ListingView)[];
  isLoading: boolean;
  onCardClick: (listingId: string) => void;
}

export const PropertyCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden animate-pulse border border-gray-100">
    <div className="h-48 sm:h-56 bg-gray-300"></div>
    <div className="p-4 sm:p-6">
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

const PropertiesInSameArea: React.FC<PropertiesInSameAreaProps> = ({ listings, isLoading, onCardClick }) => {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-2xl font-bold mb-8" style={{fontFamily: 'Poppins', fontWeight: 700}}>
          Properties available in the same area
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-h-[800px] py-16">
            {Array.from({ length: 3 }).map((_, idx) => (
              <PropertyCardSkeleton key={idx} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-xl font-semibold mb-2" style={{fontFamily: 'Poppins', fontWeight: 600}}>
                No Other Properties Available
              </p>
              <p className="text-gray-600" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                There are currently no other properties available in this area.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {listings.map((apartment) => (
              <div 
                key={apartment.id} 
                onClick={() => onCardClick(apartment.id)} 
                className="group bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-3 border border-gray-100 cursor-pointer"
              >
                {/* Image Container with Overlay */}
                <div className="relative h-48 sm:h-56 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center" 
                    style={{backgroundImage: `url('${apartment.main_image_url || './avida.jpg'}')`}}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <span 
                      className="inline-flex px-3 py-1 rounded-full text-xs font-medium text-white bg-black/50 backdrop-blur-sm"
                      style={{fontFamily: 'Poppins'}}
                    >
                      {apartment.property_type?.charAt(0).toUpperCase() + apartment.property_type?.slice(1) || 'Property'}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors">
                      <svg className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xl sm:text-2xl font-bold text-black" style={{fontFamily: 'Poppins', fontWeight: 700}}>
                          {apartment.currency} {apartment.price?.toLocaleString()}
                        </span>
                        <span className="text-gray-500 text-xs sm:text-sm ml-1 sm:ml-2" style={{fontFamily: 'Poppins', fontWeight: 500}}>
                          / {apartment.price_unit}
                        </span>
                      </div>
                      {apartment.is_featured && (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-[#0B5858] bg-[#0B5858]/10" style={{fontFamily: 'Poppins'}}>
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-black mb-2 line-clamp-2" style={{fontFamily: 'Poppins', fontWeight: 600}}>
                    {apartment.title}
                  </h3>
                  <div className="flex items-center mb-4">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-gray-600 truncate" style={{fontFamily: 'Poppins', fontWeight: 500}}>
                      {apartment.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                      <span style={{fontFamily: 'Poppins', fontWeight: 500}}>
                        {apartment.bedrooms || 0} bed
                      </span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <span style={{fontFamily: 'Poppins', fontWeight: 500}}>
                        {apartment.bathrooms || 0} bath
                      </span>
                    </div>
                    {apartment.square_feet && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span style={{fontFamily: 'Poppins', fontWeight: 500}}>
                          {apartment.square_feet} sqft
                        </span>
                      </div>
                    )}
                  </div>
                  {apartment.amenities && apartment.amenities.length > 0 && (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex flex-wrap gap-1">
                        {apartment.amenities.slice(0, 3).map((amenity, index) => (
                          <span 
                            key={index}
                            className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100"
                            style={{fontFamily: 'Poppins'}}
                          >
                            {amenity}
                          </span>
                        ))}
                        {apartment.amenities.length > 3 && (
                          <span 
                            className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-50"
                            style={{fontFamily: 'Poppins'}}
                          >
                            +{apartment.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {apartment.description && (
                    <p className="text-gray-600 text-sm line-clamp-2" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                      {apartment.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PropertiesInSameArea;
