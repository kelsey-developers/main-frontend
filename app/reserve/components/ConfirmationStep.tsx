import React, { useMemo, useState, useEffect } from 'react';
import type { BookingFormData, BookingSummary, AdditionalService } from '@/types/booking';
import { BookingService } from '@/services/bookingService';
import { ListingService } from '@/services/listingService';
import { useAuth } from '@/contexts/AuthContext';
import type { Listing } from '@/types/listing';

interface ConfirmationStepProps {
  formData: BookingFormData;
  onConfirm: () => void | Promise<void>;
  onBack: () => void;
  onCancel: () => void;
  onOverlapError?: () => void;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

const isImageUrl = (url?: string) => {
  if (!url) return false;
  const lower = url.split('?')[0].toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

const IconUser = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"></path>
    <path d="M4 20a8 8 0 0116 0H4z"></path>
  </svg>
);
const IconPhone = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92V21a1 1 0 01-1.11 1 19.86 19.86 0 01-8.63-3.07 19.89 19.89 0 01-6-6A19.86 19.86 0 013 3.11 1 1 0 014 2h4.09a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.24 1.02L9.7 9.7a12 12 0 006.6 6.6l1.4-1.4a1 1 0 011.02-.24l3.6 1.2c.43.14.71.56.68.99z"></path>
  </svg>
);
const IconMail = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8l8.5 6L20 8"></path>
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
  </svg>
);
const IconBank = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10h18"></path>
    <path d="M12 3v6"></path>
  </svg>
);
const IconCard = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
    <path d="M2 10h20" fill="currentColor" />
  </svg>
);
const IconDocument = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
    <path d="M14 2v6h6"></path>
  </svg>
);
const IconReceipt = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5V6a2 2 0 00-2-2H5a2 2 0 00-2 2v15l3-1 3 1 3-1 3 1 3-1 3 1V11.5"></path>
    <path d="M7 9h10M7 13h6"></path>
  </svg>
);
const IconCalendar = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"></rect>
    <path d="M16 2v4M8 2v4M3 10h18"></path>
  </svg>
);

// Small reusable detail row to keep layout consistent
const FieldRow: React.FC<{ icon?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode }> = ({ icon, title, subtitle }) => (
  <div className="flex items-start gap-3 min-w-0">
    <div className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0 flex items-center justify-center">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{title}</div>
      {subtitle && <div className="text-xs text-gray-500" style={{ wordBreak: 'break-word' }}>{subtitle}</div>}
    </div>
  </div>
);

const MAX_NOTES_WORDS = 50;

const countWords = (text?: string) => {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
};

const limitToWords = (text: string | undefined, maxWords: number) => {
  if (!text) return '';
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
};

const ExpandableText: React.FC<{ text?: string; maxChars?: number; className?: string; ariaLabel?: string }> = ({ text, maxChars = 100, className = '', ariaLabel }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span className={className}>—</span>;

  const normalized = String(text);
  const tooLong = normalized.length > maxChars;
  const preview = tooLong ? normalized.slice(0, maxChars).trim() + '…' : normalized;

  return (
    <div className={className}>
      <div
        className="whitespace-pre-wrap break-words"
        style={{ wordBreak: 'break-word' }}
        aria-label={ariaLabel}
      >
        {expanded || !tooLong ? normalized : preview}
      </div>
      {tooLong && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-1 text-xs text-[#0B5858] hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  formData,
  onConfirm,
  onBack,
  onCancel,
  onOverlapError,
}) => {
  // new state for showing the confirmation/processing modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'overlap'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get current user for assigned agent
  const { user, userProfile } = useAuth();

  // State for listing data
  const [listing, setListing] = useState<Listing | null>(null);

  // Fetch listing data if listingId is available
  useEffect(() => {
    const fetchListing = async () => {
      if (!formData.listingId) return;

      try {
        const listingData = await ListingService.getListingById(formData.listingId);
        setListing(listingData);
      } catch (error) {
        console.error('Error fetching listing:', error);
      }
    };

    fetchListing();
  }, [formData.listingId]);

  // defensive helpers
  const services: AdditionalService[] = Array.isArray(formData.additionalServices)
    ? formData.additionalServices
    : [];

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });

  // Calculate nights safely (local date-only)
  const nights = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const start = new Date(formData.checkInDate);
    const end = new Date(formData.checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [formData.checkInDate, formData.checkOutDate]);

  // Guests display
  const primaryGuests = formData.numberOfGuests ?? 0;
  const extraGuests = formData.extraGuests ?? 0;
  const totalGuests = primaryGuests + extraGuests;

  // Use listing price from formData instead of hardcoded value if available
  const pricePerNight = formData.pricePerNight ?? (listing as any)?.price_per_night ?? 2000;
  const extraGuestFeePerPerson = formData.extraGuestFeePerPerson ?? formData.extraGuestRate ?? 250;
  const baseGuests = formData.baseGuests ?? 2;

  const extraGuestChargeTotal = useMemo(() => {
    if (!extraGuests || extraGuests <= 0 || nights <= 0) return 0;
    return extraGuests * extraGuestFeePerPerson * nights;
  }, [extraGuests, extraGuestFeePerPerson, nights]);

  // Calculate summary charges
  const summary = useMemo<BookingSummary>(() => {
    const unitCharge = pricePerNight;
    const amenitiesCharge = services.reduce((total, service) => total + (service.quantity * service.charge), 0);
    const discount = 0.0;
    const totalCharges = (unitCharge * Math.max(1, nights)) + amenitiesCharge + extraGuestChargeTotal - discount;

    return {
      nights,
      extraGuests,
      baseGuests,
      unitCharge,
      amenitiesCharge,
      serviceCharge: 0,
      discount,
      totalCharges
    };
  }, [services, nights, extraGuestChargeTotal, extraGuests, pricePerNight, baseGuests]);

  const safeString = (v?: string) => (v ? v : '—');

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '—';
    const [hours, minutes] = (timeString || '00:00').split(':');
    const h = parseInt(hours || '0', 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Combine date (YYYY-MM-DD) and time (HH:mm) into ISO 8601 string (UTC) for timestamptz
  const toIsoFromDateAndTime = (dateString?: string, timeString?: string): string | null => {
    if (!dateString) return null;
    const time = (timeString && /^\d{2}:\d{2}$/.test(timeString)) ? timeString : '00:00';
    const local = new Date(`${dateString}T${time}:00`);
    if (Number.isNaN(local.getTime())) return null;
    return local.toISOString();
  };

  // booking reference: prefer provided one, otherwise generate a short stable-ish id for display
  const bookingRef = useMemo(() => {
    if (formData.bookingReference) return formData.bookingReference;
    return `BK-${String(Date.now()).slice(-6)}`;
  }, [formData.bookingReference]);

  // Location details (structured) - use listing data if available
  const location = {
    address: (listing as any)?.location || formData.locationAddress || 'Bajada, J.P. Laurel Ave, Poblacion District, Davao City, 8000 Davao del Sur',
    landmark: formData.locationLandmark || (listing as any)?.landmark || 'Near SM Lanang Premier / Abreeza Mall',
    parking: formData.locationParking || (listing as any)?.parking_info || 'On-site parking available (paid)',
    coords: listing?.latitude && listing?.longitude
      ? `${listing.latitude}, ${listing.longitude}`
      : formData.locationCoords || '7.0764, 125.6132',
    checkInInstructions: formData.checkInInstructions || 'Meet at the lobby. Photo ID required on check-in.',
    additionalNotes: formData.locationNotes || ''
  };

  // Render a short list of added services (non-zero)
  const addedServices = services.filter(s => s.quantity > 0);

  // Map URL (simple Google Maps query embed). If coords aren't present, this will not render.
  const mapSrc = location.coords
    ? `https://www.google.com/maps?q=${encodeURIComponent(location.coords)}&output=embed`
    : '';

  // Helper to mask card number
  const maskedCard = (card?: string) => {
    if (!card) return 'No card on file';
    const digits = String(card).replace(/\s+/g, '');
    const last4 = digits.slice(-4);
    if (digits.length >= 4) return `•••• ${last4}`;
    return last4;
  };

  // Booking notes handling: display user input, preserve line breaks, truncate to MAX_NOTES_WORDS if needed.
  const rawNotes = formData.requestDescription ?? '';
  const notesLimited = useMemo(() => limitToWords(rawNotes, MAX_NOTES_WORDS), [rawNotes]);
  const notesTruncated = useMemo(() => countWords(rawNotes) > MAX_NOTES_WORDS, [rawNotes]);

  // --- Design tweak: compact, well-aligned property header layout ---
  const propertyType = (listing as any)?.property_type || formData.propertyType || 'Condominium';
  const propertyTitle = (listing as any)?.title || formData.propertyTitle || 'Kelsey Deluxe Condominium';
  const propertyLocationShort = (listing as any)?.location || formData.propertyLocationShort || 'Bajada, J.P. Laurel Ave, Poblacion District, Davao City, 8000 Davao del Sur';
  const propertyImage = (listing as any)?.main_image_url || formData.propertyImage || '/heroimage.png';

  // Payment display helpers: show details based on formData.paymentMethod
  const paymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'credit_card':
        return 'Card (Credit / Debit)';
      case 'bank_transfer':
        return 'Bank Transfer / Deposit';
      case 'company_account':
        return 'Company Account / Billing';
      case 'cash':
        return 'Cash';
      default:
        return '—';
    }
  };

  // Handler invoked by the Confirm Booking button. It shows a modal with a spinner while the onConfirm action runs.
  const handleConfirm = async () => {
    setIsProcessing(true);
    setStatus('processing');
    setErrorMessage(null);

    try {
      if (!formData.listingId) {
        throw new Error('Listing ID is required');
      }

      const sanitizedContactNumber = formData.preferredContactNumber
        ? formData.preferredContactNumber.replace(/\D/g, '')
        : '';

      const booking = await BookingService.createBooking({
        listing_id: formData.listingId,
        check_in_date:
          toIsoFromDateAndTime(formData.checkInDate, formData.checkInTime) ||
          formData.checkInDate,
        check_out_date:
          toIsoFromDateAndTime(formData.checkOutDate, formData.checkOutTime) ||
          formData.checkOutDate,
        total_guests: Math.max(1, totalGuests),
        add_ons: formData.additionalServices || [],
        landmark: formData.locationLandmark || undefined,
        parking_info: formData.locationParking || undefined,
        notes: formData.requestDescription || undefined,
        request_description: formData.requestDescription || undefined,
        payment_method: formData.paymentMethod,
        require_payment: formData.requirePayment !== false,
        total_amount: summary.totalCharges,
        guest_user_id: undefined,
        assigned_agent_id: user ? String(user.id) : undefined,
        assigned_agent_email: user?.email || undefined,
        assigned_agent_name: userProfile?.fullname || undefined,
        client: {
          first_name: formData.firstName || '',
          last_name: formData.lastName || '',
          nickname: formData.nickname || undefined,
          email: formData.email || '',
          contact_number: sanitizedContactNumber || undefined,
          gender: formData.gender || undefined,
          birth_date: formData.dateOfBirth || undefined,
          preferred_contact: formData.contactType || undefined,
          referred_by: formData.referredBy || undefined,
        },
      });

      await Promise.resolve(onConfirm());

      setStatus('success');

      setTimeout(() => {
        const ref = booking.reference_code || String(booking.id);
        window.location.href = `/booking-details/${encodeURIComponent(ref)}`;
      }, 2000);
    } catch (err: unknown) {
      const isOverlap = err instanceof Error && (err as Error & { overlapping?: boolean }).overlapping === true;
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while confirming your booking.';
      setIsProcessing(false);
      if (isOverlap) {
        setStatus('overlap');
        setErrorMessage(message);
      } else {
        setStatus('error');
        setErrorMessage(message);
      }
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">
        {/* Top: heading + help */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-6 sm:h-8 bg-[#0B5858] rounded" />
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
                You're almost done!
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
                Double-check your booking details below — make sure everything looks good before finalizing.
              </p>
            </div>
          </div>

          <div className="text-sm">
            <div className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>Experiencing an issue?</div>
            <button
              onClick={() => { /* hook to support */ }}
              className="inline-flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded text-sm hover:shadow"
              style={{ fontFamily: 'Poppins' }}
              aria-label="Get help"
            >
              <svg className="w-4 h-4 text-[#0B5858]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="#0B5858" strokeWidth="1.2"></path>
                <path d="M9.5 9.5a2.5 2.5 0 114 2c0 2-2 2.5-2 2.5" stroke="#0B5858" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span style={{ color: '#0B5858', fontFamily: 'Poppins' }}>Help</span>
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: main content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Redesigned property header - responsive stacking on mobile */}
            <div className="flex flex-col sm:flex-row items-start gap-4 border border-gray-200 rounded-lg p-3">
              <div className="w-24 h-16 sm:w-36 sm:h-24 flex-shrink-0 overflow-hidden rounded-md">
                <img
                  src={propertyImage}
                  alt={propertyTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#0B5858] uppercase tracking-wide" style={{ fontFamily: 'Poppins' }}>
                    {propertyType}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>
                  {propertyTitle}
                </h3>

                <div className="mt-1">
                  <ExpandableText
                    text={propertyLocationShort}
                    maxChars={100}
                    className="text-xs sm:text-sm text-gray-500"
                    ariaLabel="Property location short"
                  />
                </div>

                {/* guest summary only */}
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600" style={{ fontFamily: 'Poppins' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      <path d="M6 22v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                      <path d="M18 22v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    <span>{totalGuests} guest{totalGuests !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* right: compact meta card - moves under on small screens */}
              <div className="mt-3 sm:mt-0 ml-0 sm:ml-2 w-full sm:w-44 flex-shrink-0">
                <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 text-sm" style={{ fontFamily: 'Poppins' }}>
                  <div className="text-xs text-gray-500">Booking Reference</div>
                  <div className="font-semibold text-gray-800 mt-1 break-words" style={{ wordBreak: 'break-word' }}>{bookingRef}</div>

                  <div className="border-t border-gray-100 mt-3 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">Nights</div>
                      <div className="font-medium text-gray-800">{nights}</div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">Rate</div>
                      <div className="font-medium text-gray-800">{formatCurrency(summary.unitCharge)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charges summary */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-base font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>Charges Summary</h4>

              <div className="text-sm text-gray-700 space-y-3" style={{ fontFamily: 'Poppins' }}>
                <div className="flex justify-between">
                  <span>Unit Charge ({nights} night{nights !== 1 ? 's' : ''})</span>
                  <span>{formatCurrency(summary.unitCharge * Math.max(1, nights))}</span>
                </div>

                {extraGuestChargeTotal > 0 && (
                  <div className="flex justify-between">
                    <span>
                      Extra guest charges ({extraGuests} × {formatCurrency(extraGuestFeePerPerson)} × {nights} night{nights !== 1 ? 's' : ''})
                    </span>
                    <span>{formatCurrency(extraGuestChargeTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Amenities / Additional Services</span>
                  <span>{formatCurrency(summary.amenitiesCharge)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discounts</span>
                  <span className="text-gray-600">-{formatCurrency(summary.discount)}</span>
                </div>

                <div className="border-t border-gray-200 mt-4 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Grand Total</span>
                    <span className="font-bold text-lg">{formatCurrency(summary.totalCharges)}</span>
                  </div>
                </div>
              </div>
            </div>

            {addedServices.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Service details</h5>
                <ul className="text-sm text-gray-700 space-y-1" style={{ fontFamily: 'Poppins' }}>
                  {addedServices.map(s => (
                    <li key={s.id} className="flex justify-between">
                      <span className="break-words" style={{ wordBreak: 'break-word' }}>{s.name} × {s.quantity}</span>
                      <span>{formatCurrency(s.quantity * s.charge)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>Client Information</h5>

                <div className="space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"></path>
                      <path d="M4 20a8 8 0 0116 0H4z"></path>
                    </svg>
                    <div className="min-w-0">
                      <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{safeString(formData.firstName)} {safeString(formData.lastName)}</div>
                      <div className="text-xs text-gray-500">Full name</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 8l8.5 6L20 8"></path>
                      <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                    </svg>
                    <div className="min-w-0">
                      <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{safeString(formData.email)}</div>
                      <div className="text-xs text-gray-500">Email</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92V21a1 1 0 01-1.11 1 19.86 19.86 0 01-8.63-3.07 19.89 19.89 0 01-6-6A19.86 19.86 0 013 3.11 1 1 0 014 2h4.09a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.24 1.02L9.7 9.7a12 12 0 006.6 6.6l1.4-1.4a1 1 0 011.02-.24l3.6 1.2c.43.14.71.56.68.99z"></path>
                    </svg>
                    <div className="min-w-0">
                      <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>{safeString(formData.preferredContactNumber)}</div>
                      <div className="text-xs text-gray-500">Phone</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>
                  Payment Method
                </h5>

                <div className="space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                  {formData.requirePayment === false ? (
                    <FieldRow
                      icon={<IconCalendar />}
                      title={<>Temporary reservation — awaiting host confirmation</>}
                      subtitle="Payment will open after host confirmation"
                    />
                  ) : (
                    <FieldRow
                      icon={<IconCard />}
                      title={<>{paymentMethodLabel(formData.paymentMethod)}</>}
                      subtitle="Payment type"
                    />
                  )}

                  {formData.requirePayment !== false && formData.paymentMethod === 'credit_card' && (
                    <>
                      <FieldRow
                        icon={<IconCard />}
                        title={formData.cardNumber ? maskedCard(formData.cardNumber) : 'No card on file'}
                        subtitle="Card number"
                      />

                      <FieldRow
                        icon={<IconUser />}
                        title={formData.nameOnCard ? formData.nameOnCard : `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || '—'}
                        subtitle={formData.expirationDate ? `Exp: ${safeString(formData.expirationDate)}` : 'Cardholder name'}
                      />
                    </>
                  )}

                  {formData.requirePayment !== false && formData.paymentMethod === 'bank_transfer' && (
                    <>
                      <FieldRow
                        icon={<IconBank />}
                        title={safeString(formData.bankName)}
                        subtitle="Bank"
                      />

                      <FieldRow
                        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h18"></path><path d="M6 11h12"></path></svg>}
                        title={safeString(formData.bankAccountNumber)}
                        subtitle="Account / Reference No."
                      />

                      <FieldRow
                        icon={<IconUser />}
                        title={safeString(formData.depositorName)}
                        subtitle="Depositor / Account Name"
                      />

                      <div className="mt-2 text-xs">
                        <div className={formData.bankReceiptUploaded ? "px-3 py-1 bg-green-100 text-green-800 inline-flex items-center gap-2 rounded" : "text-gray-500 inline-flex items-center gap-2"}>
                          <span className="flex-shrink-0">{<IconReceipt />}</span>
                          <span className="break-words" style={{ wordBreak: 'break-word' }}>{formData.bankReceiptUploaded ? (formData.bankReceiptFileName || 'Receipt uploaded') : (formData.bankReceiptFileName || 'No receipt uploaded')}</span>
                        </div>

                        {formData.bankReceiptUrl && (
                          <div className="mt-2">
                            {isImageUrl(formData.bankReceiptUrl) ? (
                              <a href={formData.bankReceiptUrl} target="_blank" rel="noopener noreferrer" title="Open receipt">
                                <img src={formData.bankReceiptUrl} alt={formData.bankReceiptFileName || 'Receipt'} className="w-24 h-16 sm:w-28 sm:h-20 object-cover rounded border cursor-pointer" />
                              </a>
                            ) : (
                              <a
                                href={formData.bankReceiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                  <path d="M14 3v5h5"></path>
                                </svg>
                                <span className="break-words" style={{ wordBreak: 'break-word' }}>{formData.bankReceiptFileName || 'View receipt'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {formData.requirePayment !== false && formData.paymentMethod === 'company_account' && (
                    <>
                      <FieldRow
                        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16v10H4z"></path></svg>}
                        title={safeString(formData.companyName)}
                        subtitle="Company"
                      />

                      <FieldRow
                        icon={<IconUser />}
                        title={safeString(formData.billingContact)}
                        subtitle="Billing contact"
                      />

                      <FieldRow
                        icon={<IconMail />}
                        title={safeString(formData.billingEmail)}
                        subtitle="Billing email"
                      />

                      <div className="mt-2 text-xs">
                        <div className={formData.billingDocumentUploaded ? "px-3 py-1 bg-green-100 text-green-800 inline-flex items-center gap-2 rounded" : "text-gray-500 inline-flex items-center gap-2"}>
                          <span className="flex-shrink-0">{<IconDocument />}</span>
                          <span className="break-words" style={{ wordBreak: 'break-word' }}>{formData.billingDocumentUploaded ? (formData.billingDocumentFileName || 'Document uploaded') : (formData.billingDocumentFileName || 'No document uploaded')}</span>
                        </div>

                        {formData.billingDocumentUrl && (
                          <div className="mt-2">
                            {isImageUrl(formData.billingDocumentUrl) ? (
                              <a href={formData.billingDocumentUrl} target="_blank" rel="noopener noreferrer" title="Open document">
                                <img src={formData.billingDocumentUrl} alt={formData.billingDocumentFileName || 'Document'} className="w-24 h-16 sm:w-28 sm:h-20 object-cover rounded border cursor-pointer" />
                              </a>
                            ) : (
                              <a
                                href={formData.billingDocumentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-[#0B5858] hover:underline"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                                  <path d="M14 3v5h5"></path>
                                </svg>
                                <span className="break-words" style={{ wordBreak: 'break-word' }}>{formData.billingDocumentFileName || 'View document'}</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      {formData.poNumber && <div className="text-xs text-gray-500 mt-1 break-words" style={{ wordBreak: 'break-word' }}>PO / Ref: {formData.poNumber}</div>}
                    </>
                  )}

                  {formData.requirePayment !== false && formData.paymentMethod === 'cash' && (
                    <>
                      <FieldRow
                        icon={<IconUser />}
                        title={safeString(formData.cashPayerName)}
                        subtitle="Payer name"
                      />

                      <FieldRow
                        icon={<IconPhone />}
                        title={safeString(formData.cashPayerContact)}
                        subtitle="Payer contact"
                      />

                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="flex-shrink-0">{<IconCalendar />}</span>
                        <span className="break-words" style={{ wordBreak: 'break-word' }}>{formData.cashPayBeforeArrival ? 'Will pay before arrival' : 'Will pay on arrival / on-site'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Poppins' }}>Assigned Agent</h5>
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      background: userProfile?.profile_photo
                        ? 'transparent'
                        : 'linear-gradient(to bottom right, #14b8a6, #0d9488)'
                    }}
                  >
                    {userProfile?.profile_photo ? (
                      <img
                        src={userProfile.profile_photo}
                        alt={userProfile?.fullname || 'Agent'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span 
                        className="text-white text-sm font-bold" 
                        style={{ fontFamily: 'Poppins', fontWeight: 700 }}
                      >
                        {(() => {
                          const name = userProfile?.fullname || formData.assignedAgentName || user?.email || 'Agent';
                          const parts = name.split(' ').filter(Boolean);
                          const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : (parts[0] ? parts[0].slice(0,2) : 'AG');
                          return initials.toUpperCase();
                        })()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-sm" style={{ fontFamily: 'Poppins' }}>
                    <div className="font-medium break-words" style={{ wordBreak: 'break-word' }}>
                      {userProfile?.fullname || formData.assignedAgentName || user?.email || 'Agent'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Booking Agent</div>
                    {user?.email && (
                      <div className="text-xs text-gray-500 mt-1 break-words" style={{ wordBreak: 'break-word' }}>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: side column with small cards */}
          <div className="space-y-4">
            {/* Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold" style={{ fontFamily: 'Poppins' }}>Status</h5>
                <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  Confirm Booking First
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Duration</h5>
              <div className="text-sm text-gray-700 space-y-2" style={{ fontFamily: 'Poppins' }}>
                <div>
                  <div className="text-xs text-gray-500">Check-in</div>
                  <div className="break-words" style={{ wordBreak: 'break-word' }}>{formatDate(formData.checkInDate)} • {formatTime(listing?.check_in_time || formData.checkInTime)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Check-out</div>
                  <div className="break-words" style={{ wordBreak: 'break-word' }}>{formatDate(formData.checkOutDate)} • {formatTime(listing?.check_out_time || formData.checkOutTime)}</div>
                </div>
              </div>
            </div>

            {/* Location: map + coordinates + Open in Google Maps link */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Location</h5>

              <div>
                {listing?.latitude && listing?.longitude ? (
                  <div className="w-full overflow-hidden rounded" style={{ borderRadius: 8 }}>
                    <iframe
                      title="Booking location map"
                      src={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&output=embed`}
                      className="w-full h-36 sm:h-48"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : mapSrc ? (
                  <div className="w-full overflow-hidden rounded" style={{ borderRadius: 8 }}>
                    <iframe
                      title="Booking location map"
                      src={mapSrc}
                      className="w-full h-36 sm:h-48"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Map not available. Coordinates missing.</div>
                )}

                <div className="mt-3 sm:mt-4 space-y-3 text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                      <circle cx="12" cy="9" r="1.5" fill="currentColor"></circle>
                    </svg>
                    <div>
                      <div className="text-xs text-gray-500">Coordinates</div>
                      <div className="font-medium text-gray-800 break-words" style={{ wordBreak: 'break-word' }}>{location.coords}</div>
                    </div>
                  </div>
                </div>

                {((listing?.latitude && listing?.longitude) || location.coords) && (
                  <div className="mt-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing?.latitude && listing?.longitude ? `${listing.latitude},${listing.longitude}` : (location.coords || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-[#0B5858] hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Booking notes */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Booking Notes</h5>
              <div className="text-sm text-gray-700" style={{ fontFamily: 'Poppins' }}>
                {rawNotes ? (
                  <>
                    <div className="whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word' }}>
                      {notesLimited}
                      {notesTruncated && '…'}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">No special requests provided.</div>
                )}
              </div>
            </div>

            {/* Policies */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins' }}>Important</h5>
              <ul className="text-xs text-gray-600 space-y-1" style={{ fontFamily: 'Poppins' }}>
                <li>• Free cancellation up to 48 hours before check-in.</li>
                <li>• Check-in time: {formatTime(listing?.check_in_time || formData.checkInTime)}. Check-out time: {formatTime(listing?.check_out_time || formData.checkOutTime)}.</li>
                <li>• Photo ID required at check-in.</li>
                <li>• For special requests, contact support after confirming booking.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer / actions */}
        <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>
            Once confirmed, your booking will be saved and can no longer be edited without assistance.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              style={{ fontFamily: 'Poppins' }}
            >
              Cancel
            </button>
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              style={{ fontFamily: 'Poppins' }}
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="w-full sm:w-auto px-6 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors text-sm"
              style={{ fontFamily: 'Poppins' }}
              aria-disabled={status === 'processing'}
              disabled={status === 'processing'}
            >
              {status === 'processing' ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal / Notification overlay */}
      {(isProcessing || status === 'success' || status === 'error' || status === 'overlap') && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            transition: 'background-color 0.25s ease'
          }}
        >
          <div className="absolute inset-0" onClick={() => { /* ignore clicks behind modal */ }} />

          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full text-center p-8 sm:p-10">
            <div aria-hidden className="flex items-center justify-center mb-6">
              {status === 'processing' && (
                <div className="w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="w-24 h-24">
                    <defs>
                      <linearGradient id="gradient-spinner" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0B5858" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                    <circle cx="40" cy="40" r="32" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                    <g style={{ transformOrigin: '40px 40px', animation: 'spin 1.2s linear infinite' }}>
                      <path
                        d="M8 40a32 32 0 0 1 64 0"
                        stroke="url(#gradient-spinner)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </g>
                  </svg>
                </div>
              )}

              {status === 'success' && (
                <div className="w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="w-24 h-24" style={{ animation: 'scaleIn 0.4s ease-out' }}>
                    <defs>
                      <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0B5858" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                    <circle cx="40" cy="40" r="36" fill="#ecfdf5" />
                    <circle cx="40" cy="40" r="30" fill="url(#gradient-success)" />
                    <path 
                      d="M26 40l10 10 18-20" 
                      stroke="#ffffff" 
                      strokeWidth="5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      fill="none"
                      style={{ animation: 'checkmark 0.5s ease-out 0.2s both' }}
                    />
                  </svg>
                </div>
              )}

              {(status === 'error' || status === 'overlap') && (
                <div className="w-24 h-24 flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="w-24 h-24">
                    <circle cx="40" cy="40" r="36" fill="#fef2f2" />
                    <circle cx="40" cy="40" r="30" fill="#ef4444" />
                    <path d="M28 28l24 24M52 28L28 52" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Poppins' }}>
              {status === 'processing' && 'Confirming booking'}
              {status === 'success' && 'Booking successfully placed!'}
              {status === 'error' && 'Something went wrong'}
              {status === 'overlap' && 'Dates unavailable'}
            </h3>
            <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Poppins' }}>
              {status === 'processing' && "We're confirming your booking with our system. It could take a moment so hang in there."}
              {status === 'success' && 'Redirecting to booking details...'}
              {status === 'error' && (errorMessage ?? 'Unable to confirm booking. Please try again.')}
              {status === 'overlap' && (errorMessage ?? 'Dates overlap with an existing booking.')}
            </p>

            {status === 'overlap' && onOverlapError && (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    setStatus('idle');
                    setErrorMessage(null);
                    onOverlapError();
                  }}
                  className="px-6 py-2 bg-[#0B5858] text-white rounded text-sm"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Retry
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setStatus('idle');
                    setIsProcessing(false);
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-sm"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    void handleConfirm();
                  }}
                  className="px-4 py-2 bg-[#0B5858] text-white rounded text-sm"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            
            @keyframes scaleIn {
              from { 
                transform: scale(0.5); 
                opacity: 0;
              }
              to { 
                transform: scale(1); 
                opacity: 1;
              }
            }
            
            @keyframes checkmark {
              from {
                stroke-dasharray: 50;
                stroke-dashoffset: 50;
              }
              to {
                stroke-dasharray: 50;
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ConfirmationStep;