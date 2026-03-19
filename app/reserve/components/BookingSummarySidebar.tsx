'use client';

import React, { useMemo } from 'react';
import type { BookingFormData } from '@/types/booking';
import type { Listing } from '@/types/listing';
import { computePriceWithUnitPricing } from '@/lib/utils/unitPricing';

interface BookingSummarySidebarProps {
  formData: BookingFormData;
  listingId?: string;
  listing?: Listing | null;
}

export const BookingSummarySidebar: React.FC<BookingSummarySidebarProps> = ({ formData, listingId, listing }) => {
  const basePricePerNight = formData.pricePerNight ?? 2000;
  const extraGuestFeePerPerson = formData.extraGuestFeePerPerson ?? 250;
  const extraGuests = Math.max(0, Math.floor(formData.extraGuests ?? 0));

  const pricingResult = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate) {
      return {
        baseSubtotal: 0,
        holidayAdjustmentAmount: 0,
        subtotalBeforeDiscount: 0,
        stayLengthDiscountAmount: 0,
        subtotal: 0,
        nights: 0,
        appliedStayLengthDiscount: null,
        appliedHolidayRules: [],
      };
    }
    return computePriceWithUnitPricing(
      basePricePerNight,
      formData.checkInDate,
      formData.checkOutDate,
      listing?.discount_rules,
      listing?.holiday_pricing_rules
    );
  }, [
    formData.checkInDate,
    formData.checkOutDate,
    basePricePerNight,
    listing?.discount_rules,
    listing?.holiday_pricing_rules,
  ]);

  const {
    baseSubtotal,
    holidayAdjustmentAmount,
    subtotalBeforeDiscount,
    stayLengthDiscountAmount,
    nights,
    appliedStayLengthDiscount,
    appliedHolidayRules,
  } = pricingResult;

  const extraGuestFees = useMemo(() => {
    if (!extraGuests || extraGuests <= 0 || nights <= 0) return 0;
    return extraGuests * extraGuestFeePerPerson * nights;
  }, [extraGuests, extraGuestFeePerPerson, nights]);

  const amenitiesCharge = (formData.additionalServices || []).reduce(
    (acc, s) => acc + (s.quantity || 0) * (s.charge || 0),
    0
  );

  const total = subtotalBeforeDiscount + extraGuestFees - stayLengthDiscountAmount + amenitiesCharge;

  const formatCurrency = (v: number) =>
    v.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 });

  return (
    <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
      <h4 className="text-sm font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins' }}>
        Booking Summary
      </h4>

      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
        <div>Base price / night</div>
        <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
          {formatCurrency(basePricePerNight)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
        <div>Nights</div>
        <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
          {nights}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
        <div>Extra guests</div>
        <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
          {extraGuests}
        </div>
      </div>

      <div className="border-t border-[#E6F5F4] mt-2 pt-2">
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
          <div>Subtotal</div>
          <div className="font-semibold text-gray-800">{formatCurrency(baseSubtotal)}</div>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
          <div>Extra guest fees</div>
          <div className="font-semibold text-gray-800">{formatCurrency(extraGuestFees)}</div>
        </div>

        {holidayAdjustmentAmount !== 0 && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
            <div>Holiday {appliedHolidayRules.length > 0 ? `(${appliedHolidayRules.map((r) => r.name).join(', ')})` : ''}</div>
            <div className="font-semibold text-gray-800">
              {holidayAdjustmentAmount > 0 ? '+' : ''}{formatCurrency(holidayAdjustmentAmount)}
            </div>
          </div>
        )}

        {stayLengthDiscountAmount > 0 && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
            <div>Discount {appliedStayLengthDiscount ? `(${appliedStayLengthDiscount.label})` : ''}</div>
            <div className="font-semibold text-gray-800">-{formatCurrency(stayLengthDiscountAmount)}</div>
          </div>
        )}

        {amenitiesCharge > 0 && (
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
            <div>Additional services</div>
            <div className="font-semibold text-gray-800">{formatCurrency(amenitiesCharge)}</div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm font-semibold text-[#0B5858]">
          <div>Total</div>
          <div>{formatCurrency(total)}</div>
        </div>
      </div>

      <div className="mt-3 text-[10px] sm:text-xs text-gray-500">
        <div>• Price shown is an estimate. Final total calculated at checkout.</div>
        <div className="mt-1">• Free cancellation up to 48 hours before check-in.</div>
      </div>
    </div>
  );
};
