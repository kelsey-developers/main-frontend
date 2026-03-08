'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { Listing } from '@/types/listing';
import LeftColumn from './components/LeftColumn';
import RightColumn from './components/RightColumn';
import TabsSection from './components/TabsSection';
import PropertiesInSameArea from './components/PropertiesInSameArea';
import ShareModal from './components/ShareModal';
import { getListingById, getListingsByCity } from '@/lib/mockData';

function UnitViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '1'; // Default to property 1
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [sameAreaListings, setSameAreaListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    const fetchListingData = async () => {
      if (!id) {
        setIsLoading(false);
        setError('No property ID provided');
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get listing from mock data
        const listingData = getListingById(id);
        
        if (!listingData) {
          setError('Listing not found');
          return;
        }
        
        setListing(listingData);
        
        // Get listings in the same area (mock)
        if (listingData.city) {
          const areaListings = getListingsByCity(listingData.city, id);
          setSameAreaListings(areaListings);
        }
      } catch (err) {
        console.error('Error fetching listing data:', err);
        setError('Failed to load listing details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingData();
    window.scrollTo(0, 0);
  }, [id]);

  const handleReserve = () => {
    // Simple booking form state toggle
    setShowBookingForm(true);
    alert('Booking functionality would be implemented here. In the full version, this would open a booking form.');
  };

  const handleCancelBooking = () => {
    setShowBookingForm(false);
  };

  const handleSameAreaListingClick = (listingId: string) => {
    router.push(`/unit-view?id=${listingId}`);
    window.scrollTo(0, 0);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/unit-view?id=${id}`;
    const shareText = `Check out this property: ${listing?.title || 'Amazing Property'}`;
    
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setIsLinkCopied(true);
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 2000);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = `${shareText}\n${shareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsLinkCopied(true);
      setTimeout(() => {
        setIsLinkCopied(false);
      }, 2000);
    }
  };

  const handleFacebookShare = () => {
    const shareUrl = `${window.location.origin}/unit-view?id=${id}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  const handleTwitterShare = () => {
    const shareUrl = `${window.location.origin}/unit-view?id=${id}`;
    const shareText = `Check out this property: ${listing?.title || 'Amazing Property'}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  const handleWhatsAppShare = () => {
    const shareUrl = `${window.location.origin}/unit-view?id=${id}`;
    const shareText = `Check out this property: ${listing?.title || 'Amazing Property'}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareModal(false);
  };

  const handleEmailShare = () => {
    const shareUrl = `${window.location.origin}/unit-view?id=${id}`;
    const shareText = `Check out this property: ${listing?.title || 'Amazing Property'}`;
    const subject = `Property Listing: ${listing?.title || 'Amazing Property'}`;
    const body = `${shareText}\n\nView the property here: ${shareUrl}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = emailUrl;
    setShowShareModal(false);
  };

  const handleImageClick = (index: number) => {
    console.log('Image clicked:', index);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Navbar />
        <div className="h-16" />
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col xl:flex-row gap-8">
              <LeftColumn 
                listing={listing} 
                error={error} 
                onImageClick={handleImageClick}
                onShareClick={() => setShowShareModal(true)}
                isLoading={isLoading}
              />
              <RightColumn 
                listing={listing} 
                isLoading={isLoading} 
                error={error} 
                onReserve={handleReserve} 
              />
            </div>
          </div>
        </section>
        <PropertiesInSameArea
          listings={[]}
          isLoading={true}
          onCardClick={() => {}}
        />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Navbar />
        <div className="h-16" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-lg font-semibold mb-2" style={{fontFamily: 'Poppins'}}>
              {error || 'Listing not found'}
            </p>
            <button 
              onClick={() => router.push('/')}
              className="text-teal-700 hover:underline"
              style={{fontFamily: 'Poppins'}}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <div className="h-16" />

      <ShareModal
        show={showShareModal}
        onClose={() => setShowShareModal(false)}
        onCopyLink={handleCopyLink}
        isLinkCopied={isLinkCopied}
        shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/unit-view?id=${id}`}
        onFacebookShare={handleFacebookShare}
        onTwitterShare={handleTwitterShare}
        onWhatsAppShare={handleWhatsAppShare}
        onEmailShare={handleEmailShare}
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col xl:flex-row gap-8">
            <div className="flex-1">
              <LeftColumn 
                listing={listing} 
                error={error} 
                onImageClick={handleImageClick}
                onShareClick={() => setShowShareModal(true)} 
                isLoading={isLoading}
              />
            </div>
            <div className="w-full xl:w-96">
              <RightColumn 
                listing={listing} 
                isLoading={isLoading} 
                error={error} 
                onReserve={handleReserve} 
              />
              <div className="block xl:hidden mt-6">
                <TabsSection 
                  listing={listing} 
                  isLoading={isLoading} 
                  className="block xl:hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PropertiesInSameArea
        listings={sameAreaListings}
        isLoading={isLoading}
        onCardClick={handleSameAreaListingClick}
      />

      <Footer />
    </div>
  );
}

function UnitViewFallback() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <div className="h-16" />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col xl:flex-row gap-8 animate-pulse">
            <div className="flex-1 h-96 bg-gray-200 rounded" />
            <div className="w-full xl:w-96 h-96 bg-gray-200 rounded" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function UnitViewPage() {
  return (
    <Suspense fallback={<UnitViewFallback />}>
      <UnitViewContent />
    </Suspense>
  );
}
