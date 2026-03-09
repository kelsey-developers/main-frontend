import React, { useState, useEffect, useRef } from 'react';
import type { BookingFormData, BookingStep } from '@/types/booking';
import type { Listing } from '@/types/listing';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import StayDetailsStep from './components/StayDetailsStep';
import ClientInfoStep from './components/ClientInfoStep';
import AdditionalServicesStep from './components/AdditionalServicesStep';
import PaymentInfoStep from './components/PaymentInfoStep';
import ConfirmationStep from './components/ConfirmationStep';

interface BookingFormProps {
  listingId?: string;
  listing?: Listing | null;
  pricePerNight?: number;
  priceUnit?: string;
  extraGuestFeePerPerson?: number;
  baseGuests?: number;
  onCancel: () => void;
  onComplete: (formData: BookingFormData) => void;
  /**
   * If false, the payment step will be skipped and the flow will create a temporary/pencil booking
   * (status = pending) which requires admin confirmation before payment.
   */
  requirePayment?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ listingId, listing, pricePerNight, priceUnit, extraGuestFeePerPerson, baseGuests, onCancel, onComplete, requirePayment = true }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Initial form data filled out with all commonly-referenced fields so child steps
  // can safely read/update them without TS/runtime issues.
  const [formData, setFormData] = useState<BookingFormData>({
    // Listing and Stay Details
    listingId: listingId,
    pricePerNight: pricePerNight,
    priceUnit: priceUnit,
    extraGuestFeePerPerson: extraGuestFeePerPerson,
    baseGuests: baseGuests,
    checkInDate: '',
    checkInTime: '12:00',
    checkOutDate: '',
    checkOutTime: '12:00',
    numberOfGuests: 1,
    extraGuests: 0,

    // Client Info
    firstName: '',
    lastName: '',
    email: '',
    nickname: '',
    dateOfBirth: '',
    referredBy: '',
    gender: 'male',
    preferredContactNumber: '',
    contactType: 'mobile',

    // Additional Services
    additionalServices: [],
    requestDescription: '',

    // Payment Info (include all fields used by PaymentInfoStep and others)
    paymentMethod: 'bank_transfer',
    // indicate whether this flow requires payment now
    requirePayment: requirePayment,
    cardNumber: '',
    nameOnCard: '',
    cvvCode: '',
    expirationDate: '',
    agreeToTerms: false,

    // Bank transfer fields
    bankName: '',
    bankAccountNumber: '',
    depositorName: '',
    bankReceiptUploaded: false,
    bankReceiptFileName: '',

    // Company / billing fields
    companyName: '',
    billingContact: '',
    billingEmail: '',
    poNumber: '',
    billingDocumentUploaded: false,
    billingDocumentFileName: '',

    // Cash payer fields
    cashPayerName: '',
    cashPayerContact: ''
  });

  // Build steps dynamically so we can optionally skip payment when reserving (pencil booking)
  const steps: BookingStep[] = [
    { id: 'stay-details', title: 'Stay Details', completed: false, active: true },
    { id: 'client-info', title: 'Client Info', completed: false, active: false },
    { id: 'additional-services', title: 'Additional Services', completed: false, active: false }
  ];

  if (requirePayment) {
    steps.push({ id: 'payment-info', title: 'Payment Info', completed: false, active: false });
  }

  // Confirmation is always the last step
  steps.push({ id: 'confirmation', title: 'Confirm', completed: false, active: false });

  const updateFormData = (data: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Update formData when pricing props change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      listingId,
      pricePerNight,
      priceUnit,
      extraGuestFeePerPerson,
      baseGuests
    }));
  }, [listingId, pricePerNight, priceUnit, extraGuestFeePerPerson, baseGuests]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete(formData);
  };

  const getCurrentStepComponent = () => {
    const step = steps[currentStep];
    const stepId = step?.id;

    switch (stepId) {
      case 'stay-details':
        return (
          <StayDetailsStep
            formData={formData}
            listingId={listingId}
            listing={listing}
            onUpdate={updateFormData}
            onNext={nextStep}
            onCancel={onCancel}
          />
        );

      case 'client-info':
        return (
          <ClientInfoStep
            formData={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            onCancel={onCancel}
          />
        );

      case 'additional-services':
        return (
          <AdditionalServicesStep
            formData={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            onCancel={onCancel}
          />
        );

      case 'payment-info':
        return (
          <PaymentInfoStep
            formData={formData}
            onUpdate={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            onCancel={onCancel}
          />
        );

      case 'confirmation':
        return (
          <ConfirmationStep
            formData={formData}
            onConfirm={handleComplete}
            onBack={prevStep}
            onCancel={onCancel}
            onOverlapError={() => {
              setCurrentStep(0);
              setFormData(prev => ({
                ...prev,
                checkInDate: '',
                checkOutDate: '',
              }));
            }}
          />
        );

      default:
        return null;
    }
  };

  const getUpdatedSteps = (): BookingStep[] => {
    return steps.map((step, index) => ({
      ...step,
      completed: index < currentStep,
      active: index === currentStep
    }));
  };

  // refs for scrolling/centering
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Array<HTMLDivElement | null>>([]);

  // center active step when it changes (smooth)
  useEffect(() => {
    const container = containerRef.current;
    const activeEl = stepRefs.current[currentStep];
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const currentScrollLeft = container.scrollLeft;
    const offset = activeRect.left - containerRect.left;
    const target = currentScrollLeft + offset - (containerRect.width / 2) + (activeRect.width / 2);

    const maxScroll = container.scrollWidth - container.clientWidth;
    const clamped = Math.max(0, Math.min(maxScroll, target));
    container.scrollTo({ left: clamped, behavior: 'smooth' });
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${LAYOUT_NAVBAR_OFFSET} pb-8 min-h-[calc(100vh-4rem)]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-1">
            <h1 className="text-3xl font-bold text-[#0B5858] mb-6" style={{ fontFamily: 'Poppins' }}>
              Booking Information
            </h1>

            {/* Stepper */}
            <div className="relative">
              <style>{`
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }

                /* transition styles */
                .step-circle { transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease; }
                .step-circle-active { transform: scale(1.12); } /* subtle scale on active */
                .connector { transition: background-color 160ms ease; }
              `}</style>

              <div
                ref={containerRef}
                className="hide-scrollbar overflow-x-auto scroll-smooth"
              >
                {/* align items to the top and reserve a fixed header area for the circle so all circles sit level */}
                <div className="flex items-start gap-1 sm:gap- h-25 w-full min-w-0">
                  {getUpdatedSteps().map((step, index) => (
                    <React.Fragment key={step.id}>
                      <div
                        ref={el => { stepRefs.current[index] = el; }}
                        className="flex-shrink-0 w-auto min-w-[56px] sm:flex-1 sm:w-1/5 sm:min-w-0"
                      >
                        <div className="flex flex-col items-center">
                          {/* fixed-height header area for the circle so all circles align across steps */}
                          <div className="h-12 sm:h-14 flex items-center justify-center w-full">
                            <div
                              className={`step-circle rounded-full flex items-center justify-center ${
                                step.completed
                                  ? 'bg-[#0B5858] text-white'
                                  : step.active
                                  ? 'bg-white border-2 border-[#0B5858] text-[#0B5858]'
                                  : 'bg-white border-2 border-gray-300 text-gray-500'
                              } ${step.active ? 'step-circle-active' : ''} w-8 h-8 sm:w-9 sm:h-9`}
                              aria-hidden
                            >
                              {step.completed ? (
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : step.active ? (
                                <div className="w-3.5 h-3.5 sm:w-3 sm:h-3 rounded-full bg-[#0B5858]" />
                              ) : (
                                // inactive: keep circle only (no number)
                                <div className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 rounded-full bg-transparent" />
                              )}
                            </div>
                          </div>

                          {/* Labels:
                              - Mobile (sm:hidden): stacked words, tighter spacing
                              - Desktop (shown on sm+): single-line label with added top margin to separate from circle
                           */}
                          <div className="sm:mt-1 text-[12px] sm:text-[13px] text-center" style={{ fontFamily: 'Poppins', lineHeight: 1 }}>
                            {/* mobile stacked words */}
                            <div className="sm:hidden">
                              {step.title.split(' ').map((word, wi) => (
                                <span
                                  key={wi}
                                  className={`${step.active ? 'text-[#0B5858] font-medium' : 'text-gray-500'} block`}
                                >
                                  {word}
                                </span>
                              ))}
                            </div>

                            {/* desktop: if title has exactly two words, force a line break so each word sits on its own line; otherwise render normally (allow up to 2 lines if needed) */}
                            <div className="hidden sm:block">
                              {(() => {
                                const parts = step.title.trim().split(/\s+/);
                                if (parts.length === 2) {
                                  return (
                                    <span className={`${step.active ? 'text-[#0B5858] font-medium' : 'text-gray-500'}`}>
                                      {parts[0]}<br />{parts[1]}
                                    </span>
                                  );
                                }

                                return (
                                  <span className={`${step.active ? 'text-[#0B5858] font-medium' : 'text-gray-500'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                                    {step.title}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* connector: visible on all breakpoints, thickness adjusts by breakpoint */}
                      {index < steps.length - 1 && (
                        <div
                          className={`connector self-center flex-shrink flex-grow h-1 mb-10 sm:h-[2px] min-w-[80px] sm:min-w-[12px] ${index < currentStep ? 'bg-[#0B5858]' : 'bg-gray-300'}`}
                          aria-hidden
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">{getCurrentStepComponent()}</div>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;