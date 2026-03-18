'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import SingleDatePicker from '@/components/SingleDatePicker';

type PricingUnit = { id: string; title: string; imageUrl?: string; basePrice?: number };

const PRICING_PRESETS: { id: string; label: string; description: string; pct: number; icon: ReactNode }[] = [
  {
    id: 'peak',
    label: 'Peak Season',
    description: '+30% above base rate',
    pct: 30,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'holiday',
    label: 'Holiday Rate',
    description: '+25% for holidays and events',
    pct: 25,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'weekend',
    label: 'Weekend Rate',
    description: '+15% for Fri–Sun',
    pct: 15,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'low',
    label: 'Low Season Discount',
    description: '−15% to attract bookings',
    pct: -15,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Custom Price',
    description: 'Set a specific nightly rate',
    pct: 0,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
];

export type SpecialPricingRule = {
  id: string;
  start_date: string;
  end_date: string;
  price: number;
  note?: string;
  name?: string;
  scope?: 'global' | 'unit';
  unit_id?: string;
  adjustmentMode?: 'percentage' | 'fixed';
  adjustmentPercent?: number;
};

interface SpecialPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRules?: SpecialPricingRule[];
  onSave: (rule: Omit<SpecialPricingRule, 'id'> & { name?: string; adjustmentMode?: 'percentage' | 'fixed'; adjustmentPercent?: number }) => void;
  onRemove?: (id: string) => void;
  preselectedUnitId?: string | null;
  startDate?: string;
  endDate?: string;
  units?: { id: string; title: string; imageUrl?: string; basePrice?: number }[];
}

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-colors bg-white';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function countDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function fmt(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-US')}`;
}

const SpecialPricingModal: React.FC<SpecialPricingModalProps> = ({
  isOpen,
  onClose,
  existingRules = [],
  onSave,
  onRemove,
  preselectedUnitId,
  startDate = '',
  endDate = '',
  units = [],
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [preset, setPreset] = useState('weekend');
  const [customPrice, setCustomPrice] = useState('');
  const [customPercent, setCustomPercent] = useState('');
  const [customMode, setCustomMode] = useState<'price' | 'percentage'>('price');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [scope, setScope] = useState<'global' | 'unit'>('global');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(preselectedUnitId ?? null);
  const pricingUnits: PricingUnit[] = units.length > 0 ? units : [];
  const resetForm = useCallback(() => {
    setStep(1);
    setLocalStart(startDate);
    setLocalEnd(endDate);
    setPreset('weekend');
    setCustomPrice('');
    setCustomPercent('');
    setCustomMode('price');
    setName('');
    setNote('');
    setScope(preselectedUnitId ? 'unit' : 'global');
    setSelectedUnitId(preselectedUnitId ?? null);
  }, [startDate, endDate, preselectedUnitId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isOpen) resetForm();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const selectedPreset = PRICING_PRESETS.find((p) => p.id === preset);
  const dayCount = countDays(localStart, localEnd);
  const customValid = preset !== 'custom' || (
    customMode === 'price' ? (!!customPrice && parseFloat(customPrice) > 0) : (!!customPercent && !Number.isNaN(parseFloat(customPercent)))
  );
  const canProceed = !!localStart && !!localEnd && localStart <= localEnd && customValid && (!!name.trim() || preset !== 'custom');

  const baseForUnit = pricingUnits.find((u) => u.id === selectedUnitId)?.basePrice ?? (pricingUnits.length > 0 ? pricingUnits.reduce((sum, u) => sum + (u.basePrice ?? 0), 0) / pricingUnits.length : 5000);
  const computedPrice = (() => {
    if (preset === 'custom') {
      if (customMode === 'price') return parseFloat(customPrice) || 0;
      const pct = parseFloat(customPercent) || 0;
      return Math.round(baseForUnit * (1 + pct / 100));
    }
    return Math.round(baseForUnit * (1 + (selectedPreset?.pct ?? 0) / 100));
  })();

  const handleSave = () => {
    if (!localStart || !localEnd) return;
    if (preset === 'custom' && customMode === 'price' && computedPrice <= 0) return;
    const [s, e] = [localStart, localEnd].sort();
    const ruleName = name.trim() || (preset !== 'custom' ? selectedPreset?.label : 'Custom pricing') || 'Special pricing';
    const isFixed = preset === 'custom' ? customMode === 'price' : false;
    const pct = preset === 'custom' && customMode === 'percentage' ? parseFloat(customPercent) || 0 : (selectedPreset?.pct ?? 0);
    onSave({
      start_date: s,
      end_date: e,
      price: isFixed ? computedPrice : 0,
      note: note.trim() || ruleName,
      name: ruleName,
      scope,
      unit_id: scope === 'unit' && selectedUnitId ? selectedUnitId : undefined,
      adjustmentMode: isFixed ? 'fixed' : 'percentage',
      adjustmentPercent: isFixed ? undefined : pct,
    });
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/40 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up flex flex-col"
        style={{ maxHeight: '90vh', fontFamily: 'var(--font-poppins)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 1 ? 'bg-[#0B5858] text-white' : 'bg-[#0B5858]/15 text-[#0B5858]'}`}>1</div>
              <span className="text-xs text-gray-400">Date &amp; Pricing</span>
              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${step === 2 ? 'bg-[#0B5858] text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
              <span className="text-xs text-gray-400">Apply to Units</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{step === 1 ? 'Special Pricing' : 'Apply to Units'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 ? 'Override nightly rates for specific date ranges' : 'Choose which units to apply this pricing to'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {step === 1 ? (
            <div className="space-y-4">
                  {/* Date range */}
                  <div>
                    <label className={labelClass}>Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">From</p>
                        <SingleDatePicker
                          value={localStart}
                          onChange={(date: string) => { setLocalStart(date); if (localEnd && date && localEnd < date) setLocalEnd(''); }}
                          placeholder="Start date"
                          calendarZIndex={200000}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">To</p>
                        <SingleDatePicker
                          value={localEnd}
                          onChange={(date: string) => setLocalEnd(date)}
                          minDate={localStart || undefined}
                          placeholder="End date"
                          calendarZIndex={200000}
                        />
                      </div>
                    </div>
                    {dayCount > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl border border-[#0B5858]/10">
                        <svg className="w-4 h-4 text-[#0B5858]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-sm font-semibold text-[#0B5858]">{dayCount} day{dayCount !== 1 ? 's' : ''} selected</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing presets */}
                  <div>
                    <label className={labelClass}>Pricing Strategy</label>
                    <div className="space-y-2">
                      {PRICING_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreset(p.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer ${preset === p.id ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <span className={`flex-shrink-0 ${preset === p.id ? 'text-[#0B5858]' : 'text-gray-400'}`}>{p.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                              {p.pct !== 0 && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg ${p.pct > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                  {p.pct > 0 ? `+${p.pct}%` : `${p.pct}%`}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{p.description}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${preset === p.id ? 'border-[#0B5858] bg-[#0B5858]' : 'border-gray-300'}`}>
                            {preset === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom price: fixed or percentage */}
                  {preset === 'custom' && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>Custom Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setCustomMode('price')}
                            className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${customMode === 'price' ? 'border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            Fixed Price
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomMode('percentage')}
                            className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${customMode === 'percentage' ? 'border-[#0B5858] bg-[#0B5858]/5 text-[#0B5858]' : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            Percentage
                          </button>
                        </div>
                      </div>
                      {customMode === 'price' ? (
                        <div>
                          <label className={labelClass}>Nightly Rate</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
                            <input
                              type="number"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              placeholder="0"
                              min={0}
                              className={inputClass + ' pl-8'}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className={labelClass}>Adjustment Percentage</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={customPercent}
                              onChange={(e) => setCustomPercent(e.target.value)}
                              placeholder="e.g. 20 for +20%, -15 for -15%"
                              className={inputClass + ' pr-8'}
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Name (required for rule) */}
                  <div>
                    <label className={labelClass}>Name / Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Christmas, Peak Season, Long Weekend..."
                      className={inputClass}
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className={labelClass}>Note <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Additional notes..."
                      className={inputClass}
                    />
                  </div>
            </div>
          ) : (
            <div className="space-y-4">
                  {/* Scope */}
                  <div>
                    <label className={labelClass}>Apply Pricing To</label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => { setScope('global'); setSelectedUnitId(null); }}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all cursor-pointer ${scope === 'global' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <svg className={`w-6 h-6 ${scope === 'global' ? 'text-[#0B5858]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div>
                          <div className={`text-sm font-semibold ${scope === 'global' ? 'text-[#0B5858]' : 'text-gray-700'}`}>All Units</div>
                          <div className="text-xs text-gray-500">Global override</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('unit')}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 text-center transition-all cursor-pointer ${scope === 'unit' ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <svg className={`w-6 h-6 ${scope === 'unit' ? 'text-[#0B5858]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        <div>
                          <div className={`text-sm font-semibold ${scope === 'unit' ? 'text-[#0B5858]' : 'text-gray-700'}`}>Single Unit</div>
                          <div className="text-xs text-gray-500">Specific listing</div>
                        </div>
                      </button>
                    </div>

                    {scope === 'unit' && (
                      <div className="space-y-2">
                        {pricingUnits.map((unit) => {
                          const isSelected = selectedUnitId === unit.id;
                          const projectedPrice = Math.round(unit.basePrice * (1 + (selectedPreset?.pct ?? 0) / 100));
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => setSelectedUnitId(unit.id)}
                              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {unit.imageUrl ? (
                                  <img src={unit.imageUrl} alt={unit.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{unit.title.charAt(0)}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-semibold text-gray-900 truncate">{unit.title}</div>
                                <div className="text-xs text-gray-500">Base: {fmtCurrency(unit.basePrice)}/night</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-[#0B5858]">
                                  {preset === 'custom' ? fmtCurrency(parseFloat(customPrice) || 0) : fmtCurrency(projectedPrice)}
                                </div>
                                {preset !== 'custom' && selectedPreset && selectedPreset.pct !== 0 && (
                                  <div className={`text-[10px] font-semibold ${selectedPreset.pct > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {selectedPreset.pct > 0 ? `+${selectedPreset.pct}%` : `${selectedPreset.pct}%`}
                                  </div>
                                )}
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-[#0B5858] bg-[#0B5858]' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pricing summary */}
                  <div className="bg-gradient-to-br from-[#0B5858]/5 to-[#0B5858]/10 rounded-xl p-4 border border-[#0B5858]/10">
                    <p className="text-[10px] font-bold text-[#0B5858] uppercase tracking-widest mb-3">Pricing Summary</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Date range', value: localStart && localEnd ? `${fmt(localStart)} – ${fmt(localEnd)}` : '—' },
                        { label: 'Duration', value: `${dayCount} day${dayCount !== 1 ? 's' : ''}` },
                        { label: 'Strategy', value: selectedPreset?.label || 'Custom' },
                        { label: 'Rate per night', value: computedPrice > 0 ? fmtCurrency(computedPrice) : '—' },
                        { label: 'Applies to', value: scope === 'global' ? 'All units' : pricingUnits.find((u) => u.id === selectedUnitId)?.title || 'Select a unit' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{row.label}</span>
                          <span className="text-xs font-semibold text-gray-800">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
            {step === 1 ? (
              <>
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={(scope === 'unit' && !selectedUnitId) || computedPrice <= 0}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094848] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save Pricing Rule
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

export default SpecialPricingModal;
