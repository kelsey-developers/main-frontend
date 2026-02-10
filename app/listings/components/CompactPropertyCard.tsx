import React from 'react';
import type { ListingView } from '@/types/listing';

interface CompactPropertyCardProps {
  apartment: ListingView;
  onApartmentClick: (apartmentId: string) => void;
}

const CompactPropertyCard: React.FC<CompactPropertyCardProps> = ({ apartment, onApartmentClick }) => {
  return (
    <div 
      onClick={() => onApartmentClick(apartment.id)} 
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative h-40 overflow-hidden">
        <div 
          className="w-full h-full bg-cover bg-center" 
          style={{backgroundImage: `url('${apartment.main_image_url || '/heroimage.png'}')`}}
        ></div>
        
        {/* Property Type Badge */}
        <div className="absolute top-2 right-2">
          <span 
            className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white bg-black/60 backdrop-blur-sm"
          >
            {apartment.property_type?.charAt(0).toUpperCase() + apartment.property_type?.slice(1) || 'Property'}
          </span>
        </div>
        
        {/* Featured Badge */}
        {apartment.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white bg-[#0B5858]">
              Featured
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-semibold text-black mb-1.5 line-clamp-2 min-h-[2.5rem]">
          {apartment.title}
        </h3>
        
        {/* Location */}
        <div className="flex items-center mb-2">
          <svg className="w-3 h-3 text-gray-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <p className="text-xs text-gray-600 truncate font-medium">
            {apartment.location}
          </p>
        </div>
        
        {/* Property Features */}
        <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
          <div className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span className="font-medium">
              {apartment.bedrooms || 0}
            </span>
          </div>
          <div className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span className="font-medium">
              {apartment.bathrooms || 0}
            </span>
          </div>
        </div>
        
        {/* Price */}
        <div className="flex items-baseline">
          <span className="text-base font-bold text-black">
            {apartment.currency} {apartment.price?.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1 font-medium">
            /{apartment.price_unit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompactPropertyCard;
