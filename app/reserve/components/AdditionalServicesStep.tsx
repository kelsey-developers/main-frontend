import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BookingFormData, AdditionalService } from '@/types/booking';

interface AdditionalServicesStepProps {
  formData: BookingFormData;
  onUpdate: (data: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

const AdditionalServicesStep: React.FC<AdditionalServicesStepProps> = ({
  formData,
  onUpdate,
  onNext,
  onBack,
  onCancel
}) => {
  // Default services: quantity now defaults to 0
  const defaultServices: AdditionalService[] = [
    { id: '1', name: 'Towel', quantity: 0, charge: 100.0 },
    { id: '2', name: 'Pillow', quantity: 0, charge: 0.0 },
    { id: '3', name: 'Blanket', quantity: 0, charge: 0.0 }
  ];

  const availableCatalog: Array<Pick<AdditionalService, 'name' | 'charge'>> = [
    { name: 'Extra Towel', charge: 50.0 },
    { name: 'Airport Transfer', charge: 500.0 },
    { name: 'Breakfast (per pax)', charge: 150.0 },
    { name: 'Cleaning Service', charge: 300.0 },
    { name: 'Baby Crib', charge: 250.0 }
  ];

  // refs / state
  const searchRef = useRef<HTMLInputElement | null>(null);
  const modalInnerRef = useRef<HTMLDivElement | null>(null); // scrollable catalog area
  const modalPanelRef = useRef<HTMLDivElement | null>(null); // for focus trap
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const services = Array.isArray(formData.additionalServices) ? formData.additionalServices : [];

  const formatCurrency = (value: number) =>
    (Number.isFinite(value) ? value : 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 });

  const total = useMemo(() => {
    return services.reduce((totalAcc, service) => totalAcc + (service.quantity || 0) * (service.charge || 0), 0);
  }, [services]);

  // initialize defaults once
  useEffect(() => {
    if (!Array.isArray(formData.additionalServices) || formData.additionalServices.length === 0) {
      onUpdate({ additionalServices: defaultServices });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // focus search when opened + escape to close
  useEffect(() => {
    if (showServicesModal) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowServicesModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showServicesModal]);

  // lock body scroll while modal open (prevent background scrolling & layout shift)
  useEffect(() => {
    if (!showServicesModal) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [showServicesModal]);

  useEffect(() => {
    if (!showServicesModal) return;

    const onDocWheel = (e: WheelEvent) => {
      const target = e.target as Node;
      if (modalInnerRef.current && modalInnerRef.current.contains(target)) {
        return;
      }
      e.preventDefault();
    };

    const onDocTouchMove = (e: TouchEvent) => {
      const target = e.target as Node;
      if (modalInnerRef.current && modalInnerRef.current.contains(target)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('wheel', onDocWheel, { passive: false });
    document.addEventListener('touchmove', onDocTouchMove, { passive: false });

    return () => {
      document.removeEventListener('wheel', onDocWheel);
      document.removeEventListener('touchmove', onDocTouchMove);
    };
  }, [showServicesModal]);

  // Focus trap inside modal: cycle tabbing within modal when open
  useEffect(() => {
    if (!showServicesModal || !modalPanelRef.current) return;

    const modal = modalPanelRef.current;
    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => el.offsetParent !== null
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    return () => modal.removeEventListener('keydown', handleKeyDown);
  }, [showServicesModal]);

  const updateServices = (updatedServices: AdditionalService[]) => onUpdate({ additionalServices: updatedServices });

  const handleServiceQuantityChange = (serviceId: string, quantity: number) => {
    const updatedServices = services.map(s => (s.id === serviceId ? { ...s, quantity } : s));
    updateServices(updatedServices);
  };

  const handleRemoveService = (serviceId: string) => {
    const updatedServices = services.filter(s => s.id !== serviceId);
    updateServices(updatedServices);
  };

  const MAX_REQUEST_CHARS = 150;

  const countChars = (text?: string) => {
    if (!text) return 0;
    return String(text).length;
  };

  const limitToChars = (text: string, maxChars: number) => {
    if (!text) return text;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars);
  };

  const handleRequestDescriptionChange = (description: string) => {
    const limited = limitToChars(description, MAX_REQUEST_CHARS);
    onUpdate({ requestDescription: limited });
  };

  const addServiceFromCatalog = (item: { name: string; charge: number }, quantity = 1) => {
    const existingIndex = services.findIndex(s => s.name === item.name);
    let updated: AdditionalService[];
    if (existingIndex >= 0) {
      updated = services.map((s, idx) => (idx === existingIndex ? { ...s, quantity: (s.quantity || 0) + quantity } : s));
    } else {
      const newService: AdditionalService = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        name: item.name,
        quantity,
        charge: item.charge
      };
      updated = [...services, newService];
    }
    updateServices(updated);
  };

  const filteredCatalog = availableCatalog.filter(c =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const requestCharCount = countChars(formData.requestDescription);

  const isStepValid = true;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 pb-16 md:pb-6 text-xs sm:text-sm md:text-base">
      <h2 className="text-xl sm:text-2xl font-bold text-[#0B5858] mb-1">Additional Services</h2>
      <p className="text-sm text-gray-500 mb-4 sm:mb-6">Please fill in your additional services to continue</p>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <div className="flex-1 min-w-0">
          <div className="space-y-4 pr-0 sm:pr-4">
            <div
              className="grid grid-cols-3 gap-3 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2"
              style={{ fontFamily: 'Poppins' }}
            >
              <div className="truncate">Add-ons Items</div>
              <div className="text-center">Quantity</div>
              <div className="text-right pr-3">Subtotal</div>
            </div>

            {services.map((service) => {
              const subtotal = (service.quantity || 0) * (service.charge || 0);
              return (
                <div
                  key={service.id}
                  className="grid grid-cols-3 gap-3 items-center py-3 px-2 rounded-md hover:bg-gray-50 transition"
                  style={{ fontFamily: 'Poppins' }}
                >
                  <div className="text-gray-800 font-medium truncate">{service.name}</div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${service.name}`}
                      onClick={() => handleServiceQuantityChange(service.id, Math.max(0, (service.quantity || 0) - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={String(service.quantity ?? 0)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const qty = Number.isNaN(val) ? 0 : Math.max(0, Math.floor(val));
                        handleServiceQuantityChange(service.id, qty);
                      }}
                      className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                      aria-label={`${service.name} quantity`}
                    />

                    <button
                      type="button"
                      aria-label={`Increase ${service.name}`}
                      onClick={() => handleServiceQuantityChange(service.id, (service.quantity || 0) + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-3 pr-3">
                    <div className="text-sm text-gray-800 font-medium">{formatCurrency(subtotal)}</div>
                    {service.id !== '1' && service.id !== '2' && service.id !== '3' && (
                      <button
                        onClick={() => handleRemoveService(service.id)}
                        className="text-red-500 hover:text-red-700 ml-2 p-1"
                        aria-label={`Remove ${service.name}`}
                        title="Remove service"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-start">
              <button
                onClick={() => setShowServicesModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-[#0B5858] text-white rounded-md text-sm hover:bg-[#094b4b]"
                style={{ fontFamily: 'Poppins' }}
              >
                <svg className="w-4 h-4 mr-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Browse catalog
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>Total</span>
              <span className="font-bold text-lg text-gray-800" style={{ fontFamily: 'Poppins' }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Poppins' }}>Request Description</h3>

          <textarea
            value={formData.requestDescription || ''}
            onChange={(e) => handleRequestDescriptionChange(e.target.value)}
            placeholder="Type here..."
            rows={8}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent resize-none text-sm"
            style={{ fontFamily: 'Poppins' }}
            aria-describedby="request-char-count"
          />

          <div id="request-char-count" className="mt-2 text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
            {requestCharCount} / {MAX_REQUEST_CHARS} characters
          </div>
        </div>
      </div>

      <div className="hidden lg:flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={() => onCancel?.()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          style={{ fontFamily: 'Poppins' }}
        >
          Cancel
        </button>
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          style={{ fontFamily: 'Poppins' }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isStepValid}
          className="px-6 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          style={{ fontFamily: 'Poppins' }}
        >
          Next
        </button>
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 p-3 lg:hidden"
        role="region"
        aria-label="Booking actions"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button
            onClick={() => onCancel?.()}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            style={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </button>
          <button
            onClick={onBack}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            style={{ fontFamily: 'Poppins' }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!isStepValid}
            className="flex-1 px-3 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ fontFamily: 'Poppins' }}
            aria-disabled={!isStepValid}
          >
            Next
          </button>
        </div>
      </div>

      {showServicesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Available services"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowServicesModal(false)}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            aria-hidden
          />

          <div
            ref={modalPanelRef}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-[min(820px,96%)] bg-white rounded-t-lg sm:rounded-lg shadow-lg z-10 flex flex-col"
            style={{
              padding: '1rem',
              paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'
            }}
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h4 className="text-lg font-semibold" style={{ fontFamily: 'Poppins' }}>Available Services</h4>
                <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>Choose items to add to the booking.</p>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => window.open('/services', '_blank')}
                  className="text-sm text-[#0B5858] hover:underline"
                  title="Open full services page"
                >
                  Open full page
                </button>

                <button
                  onClick={() => setShowServicesModal(false)}
                  className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200"
                  aria-label="Close available services"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <input
                ref={searchRef}
                type="search"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                style={{ fontFamily: 'Poppins' }}
                aria-label="Search services"
              />
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 border border-gray-200 rounded text-sm"
                aria-label="Clear search"
              >
                Clear
              </button>
            </div>

            <div
              ref={modalInnerRef}
              className="space-y-3 overflow-auto"
              style={{
                overscrollBehavior: 'contain',
                maxHeight: 'calc(100vh - 220px)'
              }}
            >
              {filteredCatalog.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 border rounded">
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ fontFamily: 'Poppins' }}>{item.name}</div>
                    <div className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>{formatCurrency(item.charge)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addServiceFromCatalog(item, 1)}
                      className="px-3 py-2 bg-[#0B5858] text-white rounded text-sm hover:bg-[#0a4a4a]"
                      style={{ fontFamily: 'Poppins' }}
                      aria-label={`Add ${item.name}`}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        addServiceFromCatalog(item, 1);
                        setShowServicesModal(false);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      Add & Close
                    </button>
                  </div>
                </div>
              ))}

              {filteredCatalog.length === 0 && (
                <div className="text-center text-gray-500 py-6" style={{ fontFamily: 'Poppins' }}>
                  No services found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalServicesStep;