'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { BookingFormData } from '@/types/booking';
import { CalendarService } from '@/services/calendarService';

interface BookingSummarySidebarProps {
  formData: BookingFormData;
  listingId?: string;
}

const parseYMD = (s?: string): Date | null => {
  if (!s) return null;
  const isoLike = s.includes('T') || s.includes(' ');
  if (isoLike) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const parts = s.split('-').map(Number);
  if (parts.length < 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toDateOnly = (d: Date | null) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);

const formatYMD = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const BookingSummarySidebar: React.FC<BookingSummarySidebarProps> = ({ formData, listingId }) => {
  const [pricingRulesCache, setPricingRulesCache] = useState<Map<string, number>>(new Map());

  const basePricePerNight = formData.pricePerNight ?? 2000;
  const extraGuestFeePerPerson = formData.extraGuestFeePerPerson ?? 250;
  const extraGuests = Math.max(0, Math.floor(formData.extraGuests ?? 0));

  const nights = useMemo(() => {
    const start = toDateOnly(parseYMD(formData.checkInDate));
    const end = toDateOnly(parseYMD(formData.checkOutDate));
    if (!start || !end) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.round((end.getTime() - start.getTime()) / msPerDay);
    return Math.max(0, diff);
  }, [formData.checkInDate, formData.checkOutDate]);

  useEffect(() => {
    const loadPricingRules = async () => {
      if (!listingId) {
        setPricingRulesCache(new Map());
        return;
      }
      try {
        const rules = await CalendarService.getPricingRules(listingId);
        const pricingMap = new Map<string, number>();
        rules.forEach((rule) => {
          const start = new Date(rule.start_date);
          const end = new Date(rule.end_date);
          const current = new Date(start);
          while (current <= end) {
            const dateStr = formatYMD(current);
            if (!pricingMap.has(dateStr) || new Date(rule.created_at) > new Date(rules.find((r) => pricingMap.get(dateStr) === r.price)?.created_at || '')) {
              pricingMap.set(dateStr, rule.price);
            }
            current.setDate(current.getDate() + 1);
          }
        });
        setPricingRulesCache(pricingMap);
      } catch {
        setPricingRulesCache(new Map());
      }
    };
    loadPricingRules();
  }, [listingId]);

  const subtotal = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate || nights === 0) return 0;
    const start = toDateOnly(parseYMD(formData.checkInDate));
    const end = toDateOnly(parseYMD(formData.checkOutDate));
    if (!start || !end) return 0;
    let total = 0;
    const current = new Date(start);
    while (current < end) {
      const dateStr = formatYMD(current);
      const specialPrice = pricingRulesCache.get(dateStr);
      const nightPrice = specialPrice ?? basePricePerNight;
      total += nightPrice;
      current.setDate(current.getDate() + 1);
    }
    return total;
  }, [formData.checkInDate, formData.checkOutDate, nights, basePricePerNight, pricingRulesCache]);

  const extraGuestFees = useMemo(() => {
    if (!extraGuests || extraGuests <= 0 || nights <= 0) return 0;
    return extraGuests * extraGuestFeePerPerson * nights;
  }, [extraGuests, extraGuestFeePerPerson, nights]);

  const amenitiesCharge = (formData.additionalServices || []).reduce(
    (acc, s) => acc + (s.quantity || 0) * (s.charge || 0),
    0
  );

  const total = subtotal + extraGuestFees + amenitiesCharge;

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

      {nights > 0 && pricingRulesCache.size > 0 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-amber-600 mb-1">
          <div>Special pricing applied</div>
          <div className="font-semibold" style={{ fontFamily: 'Poppins' }}>
            Yes
          </div>
        </div>
      )}

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
          <div className="font-semibold text-gray-800">{formatCurrency(subtotal)}</div>
        </div>

        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
          <div>Extra guest fees</div>
          <div className="font-semibold text-gray-800">{formatCurrency(extraGuestFees)}</div>
        </div>

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
