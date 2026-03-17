'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import ImageGallery from '@/components/ImageGallery';
import Dropdown from '@/components/Dropdown';
import TimePicker from '@/components/TimePicker';

const NewListingFormMap = dynamic(() => import('@/components/NewListingFormMap'), { ssr: false });

/** Discount rule for custom stay-length based pricing */
export interface DiscountRule {
  id: string;
  minNights: number;
  discountType: 'percentage' | 'fixed';
  discountPercent?: number;
  discountAmount?: number;
  label: string;
}

/** Holiday pricing rule — surcharge or discount on specific dates */
export interface HolidayPricingRule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  adjustmentType: 'increase' | 'discount';
  adjustmentMode: 'percentage' | 'fixed';
  adjustmentPercent?: number;
  adjustmentAmount?: number;
}

export interface PrefillListing {
  id: string;
  title?: string | null;
  unit_number?: string | null;
  tower_building?: string | null;
  description?: string | null;
  price?: number | null;
  price_unit?: string | null;
  currency?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  area_sqm?: number | null;
  property_type?: string | null;
  main_image_url?: string | null;
  image_urls?: string[] | null;
  amenities?: string[] | null;
  min_pax?: number | null;
  max_capacity?: number | null;
  excess_pax_fee?: number | null;
  has_parking?: boolean | null;
  parking_fee?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  assigned_agent_ids?: string[];
  discount_rules?: DiscountRule[] | null;
  holiday_pricing_rules?: HolidayPricingRule[] | null;
}

export interface NewListingFormPayload {
  title: string;
  unit_number?: string;
  tower_building?: string;
  description?: string;
  price: number;
  price_unit: string;
  currency: string;
  location: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  property_type: string;
  min_pax: number;
  max_capacity: number;
  excess_pax_fee: number;
  has_parking?: boolean;
  parking_fee?: number;
  main_image_url?: string;
  image_urls?: string[];
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  check_in_time?: string;
  check_out_time?: string;
  assigned_agent_ids?: string[];
  discount_rules?: DiscountRule[];
  holiday_pricing_rules?: HolidayPricingRule[];
}

interface NewListingFormProps {
  onSubmit: (data: NewListingFormPayload) => void | Promise<void>;
  onCancel: () => void;
  mode?: 'add' | 'edit';
  initialListing?: PrefillListing | null;
  embed?: boolean;
  showAllFields?: boolean;
  onShowAllFieldsChange?: (value: boolean) => void;
  showToast?: (message: string) => void;
}

const NewListingForm: React.FC<NewListingFormProps> = ({
  onSubmit,
  onCancel,
  mode = 'add',
  initialListing = null,
  embed = false,
  showAllFields,
  showToast
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ lat: string; lon: string; display_name: string; address?: { city?: string } }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    unit_number: '',
    tower_building: '',
    description: '',
    price: '',
    price_unit: 'daily',
    currency: 'PHP',
    location: '',
    city: '',
    country: 'Philippines',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    property_type: 'apartment',
    min_pax: '1',
    max_capacity: '2',
    excess_pax_fee: '0',
    has_parking: false,
    parking_fee: '0',
    main_image_url: '',
    image_urls: [] as string[],
    amenities: [] as string[],
    latitude: '',
    longitude: '',
    check_in_time: '',
    check_out_time: ''
  });

  /* ── Discount & Holiday Pricing state ────────────────────────────── */
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([
    { id: 'weekly', minNights: 7, discountType: 'percentage', discountPercent: 10, label: 'Weekly (7+ nights)' },
    { id: 'monthly', minNights: 28, discountType: 'percentage', discountPercent: 20, label: 'Monthly (28+ nights)' },
  ]);
  const [customMinNights, setCustomMinNights] = useState('');
  const [customDiscountType, setCustomDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [customDiscountPercent, setCustomDiscountPercent] = useState('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState('');
  const [customDiscountLabel, setCustomDiscountLabel] = useState('');

  const [holidayRules, setHolidayRules] = useState<HolidayPricingRule[]>([]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [holidayAdjustmentType, setHolidayAdjustmentType] = useState<'increase' | 'discount'>('increase');
  const [holidayAdjustmentMode, setHolidayAdjustmentMode] = useState<'percentage' | 'fixed'>('percentage');
  const [holidayAdjustmentPercent, setHolidayAdjustmentPercent] = useState('');
  const [holidayAdjustmentAmount, setHolidayAdjustmentAmount] = useState('');

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedMainImageId, setSelectedMainImageId] = useState<string | null>(null);
  const [showAllFieldsInternal] = useState(false);
  const effectiveShowAllFields = typeof showAllFields === 'boolean' ? showAllFields : showAllFieldsInternal;
  const submitActionRef = useRef<'save' | 'save_exit'>('save');
  const formRef = useRef<HTMLFormElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const propertyTypes = ['Apartment', 'House', 'Condo', 'Villa', 'Studio', 'Penthouse', 'Townhouse', 'Duplex'];
  const priceUnits = [
    { value: 'daily', label: 'Per Night' },
    { value: 'weekly', label: 'Per Week' },
    { value: 'monthly', label: 'Per Month' },
    { value: 'yearly', label: 'Per Year' }
  ];
  const commonAmenities = ['WiFi', 'Air Conditioning', 'Kitchen', 'Parking', 'Pool', 'Gym', 'Balcony', 'Garden', 'Pet Friendly', 'Security', 'Elevator', 'Laundry', 'TV', 'Refrigerator', 'Microwave', 'Dishwasher'];
  const steps = [
    { id: 'basic-info', title: 'Basic Information', completed: false, active: true },
    { id: 'pricing-discounts', title: 'Pricing & Discounts', completed: false, active: false },
    { id: 'property-details', title: 'Property Details', completed: false, active: false },
    { id: 'images', title: 'Images', completed: false, active: false },
    { id: 'location-map', title: 'Location Map', completed: false, active: false }
  ];

  const getUpdatedSteps = () =>
    steps.map((step, index) => ({
      ...step,
      completed: index < currentStep - 1,
      active: index === currentStep - 1
    }));

  useEffect(() => {
    if (mode === 'edit' && initialListing) {
      setFormData({
        title: initialListing.title || '',
        unit_number: initialListing.unit_number || '',
        tower_building: initialListing.tower_building || '',
        description: initialListing.description || '',
        price: (initialListing.price ?? '').toString(),
        price_unit: initialListing.price_unit || 'daily',
        currency: initialListing.currency || 'PHP',
        location: initialListing.location || initialListing.city || '',
        city: initialListing.city || '',
        country: initialListing.country || 'Philippines',
        bedrooms: (initialListing.bedrooms ?? '').toString(),
        bathrooms: (initialListing.bathrooms ?? '').toString(),
        square_feet: (initialListing.area_sqm ?? initialListing.square_feet ?? '').toString(),
        property_type: initialListing.property_type || 'apartment',
        min_pax: (initialListing.min_pax ?? 1).toString(),
        max_capacity: (initialListing.max_capacity ?? 2).toString(),
        excess_pax_fee: (initialListing.excess_pax_fee ?? 0).toString(),
        has_parking: initialListing.has_parking ?? false,
        parking_fee: (initialListing.parking_fee ?? 0).toString(),
        main_image_url: initialListing.main_image_url || '',
        image_urls: initialListing.image_urls || [],
        amenities: initialListing.amenities || [],
        latitude: initialListing.latitude != null ? String(initialListing.latitude) : '',
        longitude: initialListing.longitude != null ? String(initialListing.longitude) : '',
        check_in_time: initialListing.check_in_time || '',
        check_out_time: initialListing.check_out_time || ''
      });
      if (initialListing.latitude != null && initialListing.longitude != null) {
        setSelectedPosition([initialListing.latitude, initialListing.longitude]);
      }
      const allImages: UploadedImage[] = [];
      if (initialListing.main_image_url) {
        allImages.push({ id: 'existing-main', url: initialListing.main_image_url, name: 'Main Image', size: 0, created_at: new Date().toISOString() });
      }
      if (Array.isArray(initialListing.image_urls)) {
        initialListing.image_urls.forEach((url, idx) => {
          if (url !== initialListing.main_image_url) {
            allImages.push({ id: `existing-${idx}`, url, name: `Image ${idx + 1}`, size: 0, created_at: new Date().toISOString() });
          }
        });
      }
      setUploadedImages(allImages);
      setSelectedMainImageId(initialListing.main_image_url ? 'existing-main' : (allImages[0]?.id ?? null));
      if (initialListing.discount_rules?.length) setDiscountRules(initialListing.discount_rules);
      if (initialListing.holiday_pricing_rules?.length) setHolidayRules(initialListing.holiday_pricing_rules);
    }
  }, [mode, initialListing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAmenityAdd = () => {
    const amenity = amenityInput.trim();
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
      setAmenityInput('');
    }
  };
  const handleAmenityRemove = (amenity: string) => {
    setFormData(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
  };
  const handleAmenityKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAmenityAdd(); }
  };

  const handleImagesUploaded = (newImages: UploadedImage[]) => {
    setUploadedImages(prev => [...prev, ...newImages]);
  };
  const handleMainImageSelect = (imageId: string | null) => {
    setSelectedMainImageId(imageId);
    if (imageId) {
      const selectedImage = uploadedImages.find(img => img.id === imageId);
      if (selectedImage) setFormData(prev => ({ ...prev, main_image_url: selectedImage.url }));
    } else {
      setFormData(prev => ({ ...prev, main_image_url: '' }));
    }
  };
  const handleImageDelete = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedMainImageId === imageId) {
      setSelectedMainImageId(null);
      setFormData(prev => ({ ...prev, main_image_url: '' }));
    }
  };

  useEffect(() => {
    const additionalImageUrls = uploadedImages.filter(img => img.id !== selectedMainImageId).map(img => img.url);
    setFormData(prev => ({ ...prev, image_urls: additionalImageUrls }));
  }, [uploadedImages, selectedMainImageId]);

  useEffect(() => {
    if (selectedPosition) {
      setFormData(prev => ({
        ...prev,
        latitude: selectedPosition[0].toString(),
        longitude: selectedPosition[1].toString()
      }));
      setShowCoordinates(true);
    }
  }, [selectedPosition]);

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const results = await response.json();
      setSearchResults(results);
    } catch {
      setError('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) searchLocation(query);
      else setSearchResults([]);
    }, 1000);
  };

  const handleSearchResultSelect = (result: { lat: string; lon: string; display_name: string; address?: { city?: string } }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSelectedPosition([lat, lng]);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setFormData(prev => ({
      ...prev,
      location: result.display_name,
      city: result.address?.city || result.display_name.split(',')[0] || ''
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) setSearchResults([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.title.trim() !== '' && formData.city.trim() !== '' && formData.price.trim() !== '';
      case 2:
        return true; // pricing/discounts are optional
      case 3:
        return true;
      case 4:
        return uploadedImages.length > 0 && selectedMainImageId !== null;
      case 5:
        return selectedPosition !== null && formData.latitude !== '' && formData.longitude !== '';
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError(null);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  };
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
      setTimeout(() => window.scrollTo(0, 0), 0);
    }
  };

  const isFormValid = () =>
    formData.title && formData.price && formData.city &&
    uploadedImages.length > 0 && selectedMainImageId !== null &&
    selectedPosition && formData.latitude && formData.longitude;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (!isFormValid()) {
        throw new Error('Please complete all required fields and steps before submitting.');
      }
      const allImageUrls = uploadedImages.map(img => img.url);
      const payload: NewListingFormPayload = {
        title: formData.title,
        unit_number: formData.unit_number?.trim() || undefined,
        tower_building: formData.tower_building?.trim() || undefined,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        price_unit: formData.price_unit,
        currency: formData.currency,
        location: formData.location || formData.city,
        city: formData.city,
        country: formData.country,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
        property_type: formData.property_type,
        min_pax: parseInt(formData.min_pax) || 1,
        max_capacity: parseInt(formData.max_capacity) || 2,
        excess_pax_fee: parseFloat(formData.excess_pax_fee) || 0,
        has_parking: formData.has_parking || undefined,
        parking_fee: formData.has_parking ? (parseFloat(formData.parking_fee) || 0) : undefined,
        main_image_url: formData.main_image_url || undefined,
        image_urls: allImageUrls.length > 0 ? allImageUrls : undefined,
        amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        check_in_time: formData.check_in_time?.trim() || undefined,
        check_out_time: formData.check_out_time?.trim() || undefined,
        discount_rules: discountRules.length > 0 ? discountRules : undefined,
        holiday_pricing_rules: holidayRules.length > 0 ? holidayRules : undefined,
      };
      await onSubmit(payload);
      if (typeof showToast === 'function') {
        showToast(mode === 'edit' ? 'Changes saved.' : 'Listing created.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBasicInfoPricingStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Title <span style={{ color: '#B84C4C' }}>*</span></label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="Enter property title" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Property Type</label>
          <Dropdown label={formData.property_type.charAt(0).toUpperCase() + formData.property_type.slice(1)} options={propertyTypes.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }))} onSelect={(value) => setFormData(prev => ({ ...prev, property_type: value }))} placeholder="Select property type" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Tower / Building</label>
          <input type="text" name="tower_building" value={formData.tower_building} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="e.g., Tower A, Building 1" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Unit Number</label>
          <input type="text" name="unit_number" value={formData.unit_number} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="e.g., 101, 2B" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Description</label>
        <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="Describe your property..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>City <span style={{ color: '#B84C4C' }}>*</span></label>
          <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="Enter city name" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Country</label>
          <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="Enter country" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Price <span style={{ color: '#B84C4C' }}>*</span></label>
          <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min={0} step={0.01} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Currency</label>
          <Dropdown label={formData.currency} options={[{ value: 'PHP', label: 'PHP' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} onSelect={(value) => setFormData(prev => ({ ...prev, currency: value }))} placeholder="Select currency" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Price Unit</label>
          <Dropdown label={priceUnits.find(u => u.value === formData.price_unit)?.label || 'Per Night'} options={priceUnits} onSelect={(value) => setFormData(prev => ({ ...prev, price_unit: value }))} placeholder="Select price unit" />
        </div>
      </div>
    </div>
  );

  /** Step 2: Pricing & Discounts — weekly/monthly discounts + holiday surcharges */
  const renderPricingDiscountsStep = () => {
    const handleAddCustomDiscount = () => {
      const minN = parseInt(customMinNights);
      if (!minN || minN < 1) return;
      
      if (customDiscountType === 'percentage') {
        const pct = parseFloat(customDiscountPercent);
        if (!pct || pct <= 0 || pct > 100) return;
        const newRule: DiscountRule = {
          id: `custom-${Date.now()}`,
          minNights: minN,
          discountType: 'percentage',
          discountPercent: pct,
          label: customDiscountLabel.trim() || `${minN}+ nights`,
        };
        setDiscountRules(prev => [...prev, newRule]);
      } else {
        const amt = parseFloat(customDiscountAmount);
        if (!amt || amt <= 0) return;
        const newRule: DiscountRule = {
          id: `custom-${Date.now()}`,
          minNights: minN,
          discountType: 'fixed',
          discountAmount: amt,
          label: customDiscountLabel.trim() || `${minN}+ nights`,
        };
        setDiscountRules(prev => [...prev, newRule]);
      }
      setCustomMinNights('');
      setCustomDiscountPercent('');
      setCustomDiscountAmount('');
      setCustomDiscountLabel('');
    };

    const handleAddHoliday = () => {
      if (!holidayName.trim() || !holidayStartDate || !holidayEndDate) return;
      
      if (holidayAdjustmentMode === 'percentage') {
        const pct = parseFloat(holidayAdjustmentPercent);
        if (!pct || pct <= 0 || pct > 200) return;
        const newRule: HolidayPricingRule = {
          id: `holiday-${Date.now()}`,
          name: holidayName.trim(),
          startDate: holidayStartDate,
          endDate: holidayEndDate,
          adjustmentType: holidayAdjustmentType,
          adjustmentMode: 'percentage',
          adjustmentPercent: pct,
        };
        setHolidayRules(prev => [...prev, newRule]);
      } else {
        const amt = parseFloat(holidayAdjustmentAmount);
        if (!amt || amt <= 0) return;
        const newRule: HolidayPricingRule = {
          id: `holiday-${Date.now()}`,
          name: holidayName.trim(),
          startDate: holidayStartDate,
          endDate: holidayEndDate,
          adjustmentType: holidayAdjustmentType,
          adjustmentMode: 'fixed',
          adjustmentAmount: amt,
        };
        setHolidayRules(prev => [...prev, newRule]);
      }
      setHolidayName('');
      setHolidayStartDate('');
      setHolidayEndDate('');
      setHolidayAdjustmentPercent('');
      setHolidayAdjustmentAmount('');
    };

    const basePrice = parseFloat(formData.price) || 0;
    const currency = formData.currency || 'PHP';
    const currencySymbol = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : '€';

    const getDiscountDisplay = (rule: DiscountRule) => {
      if (rule.discountType === 'fixed' && rule.discountAmount) {
        return `${currencySymbol}${rule.discountAmount.toLocaleString()}`;
      }
      return `${rule.discountPercent || 0}%`;
    };

    const getDiscountedPrice = (rule: DiscountRule) => {
      if (basePrice <= 0) return rule.discountType === 'fixed' ? `${currencySymbol}${rule.discountAmount?.toLocaleString() || 0} off` : `${rule.discountPercent}% off`;
      if (rule.discountType === 'fixed' && rule.discountAmount) {
        return `${currencySymbol}${Math.max(0, basePrice - rule.discountAmount).toLocaleString()}/night`;
      }
      return `${currencySymbol}${(basePrice * (1 - (rule.discountPercent || 0) / 100)).toFixed(0)}/night`;
    };

    const getHolidayDisplay = (rule: HolidayPricingRule) => {
      const sign = rule.adjustmentType === 'increase' ? '+' : '-';
      if (rule.adjustmentMode === 'fixed' && rule.adjustmentAmount) {
        return `${sign}${currencySymbol}${rule.adjustmentAmount.toLocaleString()}`;
      }
      return `${sign}${rule.adjustmentPercent || 0}%`;
    };

    const getHolidayPrice = (rule: HolidayPricingRule) => {
      if (basePrice <= 0) return '';
      if (rule.adjustmentMode === 'fixed' && rule.adjustmentAmount) {
        const adjusted = rule.adjustmentType === 'increase' 
          ? basePrice + rule.adjustmentAmount 
          : Math.max(0, basePrice - rule.adjustmentAmount);
        return ` — ${currencySymbol}${adjusted.toLocaleString()}/night`;
      }
      const pct = rule.adjustmentPercent || 0;
      const adjusted = rule.adjustmentType === 'increase' 
        ? basePrice * (1 + pct / 100) 
        : basePrice * (1 - pct / 100);
      return ` — ${currencySymbol}${adjusted.toFixed(0)}/night`;
    };

    return (
      <div className="space-y-8">
        {/* ── Stay-Length Discounts ─────────────────────────────────────── */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-1" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Stay-Length Discounts</h3>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Poppins' }}>Offer discounts for longer stays. Guests booking for the minimum nights or more will receive the discount automatically.</p>

          {discountRules.length > 0 && (
            <div className="space-y-2 mb-4">
              {discountRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 rounded-full bg-[#0B5858]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#0B5858]">{getDiscountDisplay(rule)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>{rule.label}</p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                        {rule.minNights}+ nights — {getDiscountedPrice(rule)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.discountType === 'percentage' ? (
                      <>
                        <input
                          type="number"
                          value={rule.discountPercent || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= 0 && val <= 100) {
                              setDiscountRules(prev => prev.map(r => r.id === rule.id ? { ...r, discountPercent: val } : r));
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]"
                          style={{ fontFamily: 'Poppins' }}
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">{currencySymbol}</span>
                        <input
                          type="number"
                          value={rule.discountAmount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= 0) {
                              setDiscountRules(prev => prev.map(r => r.id === rule.id ? { ...r, discountAmount: val } : r));
                            }
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]"
                          style={{ fontFamily: 'Poppins' }}
                          min={0}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDiscountRules(prev => prev.filter(r => r.id !== rule.id))}
                      className="ml-2 p-1 text-[#B84C4C] hover:bg-[#B84C4C]/10 rounded transition-colors cursor-pointer"
                      aria-label="Remove discount"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add custom discount */}
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
            <p className="text-sm font-medium text-[#0B5858] mb-3" style={{ fontFamily: 'Poppins' }}>Add Custom Discount</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Min Nights</label>
                <input type="number" value={customMinNights} onChange={(e) => setCustomMinNights(e.target.value)} min={1} placeholder="e.g., 3" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Discount Type</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setCustomDiscountType('percentage')} className={`flex-1 px-2 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${customDiscountType === 'percentage' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>%</button>
                  <button type="button" onClick={() => setCustomDiscountType('fixed')} className={`flex-1 px-2 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${customDiscountType === 'fixed' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>{currencySymbol}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>{customDiscountType === 'percentage' ? 'Discount %' : `Amount (${currency})`}</label>
                {customDiscountType === 'percentage' ? (
                  <input type="number" value={customDiscountPercent} onChange={(e) => setCustomDiscountPercent(e.target.value)} min={1} max={100} placeholder="e.g., 15" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
                ) : (
                  <input type="number" value={customDiscountAmount} onChange={(e) => setCustomDiscountAmount(e.target.value)} min={1} placeholder="e.g., 500" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Label (optional)</label>
                <input type="text" value={customDiscountLabel} onChange={(e) => setCustomDiscountLabel(e.target.value)} placeholder="e.g., 3-Night Deal" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddCustomDiscount} className="w-full px-4 py-2 text-white rounded-lg transition-colors cursor-pointer text-sm" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}>Add Discount</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Holiday / Special Date Pricing ────────────────────────────── */}
        <div>
          <h3 className="text-lg font-semibold text-black mb-1" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Holiday & Special Date Pricing</h3>
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Poppins' }}>Increase prices during peak seasons/holidays, or offer discounts during off-peak dates.</p>

          {holidayRules.length > 0 && (
            <div className="space-y-2 mb-4">
              {holidayRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-10 rounded-full flex items-center justify-center ${rule.adjustmentType === 'increase' ? 'bg-[#B84C4C]/10' : 'bg-[#549F74]/10'}`}>
                      <span className={`text-xs font-bold ${rule.adjustmentType === 'increase' ? 'text-[#B84C4C]' : 'text-[#549F74]'}`}>
                        {getHolidayDisplay(rule)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Poppins' }}>{rule.name}</p>
                      <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                        {new Date(rule.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(rule.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {getHolidayPrice(rule)}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setHolidayRules(prev => prev.filter(r => r.id !== rule.id))} className="p-1 text-[#B84C4C] hover:bg-[#B84C4C]/10 rounded transition-colors cursor-pointer" aria-label="Remove holiday rule">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preset holidays */}
          <div className="mb-4">
            <p className="text-sm font-medium text-[#0B5858] mb-2" style={{ fontFamily: 'Poppins' }}>Quick Add (Philippine Holidays):</p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Christmas Season', start: '2026-12-20', end: '2026-12-31' },
                { name: 'New Year', start: '2026-12-31', end: '2027-01-02' },
                { name: 'Holy Week', start: '2026-03-29', end: '2026-04-04' },
                { name: 'Chinese New Year', start: '2027-02-06', end: '2027-02-08' },
                { name: 'Summer Peak', start: '2026-04-01', end: '2026-05-31' },
                { name: "All Saints' Day", start: '2026-10-31', end: '2026-11-02' },
              ].map(preset => {
                const alreadyAdded = holidayRules.some(r => r.name === preset.name);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => {
                      setHolidayName(preset.name);
                      setHolidayStartDate(preset.start);
                      setHolidayEndDate(preset.end);
                      setHolidayAdjustmentType('increase');
                      setHolidayAdjustmentMode('percentage');
                      setHolidayAdjustmentPercent('25');
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${alreadyAdded ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'}`}
                    style={{ fontFamily: 'Poppins' }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom holiday form */}
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
            <p className="text-sm font-medium text-[#0B5858] mb-3" style={{ fontFamily: 'Poppins' }}>Add Holiday / Special Date Pricing</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Holiday / Event Name</label>
                <input type="text" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g., Christmas Season" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Adjustment Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHolidayAdjustmentType('increase')} className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${holidayAdjustmentType === 'increase' ? 'bg-[#B84C4C] text-white border-[#B84C4C]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>
                    Price Increase ↑
                  </button>
                  <button type="button" onClick={() => setHolidayAdjustmentType('discount')} className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${holidayAdjustmentType === 'discount' ? 'bg-[#549F74] text-white border-[#549F74]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>
                    Discount ↓
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Start Date</label>
                <input type="date" value={holidayStartDate} onChange={(e) => setHolidayStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>End Date</label>
                <input type="date" value={holidayEndDate} onChange={(e) => setHolidayEndDate(e.target.value)} min={holidayStartDate} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Mode</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setHolidayAdjustmentMode('percentage')} className={`flex-1 px-2 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${holidayAdjustmentMode === 'percentage' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>%</button>
                  <button type="button" onClick={() => setHolidayAdjustmentMode('fixed')} className={`flex-1 px-2 py-2 rounded-lg text-xs border transition-colors cursor-pointer ${holidayAdjustmentMode === 'fixed' ? 'bg-[#0B5858] text-white border-[#0B5858]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} style={{ fontFamily: 'Poppins' }}>{currencySymbol}</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>{holidayAdjustmentMode === 'percentage' ? 'Adjustment %' : `Amount (${currency})`}</label>
                {holidayAdjustmentMode === 'percentage' ? (
                  <input type="number" value={holidayAdjustmentPercent} onChange={(e) => setHolidayAdjustmentPercent(e.target.value)} min={1} max={200} placeholder="e.g., 25" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
                ) : (
                  <input type="number" value={holidayAdjustmentAmount} onChange={(e) => setHolidayAdjustmentAmount(e.target.value)} min={1} placeholder="e.g., 500" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]" style={{ fontFamily: 'Poppins' }} />
                )}
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleAddHoliday} className="w-full px-4 py-2 text-white rounded-lg transition-colors cursor-pointer text-sm" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPropertyDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Check-In Time</label>
          <TimePicker value={formData.check_in_time} onChange={(time) => setFormData(prev => ({ ...prev, check_in_time: time }))} placeholder="Select check-in time" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Check-Out Time</label>
          <TimePicker value={formData.check_out_time} onChange={(time) => setFormData(prev => ({ ...prev, check_out_time: time }))} placeholder="Select check-out time" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Bedrooms</label>
          <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} min={0} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Bathrooms</label>
          <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} min={0} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Area (sqm)</label>
          <input type="number" name="square_feet" value={formData.square_feet} onChange={handleInputChange} min={0} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Min Guests <span style={{ color: '#B84C4C' }}>*</span></label>
          <input type="number" name="min_pax" value={formData.min_pax} onChange={handleInputChange} min={1} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="1" />
          <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>Minimum guests included in base price</p>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Max Capacity <span style={{ color: '#B84C4C' }}>*</span></label>
          <input type="number" name="max_capacity" value={formData.max_capacity} onChange={handleInputChange} min={1} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="2" />
          <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>Maximum total guests allowed</p>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Extra Guest Fee (₱/night)</label>
          <input type="number" name="excess_pax_fee" value={formData.excess_pax_fee} onChange={handleInputChange} min={0} step={0.01} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} placeholder="0" />
          <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>Fee per extra guest beyond min</p>
        </div>
      </div>
      {/* Parking Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-black" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Parking</h3>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>Enable if this unit has parking available</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, has_parking: !prev.has_parking }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${formData.has_parking ? '' : 'bg-gray-200'}`}
            style={{ backgroundColor: formData.has_parking ? '#0B5858' : undefined, '--tw-ring-color': '#549F74' } as React.CSSProperties}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${formData.has_parking ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {formData.has_parking && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Parking Fee (₱/night)</label>
              <input 
                type="number" 
                name="parking_fee" 
                value={formData.parking_fee} 
                onChange={handleInputChange} 
                min={0} 
                step={0.01} 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" 
                style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} 
                placeholder="0 (free parking)" 
              />
              <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Poppins' }}>Set to 0 for free parking</p>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-black mb-4" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Amenities</h3>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Add Amenities (Press Enter to add)</label>
          <div className="flex gap-2">
            <input type="text" value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)} onKeyPress={handleAmenityKeyPress} placeholder="Type amenity and press Enter..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} />
            <button type="button" onClick={handleAmenityAdd} className="px-4 py-2 text-white rounded-lg transition-colors cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}>Add</button>
          </div>
        </div>
        {formData.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.amenities.map((amenity, index) => (
              <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-[#0B5858] text-white rounded-full text-sm" style={{ fontFamily: 'Poppins' }}>
                {amenity}
                <button type="button" onClick={() => handleAmenityRemove(amenity)} className="ml-1 transition-colors cursor-pointer hover:text-[#B84C4C]">×</button>
              </span>
            ))}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Common amenities (click to add):</p>
          <div className="flex flex-wrap gap-2">
            {commonAmenities.map(amenity => (
              <button key={amenity} type="button" onClick={() => { if (!formData.amenities.includes(amenity)) setFormData(prev => ({ ...prev, amenities: [...prev.amenities, amenity] })); }} disabled={formData.amenities.includes(amenity)} className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.amenities.includes(amenity) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'}`} style={{ fontFamily: 'Poppins' }}>{amenity}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderImagesStep = () => (
    <div className="space-y-10">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6" style={{ fontFamily: 'Poppins' }}>Upload Property Images</h3>
        <ImageUpload onImagesUploaded={handleImagesUploaded} maxFiles={10} disabled={isSubmitting} />
      </div>
      {uploadedImages.length > 0 && (
        <div className="space-y-6">
          <ImageGallery images={uploadedImages} selectedImageId={selectedMainImageId} onImageSelect={handleMainImageSelect} onImageDelete={handleImageDelete} disabled={isSubmitting} />
        </div>
      )}
      {uploadedImages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4" style={{ fontFamily: 'Poppins' }}>Image Summary</h4>
          <div className="text-sm text-gray-600 space-y-2" style={{ fontFamily: 'Poppins' }}>
            <p>• Main image: {selectedMainImageId ? 'Selected' : 'Not selected'}</p>
            <p>• Additional images: {uploadedImages.filter(img => img.id !== selectedMainImageId).length}</p>
            <p>• Total uploaded: {uploadedImages.length}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderLocationMapStep = () => (
    <div className="space-y-6">
      <div className="border border-green-800 rounded-lg p-4">
        <p className="text-green-800 text-sm" style={{ fontFamily: 'Poppins' }}>Search for a city or location, then click on the map to set the exact property location. Coordinates will be displayed after selection.</p>
      </div>
      <div className="relative search-container">
        <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Search Location</label>
        <div className="relative">
          <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Enter city, address, or landmark..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all duration-200 pr-10" style={{ fontFamily: 'Poppins', '--tw-ring-color': '#549F74' } as React.CSSProperties} />
          {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" /></div>}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button key={index} onClick={() => handleSearchResultSelect(result)} className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0" style={{ fontFamily: 'Poppins' }}>
                <div className="text-sm font-medium text-gray-900">{result.display_name.split(',')[0]}</div>
                <div className="text-xs text-gray-500">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <NewListingFormMap
        center={selectedPosition || [14.5995, 120.9842]}
        zoom={selectedPosition ? 15 : 13}
        selectedPosition={selectedPosition}
        onPositionSelect={(lat, lng) => setSelectedPosition([lat, lng])}
      />
      {showCoordinates && formData.latitude && formData.longitude && (
        <div className="border border-green-800 rounded-lg p-4">
          <p className="text-green-800 text-sm" style={{ fontFamily: 'Poppins' }}>✓ Location set successfully! The coordinates have been captured from the map.</p>
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <div className="animate-fade-in-up">{renderBasicInfoPricingStep()}</div>;
      case 2: return <div className="animate-fade-in-up">{renderPricingDiscountsStep()}</div>;
      case 3: return <div className="animate-fade-in-up">{renderPropertyDetailsStep()}</div>;
      case 4: return <div className="animate-fade-in-up">{renderImagesStep()}</div>;
      case 5: return <div className="animate-fade-in-up">{renderLocationMapStep()}</div>;
      default: return null;
    }
  };

  return (
    <div className={embed ? '' : 'min-h-screen bg-gray-50 py-6 sm:py-8'}>
      <div className={(embed ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8') + ' relative'}>
        {!effectiveShowAllFields && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-6">
              {getUpdatedSteps().map((step, index) => {
                const stepNumber = index + 1;
                const completed = step.completed;
                const active = step.active;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center">
                      <div className="flex flex-col items-center text-center select-none">
                        <div className="relative">
                          {active && <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#0B5858] to-[#558B8B] opacity-30 animate-pulse" />}
                          <button type="button" aria-current={active} aria-label={`Step ${stepNumber}: ${step.title}`} className={`relative w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-500 ease-in-out hover:scale-110 shadow-lg ${completed || active ? 'bg-gradient-to-br from-[#0B5858] to-[#558B8B] text-white shadow-[#0B5858]/25' : 'bg-white text-[#558B8B] border-2 border-[#558B8B] shadow-gray-200 hover:shadow-[#558B8B]/20'} ${(mode === 'edit' || completed) ? 'cursor-pointer' : 'cursor-default'} ${active ? 'scale-105' : ''}`} style={{ fontFamily: 'Poppins' }} onClick={() => { if (mode === 'edit' || completed) setCurrentStep(stepNumber); }}>
                            {completed ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <span className="font-bold">{stepNumber}</span>}
                            {active && <span className="absolute inset-0 rounded-full border-2 border-white/20" />}
                          </button>
                        </div>
                        <div className="mt-5 text-center">
                          <span className={`text-sm font-semibold transition-colors duration-300 ${active ? 'text-[#0B5858]' : completed ? 'text-[#0B5858]' : 'text-gray-500'}`} style={{ fontFamily: 'Poppins', cursor: mode === 'edit' ? 'pointer' : 'default' }} onClick={() => { if (mode === 'edit' || completed) setCurrentStep(stepNumber); }}>{step.title}</span>
                        </div>
                      </div>
                      {index < steps.length - 1 && (
                        <div className="relative mx-6">
                          <div className="w-20 h-0.5 bg-gray-200 rounded-full" />
                          <div className={`absolute top-0 left-0 h-0.5 rounded-full transition-all duration-700 ease-out ${stepNumber < currentStep ? 'w-20 bg-[#F1C40F]' : 'w-0 bg-[#F1C40F]'}`} />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {effectiveShowAllFields ? (
          <div className={embed ? '' : 'mx-4 sm:mx-6 lg:mx-8'}>
            {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600" style={{ fontFamily: 'Poppins' }}>{error}</p></div>}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up"><div className="p-6 sm:p-8 lg:p-10">{renderBasicInfoPricingStep()}</div></div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up"><div className="p-6 sm:p-8 lg:p-10">{renderPropertyDetailsStep()}</div></div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up"><div className="p-6 sm:p-8 lg:p-10">{renderImagesStep()}</div></div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                <div className="p-6 sm:p-8 lg:p-10">
                  {renderLocationMapStep()}
                  {mode !== 'edit' && <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end"><button type="submit" disabled={isSubmitting || !isFormValid()} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>{isSubmitting ? 'Creating...' : 'Create Listing'}</button></div>}
                </div>
              </div>
              <div className="flex items-center justify-end pt-2">
                {mode === 'edit' && (
                  <div className="flex space-x-3">
                    <button type="button" onClick={() => { submitActionRef.current = 'save'; formRef.current?.requestSubmit(); }} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>Save</button>
                    <button type="button" onClick={() => { submitActionRef.current = 'save_exit'; formRef.current?.requestSubmit(); }} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>Save & Exit</button>
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div key={currentStep} className={`bg-white rounded-xl shadow-lg overflow-hidden ${embed ? '' : 'mx-4 sm:mx-6 lg:mx-8'} fade-step`}>
            <div className="p-6 sm:p-8 lg:p-10">
              {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-600" style={{ fontFamily: 'Poppins' }}>{error}</p></div>}
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-8">{renderStepContent()}</div>
                <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
                  {mode === 'edit' ? (
                    <div className="flex space-x-3">
                      <button type="button" onClick={() => { submitActionRef.current = 'save'; formRef.current?.requestSubmit(); }} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>Save</button>
                      <button type="button" onClick={() => { submitActionRef.current = 'save_exit'; formRef.current?.requestSubmit(); }} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>Save & Exit</button>
                    </div>
                  ) : <div />}
                  <div className="flex space-x-4">
                    {currentStep > 1 ? <button type="button" onClick={prevStep} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md cursor-pointer" style={{ fontFamily: 'Poppins' }}>Back</button> : <button type="button" onClick={onCancel} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md cursor-pointer" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>Cancel</button>}
                    {currentStep < steps.length ? <button type="button" onClick={nextStep} disabled={!isStepValid(currentStep)} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>Next</button> : <button type="submit" disabled={isSubmitting || !isFormValid()} className="px-6 py-2 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>{isSubmitting ? <span className="flex items-center"><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{mode === 'edit' ? 'Saving...' : 'Creating...'}</span> : (mode === 'edit' ? 'Save Changes' : 'Create Listing')}</button>}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style>{`.fade-step { animation: fadeStep .18s ease-out; } @keyframes fadeStep { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default NewListingForm;
