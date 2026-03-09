'use client';

import React from 'react';
import type { Listing } from '@/types/listing';
import BookingCard from '../RightReviews/BookingCard';
import ReviewPanel from '../RightReviews/ReviewPanel';

interface RightColumnProps {
  listing: Listing | null;
  isLoading: boolean;
  error?: string | null;
  onReserve: () => void;
}

const RightColumn: React.FC<RightColumnProps> = ({
  listing,
  isLoading,
  error,
  onReserve
}) => {
  return (
    <div className="w-full xl:w-96 flex flex-col gap-6">
      <BookingCard
        listing={listing}
        isLoading={isLoading}
        error={error}
        onReserve={onReserve}
      />
      <ReviewPanel
        isLoading={isLoading}
      />
    </div>
  );
};

export default RightColumn;
