'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { AgentProperty } from '@/types/agent';

interface AgentPropertyCardProps {
  property: AgentProperty;
}

const AgentPropertyCard: React.FC<AgentPropertyCardProps> = ({ property }) => {
  const router = useRouter();

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/unit/${property.id}`);
  };

  const handleCardClick = () => {
    router.push(`/unit/${property.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100 cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url('${property.image}')` }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Heart Icon */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        {/* Price Section */}
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className="text-xl sm:text-2xl font-bold text-black" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
              {property.currency} {property.price.toLocaleString()}
            </span>
            <span className="text-gray-500 text-xs sm:text-sm ml-1 sm:ml-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
              / {property.priceUnit}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-black mb-2 line-clamp-2" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center mb-4">
          <svg className="w-4 h-4 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-600 truncate" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
            {property.location}
          </p>
        </div>

        {/* Property Features - Bed, Bath, Sqft */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
            <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
              {property.bedrooms} bed
            </span>
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
              {property.bathrooms} bath
            </span>
          </div>
          {property.squareFeet && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                {property.squareFeet} sqft
              </span>
            </div>
          )}
        </div>

        {/* Amenities Preview */}
        {property.features && property.features.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-wrap gap-1">
              {property.features.slice(0, 3).map((feature) => (
                <span
                  key={feature}
                  className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100"
                  style={{ fontFamily: 'Poppins' }}
                >
                  {feature}
                </span>
              ))}
              {property.features.length > 3 && (
                <span
                  className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-50"
                  style={{ fontFamily: 'Poppins' }}
                >
                  +{property.features.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Book Now Button */}
        <button
          onClick={handleBookNow}
          className="w-full py-3 px-4 bg-[#0B5858] hover:bg-[#094848] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          style={{ fontFamily: 'Poppins', fontWeight: 600 }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default AgentPropertyCard;
