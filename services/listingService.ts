import { getUnitById } from '@/lib/api/units';
import type { Listing } from '@/types/listing';

export const ListingService = {
  async getListingById(listingId: string): Promise<Listing | null> {
    if (!listingId) return null;

    try {
      return await getUnitById(listingId);
    } catch {
      return null;
    }
  },
};
