import React, { useMemo } from 'react';
import type { BookingFormData, BookingSummary } from '@/types/booking';
import type { Listing } from '@/types/listing';
import { computePriceWithUnitPricing } from '@/lib/utils/unitPricing';
import { BookingSummarySidebar } from './BookingSummarySidebar';
import { NeedHelpCard } from './NeedHelpCard';

interface PaymentInfoStepProps {
  formData: BookingFormData;
  listingId?: string;
  listing?: Listing | null;
  onUpdate: (data: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  /**
   * When true, PaymentInfoStep will NOT render its built-in desktop/mobile action buttons.
   * Use this when the parent page provides its own Cancel/Submit buttons (e.g. standalone payment page).
   */
  hideActions?: boolean;
  /**
   * Optional: Override the calculated total with the actual booking total.
   * Use this when displaying payment for an existing booking to ensure accuracy.
   */
  bookingTotal?: number;
  /**
   * Optional: Override individual charges for display in summary.
   */
  actualCharges?: {
    nights?: number;
    subtotal?: number;
    amenitiesCharge?: number;
    extraGuestFees?: number;
    serviceCharge?: number;
    discount?: number;
  };
}

type PaymentMethod = 'gcash' | 'bank_transfer' | '';

const PaymentInfoStep: React.FC<PaymentInfoStepProps> = ({
  formData,
  listingId,
  listing,
  onUpdate,
  onNext,
  onBack,
  onCancel,
  hideActions = false,
  bookingTotal,
  actualCharges
}) => {
  // Initialize from formData so the selection persists when navigating away/back
  // Do not show any details panel until the user explicitly selects a method.
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>(formData.paymentMethod ?? '');
  const [hasInteracted, setHasInteracted] = React.useState<boolean>(false);

  const [bankReceiptPreview, setBankReceiptPreview] = React.useState<string | null>(null);

  const bankReceiptUrlRef = React.useRef<string | null>(null);

  // Keep local selection in sync with formData.paymentMethod WITHOUT showing details.
  React.useEffect(() => {
    if (formData.paymentMethod) {
      if (formData.paymentMethod !== selectedMethod) {
        setSelectedMethod(formData.paymentMethod as PaymentMethod);
      }
      // Do NOT set hasInteracted here: details should not auto-appear just because parent provided a method.
    } else {
      if (selectedMethod) setSelectedMethod('');
    }
    // intentionally not including selectedMethod to avoid update loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentMethod]);

  // Cleanup bank receipt object URL on unmount
  React.useEffect(() => {
    return () => {
      if (bankReceiptUrlRef.current) {
        try {
          URL.revokeObjectURL(bankReceiptUrlRef.current);
        } catch {
          // ignore
        }
        bankReceiptUrlRef.current = null;
      }
    };
  }, []);

  // ------------------ sanitizers / helpers ------------------

  const collapseInternalNoLeading = (s: string) => {
    if (typeof s !== 'string') return s;
    return s.replace(/^\s+/, '').replace(/\s+/g, ' ');
  };

  const trimAndCollapse = (s: string) => {
    if (typeof s !== 'string') return s;
    return s.trim().replace(/\s+/g, ' ');
  };

  const sanitizeDigits = (value: string) => value.replace(/\D/g, '');
  const sanitizePhone = (value: string) => {
    if (typeof value !== 'string') return value;
    let v = value.trim();
    v = v.replace(/[^\d+]/g, '');
    if (v.includes('+')) {
      const startedWithPlus = value.trim().startsWith('+');
      v = v.replace(/\+/g, '');
      if (startedWithPlus) v = `+${v}`;
    }
    return v;
  };

  const sanitizeAlpha = (value: string) => {
    if (typeof value !== 'string') return value;
    const cleaned = value.replace(/[^\p{L}\s.'-]/gu, '');
    return collapseInternalNoLeading(cleaned);
  };

  const sanitizeAlphanumericAndSpace = (value: string) => {
    if (typeof value !== 'string') return value;
    const cleaned = value.replace(/[^\p{L}\p{N}\s\-\/&.,]/gu, '');
    return collapseInternalNoLeading(cleaned);
  };

  const isValidPersonName = (name?: string) => {
    if (!name) return false;
    const n = trimAndCollapse(name);
    const pattern = /^\p{L}+(?:[ '\.-]\p{L}+)*$/u;
    return pattern.test(n);
  };

  // ------------------ input handlers ------------------

  const handlePaymentMethodChange = (method: Exclude<PaymentMethod, ''>) => {
    if (method === selectedMethod && hasInteracted) return;

    setSelectedMethod(method);
    setHasInteracted(true);

    const cleared = clearPaymentFieldsExcept(method);

    if (method !== 'bank_transfer') {
      if (bankReceiptUrlRef.current) {
        try {
          URL.revokeObjectURL(bankReceiptUrlRef.current);
        } catch {
          // ignore
        }
        bankReceiptUrlRef.current = null;
      }
      setBankReceiptPreview(null);
    }

    onUpdate({
      paymentMethod: method,
      ...cleared
    });
  };

  const clearPaymentFieldsExcept = (keep: Exclude<PaymentMethod, ''>) => {
    const cleared: Partial<BookingFormData> = {
      bankName: '',
      bankAccountNumber: '',
      depositorName: '',
      bankReceiptFileName: '',
      bankReceiptUploaded: false,
      gcashName: '',
      gcashNumber: '',
      gcashRefNumber: '',
      gcashReceiptUploaded: false,
      gcashReceiptFileName: '',
    };

    switch (keep) {
      case 'bank_transfer':
        delete (cleared as any).bankName;
        delete (cleared as any).bankAccountNumber;
        delete (cleared as any).depositorName;
        delete (cleared as any).bankReceiptFileName;
        delete (cleared as any).bankReceiptUploaded;
        break;
      case 'gcash':
        delete (cleared as any).gcashName;
        delete (cleared as any).gcashNumber;
        delete (cleared as any).gcashRefNumber;
        delete (cleared as any).gcashReceiptUploaded;
        delete (cleared as any).gcashReceiptFileName;
        break;
      default:
        break;
    }

    return cleared;
  };

  const handleGenericInput = (field: keyof BookingFormData | string, value: any) => {
    if (typeof value === 'string') {
      value = collapseInternalNoLeading(value);
    }
    onUpdate({ [field]: value } as Partial<BookingFormData>);
  };

  const onBankReceiptChange = (e: React.ChangeEvent<HTMLInputElement> | File | null) => {
    const file = e && 'target' in (e as any) ? (e as React.ChangeEvent<HTMLInputElement>).target.files?.[0] ?? null : (e as File | null);
    if (bankReceiptUrlRef.current) {
      try {
        URL.revokeObjectURL(bankReceiptUrlRef.current);
      } catch {
        // ignore
      }
      bankReceiptUrlRef.current = null;
    }

    if (file) {
      handleGenericInput('bankReceiptFileName', file.name);
      handleGenericInput('bankReceiptUploaded', true);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        bankReceiptUrlRef.current = url;
        setBankReceiptPreview(url);
      } else {
        setBankReceiptPreview(null);
      }
    } else {
      handleGenericInput('bankReceiptFileName', '');
      handleGenericInput('bankReceiptUploaded', false);
      setBankReceiptPreview(null);
    }
  };

  const handleClickableKey = (e: React.KeyboardEvent, clickFn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      clickFn();
    }
  };

  const handleDropBankReceipt = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      onBankReceiptChange(file);
    }
  };

  const handleTermsChange = (agree: boolean) => onUpdate({ agreeToTerms: agree });

  const methodToValidate = hasInteracted ? selectedMethod : (formData.paymentMethod ?? '');

  // ------------------ validations ------------------

  const isPaymentMethodComplete = (method?: PaymentMethod) => {
    switch (method) {
      case 'bank_transfer':
        return !!(formData.bankName && formData.bankAccountNumber && formData.depositorName && (formData.bankReceiptFileName || formData.bankReceiptUploaded === true));
      case 'gcash':
        return !!((formData as any).gcashName && (formData as any).gcashNumber && (formData as any).gcashReceiptUploaded);
      default:
        return false;
    }
  };

  const bankName = formData.bankName ?? '';
  const bankAccountNumber = formData.bankAccountNumber ?? '';
  const depositorName = formData.depositorName ?? '';
  const bankAccountDigits = sanitizeDigits(bankAccountNumber);
  const bankAccountError = (() => {
    if (!bankName) return 'Select bank';
    if (!bankAccountDigits) return 'Account/reference number required';
    if (bankAccountDigits.length < 6) return 'Account number too short';
    if (bankAccountDigits.length > 30) return 'Account number too long';
    return '';
  })();
  const depositorError = (() => {
    if (!depositorName) return 'Depositor name required';
    if (!isValidPersonName(depositorName)) return 'Depositor name contains invalid characters or numbers';
    return '';
  })();

  /* ── GCash validation ─────────────────────────────────────────────── */
  const gcashName = (formData as any).gcashName ?? '';
  const gcashNumber = (formData as any).gcashNumber ?? '';
  const gcashReceiptUploaded = (formData as any).gcashReceiptUploaded ?? false;
  const gcashError = (() => {
    if (!gcashName) return 'GCash account name required';
    if (!gcashNumber) return 'GCash number required';
    const digits = gcashNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) return 'GCash number must be 10-11 digits';
    if (!gcashReceiptUploaded) return 'Please upload proof of payment';
    return '';
  })();

  const methodValidationError = (() => {
    switch (methodToValidate) {
      case 'bank_transfer':
        if (bankAccountError) return bankAccountError;
        if (depositorError) return depositorError;
        return '';
      case 'gcash':
        if (gcashError) return gcashError;
        return '';
      default:
        return 'Select a payment method (GCash or Bank Transfer)';
    }
  })();

  const isFormValid = () => {
    if (!formData.agreeToTerms) return false;
    if (!isPaymentMethodComplete(methodToValidate)) return false;
    if (methodValidationError) return false;
    return true;
  };

  const handleNext = () => {
    if (!isFormValid()) return;
    onNext();
  };

  // ------------------ date & pricing helpers unchanged ------------------

  const parseYMD = (s?: string): Date | null => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const toDateOnly = (d: Date | null) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);

  const pricePerNight = formData.pricePerNight ?? (formData as any).unitCharge ?? 2000.0;
  const baseGuests = (formData as any).baseGuests ?? 2;
  const extraGuestRate = formData.extraGuestRate ?? (formData as any).extraGuestFeePerPerson ?? 250.0;
  const serviceCharge = formData.serviceCharge ?? 100.0;
  const discount = formData.discount ?? 0.0;

  const pricingResult = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate) {
      return {
        baseSubtotal: 0,
        holidayAdjustmentAmount: 0,
        subtotalBeforeDiscount: 0,
        stayLengthDiscountAmount: 0,
        subtotal: 0,
        nights: 0,
      };
    }
    return computePriceWithUnitPricing(
      pricePerNight,
      formData.checkInDate,
      formData.checkOutDate,
      listing?.discount_rules,
      listing?.holiday_pricing_rules
    );
  }, [
    formData.checkInDate,
    formData.checkOutDate,
    pricePerNight,
    listing?.discount_rules,
    listing?.holiday_pricing_rules,
  ]);

  const nights = pricingResult.nights;
  const subtotalBeforeDiscount = nights > 0 ? pricingResult.subtotalBeforeDiscount : 0;
  const stayLengthDiscountAmount = nights > 0 ? pricingResult.stayLengthDiscountAmount : 0;
  const subtotal = nights > 0 ? pricingResult.subtotal : 0;

  const primaryGuests = formData.numberOfGuests ?? 1;
  const extraGuests = formData.extraGuests ?? 0;

  const extraGuestFees = extraGuests * extraGuestRate;

  const calculateSummary = (): BookingSummary => {
    const unitCharge = pricePerNight;
    const amenitiesCharge = (formData.additionalServices || []).reduce((total, svc) => total + svc.quantity * svc.charge, 0);

    const stayDiscount = stayLengthDiscountAmount;
    const totalCharges = subtotalBeforeDiscount + amenitiesCharge + serviceCharge + extraGuestFees - stayDiscount - discount;

    return {
      unitCharge,
      amenitiesCharge,
      serviceCharge,
      discount: discount + stayDiscount,
      totalCharges,
      nights,
      subtotal: subtotalBeforeDiscount,
      extraGuestFees,
      primaryGuests,
      extraGuests,
      baseGuests
    } as unknown as BookingSummary;
  };

  const summary = calculateSummary();
  
  // Use actual booking charges if provided, otherwise use calculated values
  const displaySummary = {
    unitCharge: summary.unitCharge,
    baseGuests: summary.baseGuests ?? baseGuests,
    extraGuests: summary.extraGuests ?? extraGuests,
    nights: actualCharges?.nights ?? summary.nights ?? nights,
    subtotal: actualCharges?.subtotal ?? (summary as any).subtotal ?? subtotalBeforeDiscount,
    amenitiesCharge: actualCharges?.amenitiesCharge ?? summary.amenitiesCharge,
    extraGuestFees: actualCharges?.extraGuestFees ?? (summary as any).extraGuestFees ?? extraGuestFees,
    serviceCharge: actualCharges?.serviceCharge ?? summary.serviceCharge,
    discount: actualCharges?.discount ?? summary.discount,
    totalCharges: bookingTotal ?? summary.totalCharges
  };

  const currentSelectedForUI = hasInteracted ? selectedMethod : '';

  return (
    <div
      className="p-4 sm:p-6 pb-16 md:pb-6 text-xs sm:text-sm md:text-base"
      style={{ fontFamily: 'Poppins' }}
    >
      <div className="max-w-6xl mx-auto">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-[#0B5858] mb-2 sm:mb-3">
        Payment Method
      </h2>
      <p className="text-xs sm:text-sm text-gray-600 mb-4" style={{ lineHeight: 1.5 }}>
        Choose a payment channel. After selecting, fill the fields specific to that method.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm">
          <div className="space-y-3 mb-4">
            {/* Accepted payment methods: GCash and Bank Transfer only */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                currentSelectedForUI === 'gcash' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
              aria-label="GCash Payment"
              title="GCash Payment"
            >
              <input
                type="radio"
                name="paymentMethod"
                value="gcash"
                checked={currentSelectedForUI === 'gcash'}
                onChange={() => handlePaymentMethodChange('gcash')}
                className="w-4 h-4 text-[#0B5858] border-gray-300 focus:ring-[#0B5858]"
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-[#007AFF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">GC</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>GCash</span>
                  <p className="text-[10px] text-gray-500" style={{ fontFamily: 'Poppins' }}>Send payment via GCash and upload proof</p>
                </div>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                currentSelectedForUI === 'bank_transfer' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:bg-gray-50'
              }`}
              aria-label="Bank Transfer"
              title="Bank Transfer"
            >
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={currentSelectedForUI === 'bank_transfer'}
                onChange={() => handlePaymentMethodChange('bank_transfer')}
                className="w-4 h-4 text-[#0B5858] border-gray-300 focus:ring-[#0B5858]"
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-[#0B5858] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>Bank Transfer</span>
                  <p className="text-[10px] text-gray-500" style={{ fontFamily: 'Poppins' }}>Transfer to our bank account and upload receipt</p>
                </div>
              </div>
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-blue-800" style={{ fontFamily: 'Poppins' }}>
                Only GCash and Bank Transfer are accepted. Send the exact amount and upload the receipt/screenshot as proof of payment.
              </p>
            </div>
          </div>

          {/* Payment method detail panels */}
          {hasInteracted && selectedMethod === 'bank_transfer' && (
            <div className="mt-2 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Bank
                </label>
                <select
                  value={formData.bankName || ''}
                  onChange={(e) => handleGenericInput('bankName', sanitizeAlphanumericAndSpace(e.target.value))}
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                >
                  <option value="">-- Select Bank --</option>
                  <option value="BDO">BDO</option>
                  <option value="BPI">BPI</option>
                  <option value="Metrobank">Metrobank</option>
                  <option value="UnionBank">UnionBank</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Account / Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) => handleGenericInput('bankAccountNumber', sanitizeDigits(e.target.value))}
                    placeholder="123456789012"
                    inputMode="numeric"
                    maxLength={30}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                    aria-describedby={bankAccountError ? 'bank-account-error' : undefined}
                  />
                  {bankAccountError && <div id="bank-account-error" className="mt-1 text-xs text-yellow-700">{bankAccountError}</div>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Depositor / Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.depositorName || ''}
                    onChange={(e) => handleGenericInput('depositorName', sanitizeAlpha(e.target.value))}
                    placeholder="Juan dela Cruz"
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                    aria-describedby={depositorError ? 'depositor-error' : undefined}
                  />
                  {depositorError && <div id="depositor-error" className="mt-1 text-xs text-yellow-700">{depositorError}</div>}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Upload Proof of Payment (Receipt)
                </label>

                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => handleClickableKey(e, () => {
                    const el = document.getElementById('bankReceiptInput') as HTMLInputElement | null;
                    el?.click();
                  })}
                  className={
                    "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-dashed " +
                    (formData.bankReceiptUploaded ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50") +
                    " cursor-pointer"
                  }
                  onClick={() => {
                    const el = document.getElementById('bankReceiptInput') as HTMLInputElement | null;
                    el?.click();
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropBankReceipt}
                  aria-label="Upload bank transfer receipt"
                >
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M3 13h18M12 3v14" />
                    </svg>
                  </div>

                  <div className="flex-1 text-left">
                    <div className="text-xs sm:text-sm font-medium text-gray-800">
                      {formData.bankReceiptFileName ? formData.bankReceiptFileName : 'Click to upload or drag and drop a receipt'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Accepted: JPG, PNG, PDF. Max file size depends on backend.
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-[#0B5858] text-white rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = document.getElementById('bankReceiptInput') as HTMLInputElement | null;
                        el?.click();
                      }}
                    >
                      Browse
                    </button>
                  </div>

                  <input
                    id="bankReceiptInput"
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      onBankReceiptChange(e);
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center gap-3">
                  {bankReceiptPreview ? (
                    <img src={bankReceiptPreview} alt="receipt preview" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border" />
                  ) : formData.bankReceiptUploaded ? (
                    <div className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded">
                      Receipt uploaded
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      No file uploaded yet.
                    </div>
                  )}
                </div>

                <p className="text-[11px] sm:text-xs text-gray-500 mt-2">
                  After transferring, upload the receipt so we can confirm your payment faster.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-300 p-3 text-xs text-gray-700 rounded">
                <div>Transfer instructions:</div>
                <div className="mt-1 text-[11px] text-gray-600" style={{ lineHeight: 1.4 }}>
                  - Use the account number above as reference.<br />
                  - Enter exact amount shown in summary.<br />
                  - Upload receipt and allow up to 24 hours for confirmation.
                </div>
              </div>
            </div>
          )}

          {/* ── GCash Payment Panel ──────────────────────────────────────── */}
          {hasInteracted && selectedMethod === 'gcash' && (
            <div className="mt-2 space-y-4">
              {/* GCash payment instructions */}
              <div className="bg-gradient-to-r from-[#007AFF]/10 to-blue-50 border border-[#007AFF]/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-[#007AFF] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-sm">GC</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Poppins' }}>Send Payment To:</h4>
                    <p className="text-lg font-bold text-[#007AFF]" style={{ fontFamily: 'Poppins' }}>0917 123 4567</p>
                    <p className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: 'Poppins' }}>Registered Name: KBC Property Management</p>
                    <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>
                      Send the exact total amount shown in the summary. Include your booking reference in the message.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    GCash Account Name *
                  </label>
                  <input
                    type="text"
                    value={(formData as any).gcashName || ''}
                    onChange={(e) => handleGenericInput('gcashName', sanitizeAlpha(e.target.value))}
                    placeholder="Your GCash registered name"
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                    style={{ fontFamily: 'Poppins' }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    GCash Number *
                  </label>
                  <input
                    type="text"
                    value={(formData as any).gcashNumber || ''}
                    onChange={(e) => handleGenericInput('gcashNumber', sanitizeDigits(e.target.value).slice(0, 11))}
                    placeholder="09XX XXX XXXX"
                    inputMode="numeric"
                    maxLength={11}
                    className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                    style={{ fontFamily: 'Poppins' }}
                  />
                  <div className="text-[11px] text-gray-500 mt-1">Your GCash mobile number (11 digits)</div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  GCash Reference Number (optional)
                </label>
                <input
                  type="text"
                  value={(formData as any).gcashRefNumber || ''}
                  onChange={(e) => handleGenericInput('gcashRefNumber', sanitizeAlphanumericAndSpace(e.target.value))}
                  placeholder="e.g., 1234 5678 9012"
                  className="w-full text-xs sm:text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent"
                  style={{ fontFamily: 'Poppins' }}
                />
              </div>

              {/* Upload GCash receipt/screenshot */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Upload GCash Receipt / Screenshot *
                </label>
                <div
                  className={
                    "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-dashed " +
                    ((formData as any).gcashReceiptUploaded ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50") +
                    " cursor-pointer"
                  }
                  onClick={() => {
                    const el = document.getElementById('gcashReceiptInput') as HTMLInputElement | null;
                    el?.click();
                  }}
                  onKeyDown={(e) => handleClickableKey(e, () => {
                    const el = document.getElementById('gcashReceiptInput') as HTMLInputElement | null;
                    el?.click();
                  })}
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0] ?? null;
                    if (file) {
                      handleGenericInput('gcashReceiptFileName', file.name);
                      handleGenericInput('gcashReceiptUploaded', true);
                    }
                  }}
                  aria-label="Upload GCash receipt"
                >
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-xs sm:text-sm font-medium text-gray-800">
                      {(formData as any).gcashReceiptFileName ? (formData as any).gcashReceiptFileName : 'Click to upload GCash receipt screenshot'}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Screenshot of your GCash payment confirmation
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-[#007AFF] text-white rounded hover:bg-[#0066CC] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = document.getElementById('gcashReceiptInput') as HTMLInputElement | null;
                        el?.click();
                      }}
                    >
                      Browse
                    </button>
                  </div>
                  <input
                    id="gcashReceiptInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) {
                        handleGenericInput('gcashReceiptFileName', file.name);
                        handleGenericInput('gcashReceiptUploaded', true);
                      }
                    }}
                  />
                </div>
                {(formData as any).gcashReceiptUploaded && (
                  <div className="mt-2 px-3 py-1 text-xs bg-green-100 text-green-800 rounded inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Receipt uploaded
                  </div>
                )}
                {gcashError && <div className="mt-1 text-xs text-yellow-700">{gcashError}</div>}
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-300 p-3 text-xs text-gray-700 rounded">
                <div className="font-medium mb-1">Payment Instructions:</div>
                <div className="text-[11px] text-gray-600 space-y-0.5" style={{ lineHeight: 1.5 }}>
                  <p>1. Open GCash app and tap &quot;Send Money&quot;</p>
                  <p>2. Send the exact total amount to <span className="font-semibold text-[#007AFF]">0917 123 4567</span></p>
                  <p>3. Add your name and booking reference in the message</p>
                  <p>4. Take a screenshot of the confirmation</p>
                  <p>5. Upload the screenshot above</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
              {hasInteracted && selectedMethod === 'bank_transfer' && (
                <div className="text-xs text-gray-700">
                  Bank transfer selected. Please transfer the exact amount and upload the receipt using the highlighted upload area.
                </div>
              )}
              {hasInteracted && selectedMethod === 'gcash' && (
                <div className="text-xs text-gray-700">
                  GCash payment selected. Your payment will be verified after receipt upload. Allow up to 24 hours for confirmation.
                </div>
              )}
              {!hasInteracted && (
                <div className="text-xs text-gray-700">
                  Please select GCash or Bank Transfer to proceed.
                </div>
              )}
              <div className="mt-3 flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm2 2V5h1v1h-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Payment Status: Pending</p>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              Please review your booking and payment details before proceeding. By clicking 'Confirm Payment,' you agree to the terms and conditions of this transaction.
            </p>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!formData.agreeToTerms}
                onChange={(e) => handleTermsChange(e.target.checked)}
                className="w-4 h-4 text-[#0B5858] border-gray-300 rounded focus:ring-[#0B5858] disabled:opacity-50"
                disabled={!isPaymentMethodComplete(methodToValidate)}
                title={!isPaymentMethodComplete(methodToValidate) ? 'Complete payment method details first' : 'I agree to the payment terms and conditions'}
              />
              <span className={`ml-2 text-xs sm:text-sm ${!isPaymentMethodComplete(methodToValidate) ? 'text-gray-400' : 'text-gray-700'}`}>
                I agree to the payment terms and conditions
              </span>
            </label>
          </div>
        </div>
        </div>

        {/* Right Panel - Booking Summary + Need Help only (like Stay Details) */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 lg:self-start flex flex-col gap-4">
            <BookingSummarySidebar formData={formData} listingId={listingId} listing={listing} />
            <NeedHelpCard />
          </div>
        </aside>
      </div>

      {/* Desktop actions: visible on lg and up */}
      {!hideActions && (
        <div className="hidden lg:flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isFormValid()}
          className="px-6 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Next
        </button>
        </div>
      )}
      </div>

      {/* Mobile fixed footer: Cancel + Back + Next */}
      {!hideActions && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 p-3 lg:hidden"
          role="region"
          aria-label="Payment actions"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>

            <button
              onClick={onBack}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!isFormValid()}
              aria-disabled={!isFormValid()}
              className="flex-1 px-3 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInfoStep;