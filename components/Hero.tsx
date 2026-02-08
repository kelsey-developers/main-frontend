'use client';

import React from 'react';

interface HeroProps {
  searchLocation: string;
  setSearchLocation: (location: string) => void;
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
  onSearch: () => void;
  availableLocations: string[];
  isLocationDropdownOpen: boolean;
  setIsLocationDropdownOpen: (open: boolean) => void;
  isPriceDropdownOpen: boolean;
  setIsPriceDropdownOpen: (open: boolean) => void;
  handleLocationSelect: (location: string) => void;
  handlePriceRangeChange: (field: 'min' | 'max', value: number) => void;
}

const Hero: React.FC<HeroProps> = ({
  searchLocation,
  setSearchLocation,
  priceRange,
  setPriceRange,
  onSearch,
  availableLocations,
  isLocationDropdownOpen,
  setIsLocationDropdownOpen,
  isPriceDropdownOpen,
  setIsPriceDropdownOpen,
  handleLocationSelect,
  handlePriceRangeChange
}) => {
  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/heroimage.png')",
          backgroundPosition: 'center 30%',
          backgroundSize: 'cover',
          height: '60vh'
        }}
      />
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black opacity-20"
        style={{ height: '60vh' }}
      />
      
      {/* Text Overlays */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[60vh] text-center px-4 sm:px-6 lg:px-8">
        {/* Main Heading */}
        <h1 
          className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-4 sm:mb-6 leading-tight mt-16 sm:mt-20 md:mt-24 animate-fade-in-up"
          style={{fontFamily: 'Poppins', fontWeight: 700, animationDelay: '0.3s', animationDuration: '600ms'}}
        >
          Feel at home anytime,<br className="hidden sm:block" /> anywhere!
        </h1>
        
        {/* Sub-heading */}
        <p 
          className="text-white text-base sm:text-lg md:text-xl mb-8 sm:mb-10 md:mb-12 max-w-2xl leading-relaxed animate-fade-in-up px-2"
          style={{fontFamily: 'Poppins', fontWeight: 600, animationDelay: '0.6s', animationDuration: '600ms'}}
        >
          Find your perfect home away from home
          while you&apos;re on your dream vacation
        </p>
      </div>
      
      {/* Search Bar - positioned between hero and white section */}
      <div className="relative z-20 flex justify-center items-center -mt-20 sm:-mt-10 md:-mt-12 px-4 sm:px-6 lg:px-8 animate-slide-up" style={{animationDelay: '1.0s', animationDuration: '600ms'}}>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 w-full max-w-3xl relative overflow-visible">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* Search Location */}
            <div className="flex-1 relative dropdown-container">
              <label className="block text-gray-700 font-poppins font-medium text-base px-0 sm:px-4">
                Search Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Any"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onFocus={() => setIsLocationDropdownOpen(true)}
                  className="w-full px-3 sm:px-4 py-2 border-none focus:outline-none font-poppins font-medium bg-transparent text-gray-700"
                />
                <button
                  onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Location Dropdown */}
              {isLocationDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-full">
                  {availableLocations.length > 0 ? (
                    availableLocations.map((location, index) => (
                      <button
                        key={index}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer"
                        style={{fontFamily: 'Poppins', fontWeight: 400}}
                      >
                        {location}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500" style={{fontFamily: 'Poppins'}}>
                      No locations available
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="flex items-end pb-3 hidden sm:block">
              <span className="text-gray-400 font-poppins text-4xl font-thin" style={{fontWeight: 100}}>|</span>
            </div>
            
            {/* Price Range */}
            <div className="flex-1 relative dropdown-container">
              <label className="block text-gray-700 font-poppins font-medium text-base px-0 sm:px-4">
                Price Range
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsPriceDropdownOpen(!isPriceDropdownOpen)}
                  className="w-full px-3 sm:px-4 py-2 border-none focus:outline-none font-poppins font-medium appearance-none bg-transparent text-gray-700 text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="text-sm sm:text-base">₱{priceRange.min.toLocaleString()} - ₱{priceRange.max.toLocaleString()}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Price Range Dropdown */}
              {isPriceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 sm:right-0 sm:left-auto mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-full sm:w-80 max-w-full sm:max-w-none">
                  <div className="space-y-4">
                    <h3 className="font-semibold" style={{fontFamily: 'Poppins', fontWeight: 600}}>
                      Price Range
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="block text-sm" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                        Min Price: ₱{priceRange.min.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={priceRange.min}
                        onChange={(e) => handlePriceRangeChange('min', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm" style={{fontFamily: 'Poppins', fontWeight: 400}}>
                        Max Price: ₱{priceRange.max.toLocaleString()}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={priceRange.max}
                        onChange={(e) => handlePriceRangeChange('max', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPriceRange({ min: 0, max: 10000 });
                          setIsPriceDropdownOpen(false);
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 cursor-pointer"
                        style={{fontFamily: 'Poppins', fontWeight: 400}}
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsPriceDropdownOpen(false)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                        style={{fontFamily: 'Poppins', fontWeight: 400}}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="flex items-end pb-3 hidden sm:block">
              <span className="text-gray-400 font-poppins text-4xl font-thin" style={{fontWeight: 100}}>|</span>
            </div>
            
            {/* Search Button */}
            <div className="flex-shrink-0 w-full sm:w-auto self-stretch sm:self-auto flex justify-center sm:pr-3 sm:pl-3">
              <button 
                onClick={onSearch}
                className="text-white px-6 sm:px-8 py-3 rounded-lg font-poppins transition-all duration-300 flex items-center justify-center gap-2 hover:opacity-90 hover:scale-105 active:scale-95 w-full sm:w-auto h-full sm:h-auto cursor-pointer" 
                style={{backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 400}}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* White background for bottom section */}
      <div className="bg-white h-0"></div>
    </div>
  );
};

export default Hero;
