'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BookingForm from './BookingForm';
import { getUnitById } from '@/lib/api/units';
import type { Listing } from '@/types/listing';

export default function BookingTemporaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const listingId = searchParams.get('listingId') || searchParams.get('id') || '';
  const requirePayment = searchParams.get('requirePayment') !== 'false';

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingsReady, setBookingsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!listingId) {
        if (mounted) {
          setError('No listing selected for booking.');
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const unit = await getUnitById(listingId);
        if (!mounted) return;

        if (!unit) {
          setError('Selected listing was not found.');
          setListing(null);
          return;
        }

        setListing(unit);
      } catch {
        if (mounted) {
          setError('Unable to load listing details. Please try again.');
          setListing(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      mounted = false;
    };
  }, [listingId]);

  const baseGuests = useMemo(() => {
    if (!listing) return 2;
    return Math.max(1, listing.bedrooms + 1);
  }, [listing]);

  const handleCancel = () => {
    if (listingId) {
      router.push(`/unit/${listingId}`);
      return;
    }

    router.push('/listings');
  };

  const showOverlay = isLoading || (!error && listing && !bookingsReady);

  if (!isLoading && (!listingId || error || !listing)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
            Booking Unavailable
          </h1>
          <p className="text-sm text-gray-600 mt-2" style={{ fontFamily: 'Poppins' }}>
            {error || 'Please choose a listing first.'}
          </p>
          <button
            onClick={handleCancel}
            className="mt-5 px-4 py-2 bg-[#0B5858] text-white rounded-md hover:bg-[#0a4a4a]"
            style={{ fontFamily: 'Poppins' }}
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full bg-[#0B5858] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {listing && (
        <BookingForm
          listingId={listingId}
          listing={listing}
          pricePerNight={listing.price}
          priceUnit={listing.price_unit}
          baseGuests={baseGuests}
          extraGuestFeePerPerson={250}
          requirePayment={requirePayment}
          onCancel={handleCancel}
          onBookingsReady={() => setBookingsReady(true)}
          onComplete={() => {
            // Confirmation step handles final redirect after successful save.
          }}
        />
      )}
    </div>
  );
}
