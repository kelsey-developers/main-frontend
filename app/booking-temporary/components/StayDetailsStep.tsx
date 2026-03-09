import React, { useEffect, useMemo, useState } from 'react';
import type { BookingFormData, BookingAvailability } from '@/types/booking';
import type { Listing } from '@/types/listing';
import { BookingService } from '@/services/bookingService';
import { CalendarService } from '@/services/calendarService';

interface StayDetailsStepProps {
  formData: BookingFormData;
  listingId?: string;
  listing?: Listing | null;
  onUpdate: (data: Partial<BookingFormData>) => void;
  onNext: () => void;
  onCancel: () => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const StayDetailsStep: React.FC<StayDetailsStepProps> = ({ formData, listingId, listing, onUpdate, onNext, onCancel }) => {
  const parseYMD = (s?: string): Date | null => {
    if (!s) return null;
    // Handle ISO strings that may include a time (e.g., "2025-11-06T00:00:00Z")
    const isoLike = s.includes('T') || s.includes(' ');
    if (isoLike) {
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    // Fall back to YYYY-MM-DD parsing (some APIs return just the date portion)
    const parts = s.split('-').map(Number);
    if (parts.length < 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const formatYMD = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const toDateOnly = (d: Date | null) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);

  const now = new Date();
  const cutoffHour = 18;
  const leadDays = now.getHours() >= cutoffHour ? 2 : 1;
  const minAllowedDate = toDateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate() + leadDays));

  const [showLeadNotice, setShowLeadNotice] = useState<boolean>(true);
  const [existingBookings, setExistingBookings] = useState<BookingAvailability[]>([]);
  const [isDateRangeBlocked, setIsDateRangeBlocked] = useState<boolean>(false);
  const [blockedDateError, setBlockedDateError] = useState<string>('');

  const initialStart = toDateOnly(parseYMD(formData.checkInDate));
  const initialEnd = toDateOnly(parseYMD(formData.checkOutDate));
  const [selectedDates, setSelectedDates] = useState<{ start: Date | null; end: Date | null }>({
    start: initialStart,
    end: initialEnd
  });

  const initialDate = selectedDates.start ?? minAllowedDate ?? toDateOnly(new Date()) ?? new Date();
  const [calendarMonth, setCalendarMonth] = useState<number>(initialDate.getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(initialDate.getFullYear());

  const [isDateModalOpen, setDateModalOpen] = useState(false);
  const [dateModalField, setDateModalField] = useState<'checkIn' | 'checkOut' | null>(null);

  /**
   * Convert HH:mm format (24-hour) to 12-hour format with AM/PM
   * @param time24 - Time in HH:mm format (e.g., "14:00")
   * @returns Formatted time string (e.g., "2:00 PM")
   */
  const formatTime12Hour = (time24?: string): string => {
    if (!time24) return 'Not set';
    const [hours, minutes] = time24.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 'Not set';
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    const mm = String(minutes).padStart(2, '0');
    return `${hour12}:${mm} ${period}`;
  };

  // Get default times from listing
  const defaultCheckInTime = listing?.check_in_time || '14:00';
  const defaultCheckOutTime = listing?.check_out_time || '12:00';

  // Automatically set times from listing when dates are selected
  useEffect(() => {
    if (formData.checkInDate && !formData.checkInTime) {
      onUpdate({ checkInTime: defaultCheckInTime });
    }
    if (formData.checkOutDate && !formData.checkOutTime) {
      onUpdate({ checkOutTime: defaultCheckOutTime });
    }
  }, [formData.checkInDate, formData.checkOutDate, defaultCheckInTime, defaultCheckOutTime, onUpdate]);

  // Fetch existing bookings and poll periodically so the calendar stays in sync
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchBookings = async () => {
      if (!listingId) {
        if (mounted) setExistingBookings([]);
        return;
      }
      try {
        const bookings = await BookingService.getBookingsForListing(listingId);
        if (mounted) setExistingBookings(bookings || []);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        if (mounted) setExistingBookings([]);
      }
    };

    // initial fetch
    fetchBookings();

    // poll every 15 seconds to stay in sync with other bookings
    timer = setInterval(fetchBookings, 15000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [listingId]);

  // Check if selected date range is blocked
  useEffect(() => {
    const checkBlockedDates = async () => {
      if (!listingId || !formData.checkInDate || !formData.checkOutDate) {
        setIsDateRangeBlocked(false);
        setBlockedDateError('');
        return;
      }

      try {
        const isBlocked = await CalendarService.isDateRangeBlocked(
          listingId,
          formData.checkInDate,
          formData.checkOutDate
        );
        
        setIsDateRangeBlocked(isBlocked);
        if (isBlocked) {
          setBlockedDateError('Selected dates include blocked dates. Please choose different dates.');
        } else {
          setBlockedDateError('');
        }
      } catch (error) {
        console.error('Error checking blocked dates:', error);
        setIsDateRangeBlocked(false);
        setBlockedDateError('');
      }
    };

    checkBlockedDates();
  }, [listingId, formData.checkInDate, formData.checkOutDate]);

  useEffect(() => {
    const start = toDateOnly(parseYMD(formData.checkInDate));
    const end = toDateOnly(parseYMD(formData.checkOutDate));

    if (start && minAllowedDate && start.getTime() < minAllowedDate.getTime()) {
      onUpdate({ checkInDate: '' });
      setSelectedDates(prev => ({ ...prev, start: null }));
    }

    if (end && minAllowedDate && end.getTime() < minAllowedDate.getTime()) {
      onUpdate({ checkOutDate: '' });
      setSelectedDates(prev => ({ ...prev, end: null }));
    }

    if (start && end && end.getTime() <= start.getTime()) {
      onUpdate({ checkOutDate: '' });
      setSelectedDates(prev => ({ ...prev, end: null }));
    }

    setSelectedDates({ start, end });
  }, [formData.checkInDate, formData.checkOutDate, minAllowedDate, onUpdate]);


  const baseGuests: number = (formData as any).baseGuests ?? 2;
  const handleGuestChange = (field: 'numberOfGuests' | 'extraGuests', value: number) => {
    if (field === 'numberOfGuests') {
      const clamped = Math.min(Math.max(1, Math.floor(value)), baseGuests);
      onUpdate({ numberOfGuests: clamped });
    } else {
      const clamped = Math.max(0, Math.floor(value));
      onUpdate({ extraGuests: clamped });
    }
  };
  const incrementGuest = (field: 'numberOfGuests' | 'extraGuests') => {
    if (field === 'numberOfGuests') {
      const curr = formData.numberOfGuests ?? 1;
      if (curr >= baseGuests) return;
      handleGuestChange('numberOfGuests', curr + 1);
    } else {
      const currPrimary = formData.numberOfGuests ?? 1;
      if (currPrimary < baseGuests) {
        handleGuestChange('numberOfGuests', currPrimary + 1);
      } else {
        handleGuestChange('extraGuests', (formData.extraGuests ?? 0) + 1);
      }
    }
  };
  const decrementGuest = (field: 'numberOfGuests' | 'extraGuests') => {
    if (field === 'numberOfGuests') {
      const curr = formData.numberOfGuests ?? 1;
      handleGuestChange('numberOfGuests', curr - 1);
    } else {
      handleGuestChange('extraGuests', Math.max(0, (formData.extraGuests ?? 0) - 1));
    }
  };

  const isFormValid = () =>
    !!(
      formData.checkInDate &&
      formData.checkOutDate &&
      (formData.numberOfGuests ?? 0) > 0 &&
      !isDateRangeBlocked &&
      !blockedDateError
    );

  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1);
  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);

  const isDateBooked = (date: Date): boolean => {
    if (!existingBookings.length) return false;
    const checkDate = toDateOnly(date);
    if (!checkDate) return false;
    const parseTimeToMinutes = (t?: string | null) => {
      if (!t) return null;
      const parts = t.split(':').map(Number);
      if (parts.length < 2) return null;
      const [hh, mm] = parts;
      if (isNaN(hh) || isNaN(mm)) return null;
      return hh * 60 + mm;
    };

    return existingBookings.some((booking) => {
      const bookingStart = toDateOnly(parseYMD(booking.check_in_date));
      const bookingEnd = toDateOnly(parseYMD(booking.check_out_date));
      if (!bookingStart || !bookingEnd) return false;

      // If the date falls strictly within the booking (start <= date < end) it's booked
      if (checkDate.getTime() >= bookingStart.getTime() && checkDate.getTime() < bookingEnd.getTime()) return true;

      // If the date is exactly the previous booking's checkout date (bookingEnd), allow check-in
      // only when the host's check-in time is later than (or equal to) the host's check-out time.
      if (checkDate.getTime() === bookingEnd.getTime()) {
        const hostCheckIn = listing?.check_in_time ?? defaultCheckInTime;
        const hostCheckOut = listing?.check_out_time ?? defaultCheckOutTime;
        const inMin = parseTimeToMinutes(hostCheckIn);
        const outMin = parseTimeToMinutes(hostCheckOut);
        // If we can't parse times, be conservative and treat as booked
        if (inMin == null || outMin == null) return true;
        // If host allows check-in after the previous checkout time, then this date is NOT booked
        return !(inMin >= outMin);
      }

      return false;
    });
  };

  /**
   * Check if a date is blocked (from calendar settings)
   * This is a synchronous check using a cached list would be better, but for now we'll use async
   */
  const [blockedDatesCache, setBlockedDatesCache] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const loadBlockedDates = async () => {
      if (!listingId) {
        setBlockedDatesCache(new Set());
        return;
      }
      
      try {
        // Load both listing-specific and global blocked dates
        const [listingBlockedRanges, globalBlockedRanges] = await Promise.all([
          CalendarService.getBlockedRanges(listingId),
          CalendarService.getBlockedRanges('global')
        ]);
        
        const blockedSet = new Set<string>();
        
        // Add listing-specific blocked dates
        listingBlockedRanges.forEach(range => {
          const start = new Date(range.start_date);
          const end = new Date(range.end_date);
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = formatYMD(current);
            blockedSet.add(dateStr);
            current.setDate(current.getDate() + 1);
          }
        });
        
        // Add global blocked dates (apply to all listings)
        globalBlockedRanges.forEach(range => {
          const start = new Date(range.start_date);
          const end = new Date(range.end_date);
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = formatYMD(current);
            blockedSet.add(dateStr);
            current.setDate(current.getDate() + 1);
          }
        });
        
        setBlockedDatesCache(blockedSet);
      } catch (error) {
        console.error('Error loading blocked dates:', error);
        setBlockedDatesCache(new Set());
      }
    };
    
    loadBlockedDates();
  }, [listingId]);

  const isDateBlocked = (date: Date): boolean => {
    const dateStr = formatYMD(date);
    return blockedDatesCache.has(dateStr);
  };

  const generateCalendarDays = () => {
    const first = firstDayOfMonth(calendarYear, calendarMonth);
    const last = lastDayOfMonth(calendarYear, calendarMonth);
    const daysInMonth = last.getDate();
    const startingDayOfWeek = (first.getDay() + 6) % 7;

    const days: Array<
      | null
      | {
          day: number;
          date: Date;
          isSelected: boolean;
          isStart: boolean;
          isEnd: boolean;
          isDisabled: boolean;
          isBooked: boolean;
          isBlocked: boolean;
        }
    > = [];

    const startOnly = selectedDates.start ? toDateOnly(selectedDates.start) : null;
    const endOnly = selectedDates.end ? toDateOnly(selectedDates.end) : null;

    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      const isBeforeMinDate = minAllowedDate ? date.getTime() < minAllowedDate.getTime() : false;
      const isBooked = isDateBooked(date);
      const isBlocked = isDateBlocked(date);
      const isDisabled = isBeforeMinDate || isBooked || isBlocked;
      const isSelected = !!(startOnly && endOnly && date >= startOnly && date <= endOnly);
      const isStart = !!(startOnly && date.getTime() === startOnly.getTime());
      const isEnd = !!(endOnly && date.getTime() === endOnly.getTime());
      days.push({ day: d, date, isSelected, isStart, isEnd, isDisabled, isBooked, isBlocked });
    }

    while (days.length % 7 !== 0) days.push(null);

    return days;
  };

  const days = useMemo(() => generateCalendarDays(), [
    calendarMonth,
    calendarYear,
    selectedDates.start,
    selectedDates.end,
    minAllowedDate,
    existingBookings.length,
    blockedDatesCache.size,
    defaultCheckInTime,
    defaultCheckOutTime
  ]);

  const onCalendarClick = (dayData: { day: number; date: Date; isDisabled?: boolean } | null) => {
    if (!dayData || dayData.isDisabled) return;
    const clickedDate = toDateOnly(dayData.date)!;
    const dateStr = formatYMD(clickedDate);

    const start = selectedDates.start ? toDateOnly(selectedDates.start) : null;
    const end = selectedDates.end ? toDateOnly(selectedDates.end) : null;

    if (!start || (start && end)) {
      setSelectedDates({ start: clickedDate, end: null });
      onUpdate({ checkInDate: dateStr });
      onUpdate({ checkOutDate: '' });
    } else if (start && !end) {
      if (clickedDate.getTime() > start.getTime()) {
        setSelectedDates(prev => ({ ...prev, end: clickedDate }));
        onUpdate({ checkOutDate: dateStr });
      } else {
        setSelectedDates({ start: clickedDate, end: null });
        onUpdate({ checkInDate: dateStr });
        onUpdate({ checkOutDate: '' });
      }
    }
  };

  const onModalCalendarClick = (dayData: { day: number; date: Date; isDisabled?: boolean } | null) => {
    if (!dayData || dayData.isDisabled || !dateModalField) return;
    const clickedDate = toDateOnly(dayData.date)!;
    const dateStr = formatYMD(clickedDate);

    if (dateModalField === 'checkIn') {
      onUpdate({ checkInDate: dateStr });
      setSelectedDates(prev => ({ ...prev, start: clickedDate }));
      const currentEnd = toDateOnly(parseYMD(formData.checkOutDate));
      if (currentEnd && currentEnd.getTime() <= clickedDate.getTime()) {
        onUpdate({ checkOutDate: '' });
        setSelectedDates(prev => ({ ...prev, end: null }));
      }
    } else {
      const currentStart = toDateOnly(parseYMD(formData.checkInDate));
      if (currentStart && clickedDate.getTime() <= currentStart.getTime()) {
        return;
      }
      onUpdate({ checkOutDate: dateStr });
      setSelectedDates(prev => ({ ...prev, end: clickedDate }));
    }

    setDateModalOpen(false);
    setDateModalField(null);
  };

  const prevMonth = () => {
    const m = calendarMonth - 1;
    if (m < 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(m);
    }
  };
  const nextMonth = () => {
    const m = calendarMonth + 1;
    if (m > 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(m);
    }
  };

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

  // Calculate subtotal using special pricing per night
  const [pricingRulesCache, setPricingRulesCache] = useState<Map<string, number>>(new Map());
  
  useEffect(() => {
    const loadPricingRules = async () => {
      if (!listingId) {
        setPricingRulesCache(new Map());
        return;
      }
      
      try {
        const rules = await CalendarService.getPricingRules(listingId);
        const pricingMap = new Map<string, number>();
        
        rules.forEach(rule => {
          const start = new Date(rule.start_date);
          const end = new Date(rule.end_date);
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = formatYMD(current);
            // Use the most recent rule if multiple rules apply to the same date
            if (!pricingMap.has(dateStr) || new Date(rule.created_at) > new Date(rules.find(r => pricingMap.get(dateStr) === r.price)?.created_at || '')) {
              pricingMap.set(dateStr, rule.price);
            }
            current.setDate(current.getDate() + 1);
          }
        });
        
        setPricingRulesCache(pricingMap);
      } catch (error) {
        console.error('Error loading pricing rules:', error);
        setPricingRulesCache(new Map());
      }
    };
    
    loadPricingRules();
  }, [listingId]);

  // Calculate subtotal using special pricing per night
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
  const total = useMemo(() => subtotal + extraGuestFees, [subtotal, extraGuestFees]);

  const formattedRange =
    selectedDates.start && selectedDates.end
      ? `${selectedDates.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedDates.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : null;

  const currentPrimaryGuests = formData.numberOfGuests ?? 1;
  const reachedPrimaryMax = currentPrimaryGuests >= baseGuests;

  const formatCurrency = (v: number) =>
    v.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 });

  useEffect(() => {
    if (isDateModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDateModalOpen]);

  const displayDateLabel = (d?: string) => {
    if (!d) return 'Select date';
    const parsed = parseYMD(d);
    if (!parsed) return 'Select date';
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg sm:text-2xl font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
            Stay Details
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
            Please fill in your stay details to continue
          </p>
        </div>

        {showLeadNotice && (
          <div className="mb-3">
            <div className="flex items-start justify-between bg-[#FEF9E6] border border-[#F5EECF] rounded-md px-3 py-2">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-[#A67C00] mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M8.257 3.099c.366-.89 1.603-.89 1.97 0l.908 2.204a1 1 0 00.95.69h2.32c.969 0 1.371 1.24.588 1.81l-1.88 1.364a1 1 0 00-.364 1.118l.718 2.204c.366.89-.755 1.63-1.54 1.06L10 12.347l-1.617 1.202c-.784.57-1.906-.17-1.54-1.06l.718-2.204a1 1 0 00-.364-1.118L5.317 7.803c-.783-.57-.38-1.81.588-1.81h2.32a1 1 0 00.95-.69l.082-.204z" />
                </svg>
                <div className="text-xs sm:text-sm text-[#664E00]" style={{ fontFamily: 'Poppins' }}>
                  Bookings must be made at least <span className="font-semibold">{leadDays} day{leadDays > 1 ? 's' : ''}</span> in advance (based on current local time).
                </div>
              </div>
              <button
                onClick={() => setShowLeadNotice(false)}
                aria-label="Dismiss lead time notice"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {blockedDateError && (
          <div className="mb-3">
            <div className="flex items-start justify-between bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-xs sm:text-sm text-red-800" style={{ fontFamily: 'Poppins' }}>
                  {blockedDateError}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
              <div className="flex items-center gap-0 mb-2 justify-start pl-0">
                <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>Stay Duration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs sm:text-sm text-gray-600 mb-2 block" style={{ fontFamily: 'Poppins' }}>
                    Check-in <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDateModalField('checkIn'); setDateModalOpen(true); setCalendarMonth(initialDate.getMonth()); setCalendarYear(initialDate.getFullYear()); }}
                      className="flex-1 border border-[#E6F5F4] rounded-md px-3 py-2 flex items-center justify-between bg-[#F8FFFE]"
                      aria-haspopup="dialog"
                      aria-expanded={isDateModalOpen && dateModalField === 'checkIn'}
                      aria-label="Open date picker for check in"
                    >
                      <div className="text-left flex-1">
                        <div className="text-[11px] sm:text-sm text-gray-600">Check-in Date</div>
                        <div className="font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                          {formData.checkInDate ? displayDateLabel(formData.checkInDate) : 'Select date'}
                        </div>
                      </div>
                    </button>
                  </div>
                  {/* Default check-in time display */}
                  {listing?.check_in_time && (
                    <div className="mt-2 text-xs text-gray-600" style={{ fontFamily: 'Poppins' }}>
                      Check-in time: <span className="font-semibold text-gray-800">{formatTime12Hour(listing.check_in_time)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-gray-600 mb-2 block" style={{ fontFamily: 'Poppins' }}>
                    Check-out <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDateModalField('checkOut'); setDateModalOpen(true); setCalendarMonth(initialDate.getMonth()); setCalendarYear(initialDate.getFullYear()); }}
                      className="flex-1 border border-[#E6F5F4] rounded-md px-3 py-2 flex items-center justify-between bg-[#F8FFFE]"
                      aria-haspopup="dialog"
                      aria-expanded={isDateModalOpen && dateModalField === 'checkOut'}
                      aria-label="Open date picker for check out"
                    >
                      <div className="text-left flex-1">
                        <div className="text-[11px] sm:text-sm text-gray-600">Check-out Date</div>
                        <div className="font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                          {formData.checkOutDate ? displayDateLabel(formData.checkOutDate) : 'Select date'}
                        </div>
                      </div>
                    </button>
                  </div>
                  {/* Default check-out time display */}
                  {listing?.check_out_time && (
                    <div className="mt-2 text-xs text-gray-600" style={{ fontFamily: 'Poppins' }}>
                      Check-out time: <span className="font-semibold text-gray-800">{formatTime12Hour(listing.check_out_time)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
              <div className="flex items-center gap-0 mb-2 justify-start pl-0">
                <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>Guests</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="text-xs sm:text-sm text-gray-600 mb-3 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
                    <span>Number of Guests</span>
                    <span className="relative inline-block group">
                      <button
                        type="button"
                        aria-describedby="primary-guests-tooltip"
                        className="w-5 h-5 rounded-full border border-[#E6F5F4] bg-white text-[#0B5858] text-xs flex items-center justify-center"
                        aria-label="Primary guests info"
                      >
                        ?
                      </button>
                      <div
                        role="tooltip"
                        id="primary-guests-tooltip"
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-10 z-10 hidden group-hover:block group-focus:block w-56 bg-white border border-[#E6F5F4] rounded-md px-3 py-2 text-xs text-gray-700 shadow"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        Primary guests are included in the base rate.
                      </div>
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementGuest('numberOfGuests')}
                      className="w-8 h-8 rounded-md border border-[#0B5858] text-[#0B5858] text-base flex items-center justify-center bg-white hover:bg-[#f1fefa]"
                      aria-label="Decrease guests"
                    >
                      −
                    </button>

                    <div className="flex-1 bg-[#F8FFFE] border border-[#E6F5F4] rounded-lg px-4 py-2 flex items-center justify-center min-h-[40px]">
                      <span className="text-base font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                        {currentPrimaryGuests}
                      </span>
                    </div>

                    <button
                      onClick={() => incrementGuest('numberOfGuests')}
                      className={`w-8 h-8 rounded-md border border-[#0B5858] text-[#0B5858] text-base flex items-center justify-center bg-white hover:bg-[#f1fefa] ${reachedPrimaryMax ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label="Increase guests"
                      disabled={reachedPrimaryMax}
                      title={reachedPrimaryMax ? `Maximum ${baseGuests} primary guest(s). Add extra guests instead.` : 'Add guest'}
                    >
                      +
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Poppins' }}>
                    Base rate covers up to <span className="font-medium">{baseGuests}</span> guest{baseGuests > 1 ? 's' : ''}
                  </p>
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-gray-600 mb-3 flex items-center gap-2" style={{ fontFamily: 'Poppins' }}>
                    <span>Extra Guests</span>
                    <span className="relative inline-block group">
                      <button
                        type="button"
                        aria-describedby="extra-guests-tooltip"
                        className="w-5 h-5 rounded-full border border-[#E6F5F4] bg-white text-[#0B5858] text-xs flex items-center justify-center"
                        aria-label="Extra guests info"
                      >
                        ?
                      </button>
                      <div
                        role="tooltip"
                        id="extra-guests-tooltip"
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-14 z-10 hidden group-hover:block group-focus:block w-72 bg-white border border-[#E6F5F4] rounded-md px-3 py-2 text-xs text-gray-700 shadow"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        Additional fees apply for extra guests: <span className="font-medium">₱{extraGuestFeePerPerson}</span> per extra guest, per night. Clicking "+" here will first fill primary guest slots up to the base allowance, then start adding extra guests.
                      </div>
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrementGuest('extraGuests')}
                      className="w-8 h-8 rounded-md border border-[#0B5858] text-[#0B5858] text-base flex items-center justify-center bg-white hover:bg-[#f1fefa]"
                      aria-label="Decrease extra guests"
                    >
                      −
                    </button>

                    <div className="flex-1 bg-[#F8FFFE] border border-[#E6F5F4] rounded-lg px-4 py-2 flex items-center justify-center min-h-[40px]">
                      <span className="text-base font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                        {extraGuests}
                      </span>
                    </div>

                    <button
                      onClick={() => incrementGuest('extraGuests')}
                      className="w-8 h-8 rounded-md border border-[#0B5858] text-[#0B5858] text-base flex items-center justify-center bg-white hover:bg-[#f1fefa]"
                      aria-label="Increase extra guests"
                      title={currentPrimaryGuests < baseGuests ? `Will add to primary guests until reaching ${baseGuests}` : 'Add extra guest'}
                    >
                      +
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'Poppins' }}>
                    Extra guests incur additional fees (₱{extraGuestFeePerPerson})
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
              <div className="mb-2">
                <h3 className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
                  Quick Calendar
                </h3>
              </div>

              <div className="border rounded-md p-3 sm:p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} aria-label="Previous month" className="p-2 rounded hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0L6.586 11l4.707-4.707a1 1 0 011.414 1.414L9.414 11l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <div className="text-sm sm:text-base font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
                    {new Date(calendarYear, calendarMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </div>

                  <button onClick={nextMonth} aria-label="Next month" className="p-2 rounded hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0L13.414 9l-4.707 4.707a1 1 0 01-1.414-1.414L10.586 9 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-[10px] sm:text-xs text-center mb-3">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="text-gray-500 font-medium py-1" style={{ fontFamily: 'Poppins' }}>
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 text-sm justify-items-center">
                  {days.map((cell, i) => {
                    if (!cell) return <div key={`empty-${i}`} className="w-9 h-9 sm:w-12 sm:h-12" />;

                    const base = 'flex items-center justify-center select-none relative';
                    const sizeClass = 'w-9 h-9 sm:w-12 sm:h-12 text-[11px] sm:text-sm';
                    const startOrEnd = cell.isStart || cell.isEnd;
                    const bgClass = startOrEnd
                      ? 'bg-[#0B5858] text-white'
                      : cell.isSelected
                        ? 'bg-[#DFF6F5] text-[#0B7A76]'
                        : 'text-gray-700 hover:bg-[#EAF9F8]';
                    const roundedClass = startOrEnd ? 'rounded-lg' : (cell.isSelected ? 'rounded-md' : 'rounded-none');
                    const disabledClass = cell.isDisabled ? 'text-gray-300 opacity-60 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer';
                    const interactiveProps = cell.isDisabled ? {} : { onClick: () => onCalendarClick(cell) };

                    return (
                      <div
                        key={`day-${cell.date.getTime()}`}
                        {...interactiveProps}
                        className={`${base} ${sizeClass} ${bgClass} ${roundedClass} ${disabledClass}`}
                        title={`${cell.date.toDateString()}${cell.isBooked ? ' — Booked' : ''}`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {cell.day}
                        {cell.isBooked && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <div className="mx-auto w-full bg-[#EAF9F8] rounded-xl py-3 px-4 text-center text-xs sm:text-sm">
                    <div className="text-xs text-gray-600" style={{ fontFamily: 'Poppins' }}>Selected Range</div>
                    <div className="text-sm font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                      {formattedRange ?? '—'}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-2" style={{ fontFamily: 'Poppins' }}>
                      Check-in and check-out times are set by the host and will be applied automatically.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex justify-end space-x-4 mt-2">
              <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                style={{ fontFamily: 'Poppins' }}
              >
                Cancel
              </button>
              <button
                onClick={onNext}
                disabled={!isFormValid()}
                className="px-6 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                style={{ fontFamily: 'Poppins' }}
              >
                Next
              </button>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 lg:self-start space-y-3">
              <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins' }}>Booking Summary</h4>

                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
                  <div>Base price / night</div>
                  <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>{formatCurrency(basePricePerNight)}</div>
                </div>

                {nights > 0 && pricingRulesCache.size > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm text-amber-600 mb-1">
                    <div>Special pricing applied</div>
                    <div className="font-semibold" style={{ fontFamily: 'Poppins' }}>Yes</div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
                  <div>Nights</div>
                  <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>{nights}</div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
                  <div>Extra guests</div>
                  <div className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>{extraGuests}</div>
                </div>

                <div className="border-t border-[#E6F5F4] mt-2 pt-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-1">
                    <div>Subtotal</div>
                    <div className="font-semibold text-gray-800">{formatCurrency(subtotal)}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 mb-2">
                    <div>Extra guest fees</div>
                    <div className="font-semibold text-gray-800">{formatCurrency(extraGuestFees)}</div>
                  </div>

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

              <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm text-xs sm:text-sm">
                <h4 className="text-sm font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Poppins' }}>Need help?</h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
                  If you have questions about availability or special requests, contact us and we'll assist.
                </p>
                <button
                  className="w-full px-3 py-2 bg-[#E8F8F7] text-[#0B5858] rounded-md text-sm font-medium"
                  style={{ fontFamily: 'Poppins' }}
                  onClick={() => alert('Contact support (placeholder)')}
                >
                  Contact Support
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 p-3 lg:hidden"
        role="region"
        aria-label="Stay details actions"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            style={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </button>
          <button
            onClick={onNext}
            disabled={!isFormValid()}
            className="flex-1 px-3 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ fontFamily: 'Poppins' }}
            aria-disabled={!isFormValid()}
          >
            Next
          </button>
        </div>
      </div>

      {isDateModalOpen && dateModalField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Pick ${dateModalField === 'checkIn' ? 'check-in' : 'check-out'} date`}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setDateModalOpen(false); setDateModalField(null); }}
          />

          <div className="relative w-full md:max-w-2xl md:rounded-lg bg-white md:shadow-lg" style={{ maxHeight: '92vh', overflow: 'auto' }}>
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>
                {dateModalField === 'checkIn' ? 'Select check‑in date' : 'Select check‑out date'}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">{minAllowedDate ? `From ${minAllowedDate.toLocaleDateString()}` : ''}</div>
                <button onClick={() => { setDateModalOpen(false); setDateModalField(null); }} className="text-gray-600 p-1 rounded" aria-label="Close date picker">✕</button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => { prevMonth(); }} className="p-2 rounded hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0L6.586 11l4.707-4.707a1 1 0 011.414 1.414L9.414 11l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="font-semibold text-sm" style={{ fontFamily: 'Poppins' }}>
                    {new Date(calendarYear, calendarMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button onClick={() => { nextMonth(); }} className="p-2 rounded hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0L13.414 9l-4.707 4.707a1 1 0 01-1.414-1.414L10.586 9 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-[10px] sm:text-xs text-center mb-2">
                  {WEEK_DAYS.map(d => (
                    <div key={d} className="text-gray-500 font-medium py-1" style={{ fontFamily: 'Poppins' }}>
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 text-sm justify-items-center">
                  {days.map((cell, i) => {
                    if (!cell) return <div key={`m-empty-${i}`} className="w-10 h-10 sm:w-12 sm:h-12" />;

                    const base = 'flex items-center justify-center select-none relative';
                    const sizeClass = 'w-10 h-10 sm:w-12 sm:h-12 text-[12px] sm:text-sm';
                    const startOrEnd = cell.isStart || cell.isEnd;
                    const bgClass = startOrEnd
                      ? 'bg-[#0B5858] text-white'
                      : cell.isSelected
                        ? 'bg-[#DFF6F5] text-[#0B7A76]'
                        : 'text-gray-700 hover:bg-[#EAF9F8]';
                    const roundedClass = startOrEnd ? 'rounded-lg' : (cell.isSelected ? 'rounded-md' : 'rounded-none');
                    const disabledClass = cell.isDisabled ? 'text-gray-300 opacity-60 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer';
                    const interactiveProps = cell.isDisabled ? {} : { onClick: () => onModalCalendarClick(cell) };

                    return (
                      <div
                        key={`m-day-${cell.date.getTime()}`}
                        {...interactiveProps}
                        className={`${base} ${sizeClass} ${bgClass} ${roundedClass} ${disabledClass}`}
                        title={`${cell.date.toDateString()}${cell.isBooked ? ' — Booked' : ''}`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {cell.day}
                        {cell.isBooked && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" aria-hidden />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="bg-[#F8FFFE] border border-[#E6F5F4] rounded-lg p-3 flex flex-col gap-3">
                  <div>
                    <div className="text-xs text-gray-600">Selected</div>
                    <div className="text-base font-semibold text-[#0B5858]">
                      {dateModalField === 'checkIn'
                        ? (formData.checkInDate ? displayDateLabel(formData.checkInDate) : '—')
                        : (formData.checkOutDate ? displayDateLabel(formData.checkOutDate) : '—')}
                    </div>
                  </div>

                    <div className="text-xs text-gray-500">
                      Check-in and check-out times are set by the host and will be applied automatically.
                    </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => { setDateModalOpen(false); setDateModalField(null); }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => {
                        if (dateModalField === 'checkIn') {
                          onUpdate({ checkInDate: '' });
                          setSelectedDates(prev => ({ ...prev, start: null }));
                        } else if (dateModalField === 'checkOut') {
                          onUpdate({ checkOutDate: '' });
                          setSelectedDates(prev => ({ ...prev, end: null }));
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[#FFEFEF] text-[#B00000] rounded-md text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  Tip: Tap a date to set {dateModalField === 'checkIn' ? 'your check‑in' : 'your check‑out'} date. Dates before {minAllowedDate?.toLocaleDateString() || 'today'} are disabled.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StayDetailsStep;

