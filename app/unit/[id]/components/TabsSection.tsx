'use client';

import React, { useState } from 'react';
import type { Listing } from '@/types/listing';

interface TabsSectionProps {
  listing: Listing | null;
  className?: string;
  isLoading: boolean;
}

const TabsSection: React.FC<TabsSectionProps> = ({ listing, isLoading, className = '' }) => {
  const [activeTab, setActiveTab] = useState<'amenities' | 'management' | 'location'>('amenities');

  const amenities = listing?.amenities || [];
  const latitude = listing?.latitude;
  const longitude = listing?.longitude;
  const isClient = typeof window !== 'undefined';
  const hasCoords = latitude != null && longitude != null;

  if (isLoading) {
    return (
      <div className={className} style={{ display: 'block' }}>
        <div className="mt-10">
          <div className="animate-pulse inline-grid grid-flow-col auto-cols-auto items-center gap-x-4 md:gap-x-6">
            <div className="flex items-center">
              <div className="h-6 w-24 bg-gray-300 rounded mr-5"></div>
              <div className="h-6 w-24 bg-gray-300 rounded mr-5"></div>
              <div className="h-6 w-24 bg-gray-300 rounded mr-5"></div>
            </div>
          </div>
        </div>
        <div className="border-b border-black mt-2" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mt-10">
        <div className="inline-grid grid-flow-col auto-cols-auto items-center gap-x-4 md:gap-x-6">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('amenities')}
              className={`text-sm md:text-lg transition-colors cursor-pointer ${activeTab === 'amenities' ? 'text-teal-700' : 'text-black'}`}
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              aria-controls="amenities-grid"
              aria-pressed={activeTab === 'amenities'}
            >
              Amenities
            </button>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`text-sm md:text-lg transition-colors cursor-pointer ${activeTab === 'management' ? 'text-teal-700' : 'text-black'}`}
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              aria-controls="management-section"
              aria-pressed={activeTab === 'management'}
            >
              Management
            </button>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`text-sm md:text-lg transition-colors cursor-pointer ${activeTab === 'location' ? 'text-teal-700' : 'text-black'}`}
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
              aria-controls="MapSection"
              aria-pressed={activeTab === 'location'}
            >
              Location
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-black mt-2" />

      {activeTab === 'amenities' && amenities && amenities.length > 0 && (
        <div id="amenities-grid" className="mt-4 max-h-92 md:max-h-none overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {amenities.map((amenity, i) => (
              <div key={i} className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                {amenity}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'management' && (
        <div id="management-section" className="mt-4">
          <p className="text-gray-500 mt-2">Management details not provided.</p>
        </div>
      )}

      {activeTab === 'location' && (
        <div id="MapSection" className="mt-4">
          <div className="w-full h-84.5 md:h-84.5 border border-gray-200 rounded-lg overflow-hidden relative z-0 mt-2">
            {isClient && hasCoords ? (
              <iframe
                title="Property location map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(`${listing?.latitude},${listing?.longitude}`)}&output=embed`}
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p className="text-sm" style={{fontFamily: 'Poppins'}}>Location not available</p>
              </div>
            )}
          </div>

          {listing?.latitude && listing?.longitude && (
            <div className="mt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${listing?.latitude},${listing?.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 transition-colors"
                style={{fontFamily: 'Poppins', fontWeight: 600}}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View in Google Maps
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TabsSection;
