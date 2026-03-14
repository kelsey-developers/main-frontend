'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import type { Listing } from '@/types/listing';
import { getUnitById, updateUnitFull } from '@/lib/api/units';
import { useAuth } from '@/contexts/AuthContext';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import type { NewListingFormPayload } from '@/components/NewListingForms';

// ─── Admin-style design tokens (matches admin page) ───────────────────────────

const CARD = {
  base: 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden',
  padding: 'p-6',
  header: 'px-6 py-5 border-b border-gray-50 bg-gray-50/30',
  label: 'text-[11px] font-bold text-gray-400 uppercase tracking-widest',
  subtitle: 'text-xs font-medium text-gray-500',
  innerRow: 'p-4 rounded-2xl border border-gray-100 hover:border-[#0B5858]/20 hover:bg-gray-50/50 transition-all',
} as const;

const TEAL = '#0B5858';

const COMMON_AMENITIES = [
  { icon: 'fa-wifi', label: 'WiFi' },
  { icon: 'fa-snowflake', label: 'Air Conditioning' },
  { icon: 'fa-utensils', label: 'Kitchen' },
  { icon: 'fa-car', label: 'Parking' },
  { icon: 'fa-person-swimming', label: 'Pool' },
  { icon: 'fa-dumbbell', label: 'Gym' },
  { icon: 'fa-house', label: 'Balcony' },
  { icon: 'fa-seedling', label: 'Garden' },
  { icon: 'fa-paw', label: 'Pet Friendly' },
  { icon: 'fa-shield-halved', label: 'Security' },
  { icon: 'fa-elevator', label: 'Elevator' },
  { icon: 'fa-shirt', label: 'Laundry' },
  { icon: 'fa-tv', label: 'TV' },
  { icon: 'fa-refrigerator', label: 'Refrigerator' },
  { icon: 'fa-bolt', label: 'Microwave' },
  { icon: 'fa-spray-bottle', label: 'Dishwasher' },
  { icon: 'fa-bath', label: 'Bathtub' },
  { icon: 'fa-fire', label: 'Heating' },
  { icon: 'fa-laptop', label: 'Workspace' },
  { icon: 'fa-volume-high', label: 'Sound System' },
];

const inputBase = 'w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0B5858] focus:ring-1 focus:ring-[#0B5858] transition-colors';

// ─── Component ──────────────────────────────────────────────────────────────

function UnitManageContent() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || '';
  const { isAdmin, isAgent, roleLoading } = useAuth();
  const canAccess = isAdmin || isAgent;

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const toastRef = useRef<HTMLDivElement>(null);

  const syncFromListing = useCallback((data: Listing) => {
    setListing(data);
    setTitle(data.title || '');
    setDescription(data.description || '');
    setLocation(data.location || '');
    setCity(data.city || '');
    setCountry(data.country || '');
    setPrice(String(data.price ?? ''));
    setAmenities(data.amenities || []);
    setMainImageUrl(data.main_image_url || '');
    setImageUrls((data.image_urls || []).filter((u) => u && u !== data.main_image_url));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!id) { setIsLoading(false); setFetchError('No unit ID'); return; }
      try {
        setIsLoading(true);
        const data = await getUnitById(id);
        if (!data) { setFetchError('Unit not found'); return; }
        syncFromListing(data);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load unit');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, syncFromListing]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = toastRef.current;
      if (!el) return;
      el.classList.remove('t-exit');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight;
      el.classList.add('t-enter');
    }));
    window.setTimeout(() => {
      const el = toastRef.current;
      if (!el) return;
      el.classList.remove('t-enter');
      el.classList.add('t-exit');
    }, 2800);
  };

  const allImages = [mainImageUrl, ...imageUrls].filter(Boolean);
  const handleImagesUploaded = (imgs: UploadedImage[]) => {
    const urls = imgs.map((i) => i.url);
    if (!mainImageUrl && urls[0]) { setMainImageUrl(urls[0]); setImageUrls(urls.slice(1)); }
    else setImageUrls((prev) => [...prev, ...urls]);
  };
  const handleSetMain = (url: string) => {
    if (url === mainImageUrl) return;
    const old = mainImageUrl;
    setMainImageUrl(url);
    setImageUrls((prev) => [old, ...prev.filter((u) => u !== url)].filter(Boolean));
  };
  const handleRemoveImage = (url: string) => {
    if (url === mainImageUrl) { setMainImageUrl(imageUrls[0] || ''); setImageUrls((p) => p.slice(1)); }
    else setImageUrls((p) => p.filter((u) => u !== url));
  };

  const toggleAmenity = (label: string) =>
    setAmenities((p) => (p.includes(label) ? p.filter((a) => a !== label) : [...p, label]));
  const addCustom = () => {
    const a = customAmenity.trim();
    if (a && !amenities.includes(a)) { setAmenities((p) => [...p, a]); setCustomAmenity(''); }
  };

  const buildPayload = (): NewListingFormPayload => {
    if (!listing) throw new Error('No listing');
    return {
      title: title.trim() || listing.title,
      description: description.trim() || undefined,
      price: parseFloat(price) || listing.price,
      price_unit: listing.price_unit || 'night',
      currency: listing.currency || '₱',
      location: location.trim() || listing.location,
      city: city.trim() || listing.city || '',
      country: country.trim() || listing.country || '',
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      square_feet: listing.square_feet,
      property_type: listing.property_type || 'apartment',
      min_pax: listing.min_pax ?? 1,
      max_capacity: listing.max_capacity ?? 2,
      excess_pax_fee: listing.excess_pax_fee ?? 0,
      main_image_url: mainImageUrl || undefined,
      image_urls: imageUrls,
      amenities,
      latitude: listing.latitude,
      longitude: listing.longitude,
      check_in_time: listing.check_in_time,
      check_out_time: listing.check_out_time,
      assigned_agent_ids: listing.assigned_agent_ids,
    };
  };

  const handleSave = async () => {
    if (!listing) return;
    setIsSaving(true);
    try {
      const updated = await updateUnitFull(listing.id, buildPayload());
      syncFromListing(updated);
      setShowPhotoUploader(false);
      showToast('Changes saved successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading ──
  if (roleLoading || isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET} font-poppins`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center min-h-[60vh] items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // ── Access denied ──
  if (!canAccess) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${LAYOUT_NAVBAR_OFFSET} font-poppins`}>
        <div className={`${CARD.base} ${CARD.padding} max-w-md text-center`}>
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-lock text-2xl text-red-400" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Access Denied</h2>
          <p className={`${CARD.subtitle} mt-2 text-gray-500`}>Admin or Agent role required.</p>
          <Link href={`/unit/${id}`} className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98]">
            <i className="fas fa-arrow-left text-sm" aria-hidden />
            Back to listing
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (fetchError || !listing) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${LAYOUT_NAVBAR_OFFSET} font-poppins`}>
        <div className={`${CARD.base} ${CARD.padding} max-w-md text-center`}>
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-exclamation-circle text-2xl text-gray-400" aria-hidden />
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{fetchError || 'Unit not found'}</h2>
          <Link href="/" className="text-sm text-[#0B5858] hover:underline mt-4 inline-block">Go home</Link>
        </div>
      </div>
    );
  }

  const customAmenities = amenities.filter((a) => !COMMON_AMENITIES.find((c) => c.label === a));
  const displayImages = allImages.slice(0, 3);
  const remainingCount = Math.max(0, allImages.length - 3);

  // ── Main render (admin-style layout) ──
  return (
    <div className={`min-h-screen bg-gray-50 ${LAYOUT_NAVBAR_OFFSET} font-poppins`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Page header — matches admin Overview */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit listing</h1>
              <p className={`${CARD.subtitle} mt-1`}>
                Update photos, title, description, location, and amenities for {listing.title}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end ml-auto">
              <Link
                href={`/unit/${id}`}
                className="inline-flex items-center gap-2 px-5 py-3 text-gray-600 text-sm font-bold rounded-2xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                <i className="fas fa-arrow-left text-sm" aria-hidden />
                Back
              </Link>
              <Link
                href={`/unit/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-gray-600 text-white text-sm font-bold rounded-2xl hover:bg-gray-700 hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <i className="fas fa-external-link-alt text-sm" aria-hidden />
                Preview
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#0B5858] text-white text-sm font-bold rounded-2xl hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-check text-sm" aria-hidden />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Left column */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Photos card */}
              <div className={CARD.base}>
                <div className={CARD.header}>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Photos</h2>
                  <p className={`${CARD.subtitle} mt-1`}>First impression matters. Add or reorder images.</p>
                </div>
                <div className="p-6">
                  {displayImages.length === 0 ? (
                    <div
                      onClick={() => setShowPhotoUploader(true)}
                      className={`${CARD.innerRow} cursor-pointer flex flex-col items-center justify-center py-16 group`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#0B5858]/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <i className="fas fa-images text-2xl text-[#0B5858]" aria-hidden />
                      </div>
                      <p className="text-sm font-bold text-gray-700">Click to add photos</p>
                      <p className={`${CARD.subtitle} mt-1`}>Drag and drop or select files</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2.5 mb-4 relative">
                        <div className="col-span-2 rounded-2xl overflow-hidden h-56">
                          <img src={displayImages[0]} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {displayImages.slice(1, 3).map((url, i) => (
                            <div key={i} className={`flex-1 rounded-2xl overflow-hidden relative min-h-[calc(14rem-0.25rem)]`}>
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              {i === 1 && remainingCount > 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                                  <span className="text-white text-xl font-bold">+{remainingCount}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setShowPhotoUploader((s) => !s)}
                          className="absolute bottom-3 right-3 px-4 py-2 rounded-2xl text-white text-xs font-bold shadow-lg bg-[#0B5858]/90 hover:bg-[#0B5858] transition-colors"
                        >
                          <i className="fas fa-camera mr-1.5" aria-hidden />
                          Edit photos
                        </button>
                      </div>

                      {showPhotoUploader && (
                        <div className="mt-6 p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-bold text-gray-800">Manage photos</p>
                            <button onClick={() => setShowPhotoUploader(false)} className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-white transition-colors">
                              <i className="fas fa-times" aria-hidden />
                            </button>
                          </div>
                          {allImages.length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4">
                              {allImages.map((url, i) => (
                                <div key={i} className={`relative group aspect-square rounded-2xl overflow-hidden ${CARD.innerRow} p-0`}>
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  {i === 0 && (
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white bg-[#0B5858]">Cover</div>
                                  )}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                                    {i !== 0 && (
                                      <button onClick={() => handleSetMain(url)} className="w-full py-1.5 bg-white rounded-lg text-[10px] font-bold text-gray-800">Set cover</button>
                                    )}
                                    <button onClick={() => handleRemoveImage(url)} className="w-full py-1.5 bg-red-500 rounded-lg text-[10px] font-bold text-white">Remove</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <ImageUpload onImagesUploaded={handleImagesUploaded} maxFiles={10} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Basics card */}
              <div className={CARD.base}>
                <div className={CARD.header}>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Listing basics</h2>
                  <p className={`${CARD.subtitle} mt-1`}>Title and price — what guests see first.</p>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <p className={`${CARD.label} mb-2`}>Title</p>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Luxury Condo in BGC" className={inputBase} />
                    <p className="text-right text-[11px] text-gray-400 mt-1">{title.length}/150</p>
                  </div>
                  <div>
                    <p className={`${CARD.label} mb-2`}>Price per night</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₱</span>
                      <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} placeholder="0" className={`${inputBase} pl-10 text-lg font-bold`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location card */}
              <div className={CARD.base}>
                <div className={CARD.header}>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Location</h2>
                  <p className={`${CARD.subtitle} mt-1`}>Help guests find your place.</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className={`${CARD.label} mb-2`}>Address</p>
                    <div className="relative">
                      <i className="fas fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input value={location} onChange={(e) => setLocation(e.target.value)} className={`${inputBase} pl-10`} placeholder="Street address, building" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`${CARD.label} mb-2`}>City</p>
                      <input value={city} onChange={(e) => setCity(e.target.value)} className={inputBase} placeholder="e.g. Makati" />
                    </div>
                    <div>
                      <p className={`${CARD.label} mb-2`}>Country</p>
                      <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputBase} placeholder="e.g. Philippines" />
                    </div>
                  </div>
                  {listing.latitude && listing.longitude && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ height: 220 }}>
                      <iframe title="Map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&output=embed`} />
                    </div>
                  )}
                </div>
              </div>

              {/* Description card */}
              <div className={CARD.base}>
                <div className={CARD.header}>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">About this place</h2>
                  <p className={`${CARD.subtitle} mt-1`}>Describe the space, neighborhood, and what makes it special.</p>
                </div>
                <div className="p-6">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Describe your property…" className={`${inputBase} resize-none`} />
                  <p className="text-right text-[11px] text-gray-400 mt-1">{description.length} characters</p>
                </div>
              </div>

              {/* Amenities card */}
              <div className={CARD.base}>
                <div className={CARD.header}>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Amenities</h2>
                  <p className={`${CARD.subtitle} mt-1`}>Select everything your place offers.</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                    {COMMON_AMENITIES.map(({ icon, label }) => {
                      const active = amenities.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleAmenity(label)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium text-left transition-all ${CARD.innerRow} ${
                            active ? '!border-[#0B5858]/40 !bg-[#0B5858]/5 text-[#0B5858]' : ''
                          }`}
                        >
                          <i className={`fas ${icon} flex-shrink-0`} style={{ width: '1.1em', color: active ? TEAL : undefined }} aria-hidden />
                          <span className="truncate">{label}</span>
                          {active && <i className="fas fa-check ml-auto text-[#0B5858] flex-shrink-0" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                  {customAmenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {customAmenities.map((a) => (
                        <span key={a} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-2xl text-sm border border-[#0B5858]/20 bg-[#0B5858]/5 text-[#0B5858] font-medium">
                          {a}
                          <button onClick={() => setAmenities((p) => p.filter((x) => x !== a))} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-[#0B5858]/20 transition-colors">
                            <i className="fas fa-times text-[10px]" aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} className={`${inputBase} flex-1`} placeholder="Add custom amenity…" />
                    <button type="button" onClick={addCustom} disabled={!customAmenity.trim()} className="px-5 py-3 rounded-2xl bg-[#0B5858] text-white text-sm font-bold hover:bg-[#094848] disabled:opacity-40 transition-all">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — sticky summary card */}
            <div className="w-full xl:w-80 flex-shrink-0">
              <div className="sticky top-28">
                <div className={CARD.base}>
                  <div className={CARD.header}>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Summary</h2>
                    <p className={`${CARD.subtitle} mt-1`}>Quick overview and save.</p>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Stats — simple rows */}
                    <div className="space-y-2">
                      {[
                        { icon: 'fa-bed', label: 'Bedrooms', value: listing.bedrooms },
                        { icon: 'fa-bath', label: 'Bathrooms', value: listing.bathrooms },
                        { icon: 'fa-users', label: 'Max guests', value: listing.max_capacity ?? '—' },
                        { icon: 'fa-house', label: 'Type', value: listing.property_type || '—' },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2.5">
                            <i className={`fas ${icon} text-gray-400`} style={{ width: '1em' }} aria-hidden />
                            <span className="text-sm text-gray-500">{label}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                    {(listing.check_in_time || listing.check_out_time) && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        {listing.check_in_time && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Check-in</span>
                            <span className="text-sm font-semibold text-gray-900">{listing.check_in_time}</span>
                          </div>
                        )}
                        {listing.check_out_time && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Check-out</span>
                            <span className="text-sm font-semibold text-gray-900">{listing.check_out_time}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {amenities.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className={`${CARD.label} mb-2`}>{amenities.length} amenities selected</p>
                        <div className="flex flex-wrap gap-1.5">
                          {amenities.slice(0, 4).map((a) => (
                            <span key={a} className="px-2 py-1 rounded-lg text-xs text-gray-600 bg-gray-100 truncate max-w-[120px]">
                              {a}
                            </span>
                          ))}
                          {amenities.length > 4 && (
                            <span className="px-2 py-1 rounded-lg text-xs text-gray-500 bg-gray-100">+{amenities.length - 4}</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 space-y-3">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3.5 rounded-2xl bg-[#0B5858] text-white font-bold text-sm hover:bg-[#094848] hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                        ) : (
                          <><i className="fas fa-check" aria-hidden /> Save changes</>
                        )}
                      </button>
                      <Link href={`/unit/${id}`} className="block text-center text-sm font-medium text-[#0B5858] hover:text-[#094848] transition-colors">
                        View listing →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast */}
      {toast.visible && (
        <div className="fixed right-6 bottom-6 z-[2000] pointer-events-none">
          <div
            ref={toastRef}
            className="t-base pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-lg"
            style={{ color: toast.type === 'error' ? '#B84C4C' : TEAL, borderLeft: `5px solid ${toast.type === 'error' ? '#B84C4C' : TEAL}` }}
            onTransitionEnd={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              if (el.classList.contains('t-exit')) { setToast({ visible: false, message: '', type: 'success' }); el.classList.remove('t-exit'); }
            }}
          >
            {toast.type === 'error' ? <i className="fas fa-exclamation-circle flex-shrink-0" aria-hidden /> : <i className="fas fa-check-circle flex-shrink-0" aria-hidden />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <style>{`
        .t-base { transform: translateY(0.75rem); opacity: 0; transition: transform .32s cubic-bezier(.16,1,.3,1), opacity .28s ease; }
        .t-enter { transform: translateY(0); opacity: 1; }
        .t-exit { transform: translateY(0.75rem); opacity: 0; }
      `}</style>
    </div>
  );
}

export default function UnitManagePage() {
  return <UnitManageContent />;
}
