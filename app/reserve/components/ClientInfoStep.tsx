import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BookingFormData, GuestEntry } from '@/types/booking';
import type { Listing } from '@/types/listing';
import { BookingSummarySidebar } from './BookingSummarySidebar';
import { NeedHelpCard } from './NeedHelpCard';

interface ClientInfoStepProps {
  formData: BookingFormData;
  listingId?: string;
  listing?: Listing | null;
  onUpdate: (data: Partial<BookingFormData>) => void;
  onUpdateField?: (key: keyof BookingFormData, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel?: () => void;
}

const collapseSpacesTrim = (s: string) => s.replace(/ {2,}/g, ' ').replace(/^\s+/, '').replace(/\s+$/, '');

const FloatingInput: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  setValue: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  preventLeadingSpace?: boolean;
  sanitizeOnBlur?: (v: string) => string;
}> = ({ id, label, type = 'text', value, setValue, inputMode, inputProps, preventLeadingSpace, sanitizeOnBlur }) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || (value != null && String(value).length > 0);

  const prevValueRef = useRef<string>(value ?? '');
  useEffect(() => {
    prevValueRef.current = value ?? '';
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newVal = e.target.value ?? '';
    if (preventLeadingSpace && newVal.startsWith(' ')) {
      newVal = newVal.replace(/^\s+/, '');
    }

    if (newVal.length < prevValueRef.current.length) {
      prevValueRef.current = newVal;
      setValue(newVal);
      return;
    }

    const hadTrailing = /\s$/.test(newVal);
    let collapsed = newVal.replace(/ {2,}/g, ' ');
    if (hadTrailing && !collapsed.endsWith(' ')) collapsed = collapsed + ' ';

    prevValueRef.current = collapsed;
    setValue(collapsed);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text') || '';

    let cleaned = pasted;
    if (preventLeadingSpace && cleaned.startsWith(' ')) cleaned = cleaned.replace(/^\s+/, '');

    const input = e.target as HTMLInputElement;
    const selStart = input.selectionStart ?? input.value.length;
    const selEnd = input.selectionEnd ?? input.value.length;

    const before = (value ?? '').slice(0, selStart);
    const after = (value ?? '').slice(selEnd);
    let composed = before + cleaned + after;

    const hadTrailing = /\s$/.test(before + cleaned);
    composed = composed.replace(/ {2,}/g, ' ');
    if (hadTrailing && !composed.endsWith(' ')) composed = composed + ' ';

    prevValueRef.current = composed;
    setValue(composed);

    const caretPos = before.length + cleaned.length;
    setTimeout(() => {
      try {
        input.focus();
        input.setSelectionRange(caretPos, caretPos);
      } catch {
        // ignore
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (typeof sanitizeOnBlur === 'function') {
      const final = sanitizeOnBlur(value || '');
      if (final !== (value || '')) setValue(final);
    } else {
      const final = collapseSpacesTrim(value || '');
      if (final !== (value || '')) setValue(final);
    }
  };

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={`absolute left-3 transition-all duration-150 pointer-events-none ${
          isActive ? '-top-2 text-xs bg-white px-1 rounded' : 'top-1/2 -translate-y-1/2 text-gray-400'
        }`}
        style={{ fontFamily: 'Poppins', color: isActive ? '#0B5858' : undefined }}
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onChange={handleChange}
        onPaste={handlePaste}
        inputMode={inputMode}
        onKeyDown={(e) => {
          if (preventLeadingSpace && e.key === ' ' && (!value || value.length === 0)) {
            e.preventDefault();
            return;
          }
          if (inputProps?.onKeyDown) inputProps.onKeyDown(e as any);
        }}
        {...inputProps}
        className={`w-full py-3 pl-3 pr-3 border rounded-xl transition-all duration-150 ${
          isActive ? 'border-transparent ring-2 ring-[#549F74]' : 'border-gray-300'
        } focus:outline-none text-xs sm:text-sm md:text-base`}
        style={{ fontFamily: 'Poppins', fontWeight: 400 }}
      />
    </div>
  );
};

const FloatingDateParts: React.FC<{
  id: string;
  label: string;
  valueYMD?: string;
  onChange: (ymd: string) => void;
  allowFuture?: boolean;
}> = ({ id, label, valueYMD = '', onChange, allowFuture = false }) => {
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [year, setYear] = useState<string>('');

  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthRef = useRef<HTMLDivElement | null>(null);

  const currentYear = new Date().getFullYear();
  const months = useMemo(() => ['01','02','03','04','05','06','07','08','09','10','11','12'], []);

  const maxDayForMonthYear = useMemo(() => {
    const yNum = parseInt(year || String(currentYear), 10);
    const mNum = parseInt(month || '1', 10);
    if (!Number.isFinite(yNum) || !Number.isFinite(mNum) || mNum < 1 || mNum > 12) return 31;
    return new Date(yNum, mNum, 0).getDate();
  }, [month, year, currentYear]);

  const lastAppliedPropRef = useRef<string>('');

  useEffect(() => {
    if (valueYMD && /^\d{4}-\d{2}-\d{2}$/.test(valueYMD)) {
      if (valueYMD === lastAppliedPropRef.current) return;
      const [y, m, d] = valueYMD.split('-');
      setYear((prev) => (prev === y ? prev : y));
      setMonth((prev) => (prev === m ? prev : m));
      setDay((prev) => (prev === d ? prev : d));
      lastAppliedPropRef.current = valueYMD;
      return;
    }

    if (!valueYMD) {
      if (year || month || day) {
        setYear('');
        setMonth('');
        setDay('');
      }
      lastAppliedPropRef.current = '';
    }
  }, [valueYMD]);

  useEffect(() => {
    if (!month || !day || !year) return;

    const yNum = parseInt(year, 10);
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (!Number.isFinite(yNum) || !Number.isFinite(mNum) || !Number.isFinite(dNum)) return;
    if (mNum < 1 || mNum > 12) return;

    const maxDay = new Date(yNum, mNum, 0).getDate();
    if (dNum < 1 || dNum > maxDay) return;

    const candidate = new Date(yNum, mNum - 1, dNum);
    if (!allowFuture) {
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (candidate.getTime() > todayOnly.getTime()) return;
    }

    const ymd = `${String(yNum).padStart(4, '0')}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;

    if (valueYMD !== ymd) {
      lastAppliedPropRef.current = ymd;
      onChange(ymd);
    }
  }, [month, day, year, allowFuture, onChange, valueYMD]);

  useEffect(() => {
    if (!day) return;
    const maxDay = maxDayForMonthYear;
    const dNum = parseInt(day, 10);
    if (Number.isFinite(dNum) && dNum > maxDay) {
      setDay(String(maxDay).padStart(2, '0'));
    }
  }, [month, year, maxDayForMonthYear, day]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!monthRef.current) return;
      if (!monthRef.current.contains(e.target as Node)) setShowMonthDropdown(false);
    };
    if (showMonthDropdown) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showMonthDropdown]);

  return (
    <div
      className="relative border border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-300 focus-within:ring-2"
      style={{
        borderColor: 'rgb(209 213 219)',
        '--tw-ring-color': '#549F74',
      } as React.CSSProperties}
    >
      <div className="grid items-center px-1" style={{ gridTemplateColumns: '41.6667% 25% 41.6667%' }}>
        <div className="relative month-dropdown" ref={monthRef}>
          <div
            className="flex items-center justify-between py-3 pl-4 pr-3 cursor-pointer rounded-l-xl"
            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
            role="button"
            aria-haspopup="listbox"
            aria-expanded={showMonthDropdown}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowMonthDropdown(s => !s);
              }
            }}
            style={{ fontFamily: 'Poppins' }}
          >
            <span className={`${month ? 'text-black' : 'text-gray-500'}`} style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
              {month || 'MM'}
            </span>
            <img src="/dropdown_icon.svg" alt="dropdown" className="h-5 w-5 opacity-90" />
          </div>

          {showMonthDropdown && (
            <div className="absolute top-full left-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-full max-h-48 overflow-y-auto">
              {months.map((m) => (
                <div
                  key={m}
                  className="flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMonth(m);
                    setShowMonthDropdown(false);
                  }}
                >
                  <span className="text-sm" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
                    {m}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 h-7 w-px bg-gray-300" style={{ left: '44%' }} />

        <div>
          <input
            id={`${id}-day`}
            value={day}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              const v = raw.slice(0, 2);
              // preserve partial entries (e.g. "1" => "1")
              setDay(v);
            }}
            inputMode="numeric"
            maxLength={2}
            placeholder="DD"
            autoComplete="off"
            className="w-full py-3 pl-4 pr-2 text-left focus:outline-none bg-transparent"
            style={{ fontFamily: 'Poppins', fontWeight: 400 }}
            aria-label={`${label} day`}
          />
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 h-7 w-px bg-gray-300" style={{ left: '66.6667%' }} />

        <div>
          <input
            id={`${id}-year`}
            value={year}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setYear(v);
            }}
            inputMode="numeric"
            maxLength={4}
            placeholder="YYYY"
            autoComplete="off"
            className="w-full py-3 pl-4 pr-4 text-left rounded-r-xl focus:outline-none bg-transparent"
            style={{ fontFamily: 'Poppins', fontWeight: 400 }}
            aria-label={`${label} year`}
          />
        </div>
      </div>
    </div>
  );
};

const PhoneInput: React.FC<{
  id: string;
  label: string;
  value: string;
  setValue: (v: string) => void;
  maxDigits?: number;
}> = ({ id, label, value, setValue, maxDigits }) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const countries = [
    { code: '+63', name: 'Philippines', flag: '🇵🇭' },
    { code: '+1', name: 'United States', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+81', name: 'Japan', flag: '🇯🇵' },
    { code: '+86', name: 'China', flag: '🇨🇳' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+39', name: 'Italy', flag: '🇮🇹' },
  ];

  const formatPhoneNumber = (digits: string, countryCode: string) => {
    const d = digits.replace(/\D/g, '');
    if (countryCode === '+63' || countryCode === '+1') {
      return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3').trim();
    } else if (countryCode === '+44') {
      return d.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3').trim();
    } else if (countryCode === '+81' || countryCode === '+86') {
      return d.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3').trim();
    } else if (countryCode === '+91') {
      return d.replace(/(\d{5})(\d{5})/, '$1 $2').trim();
    } else if (countryCode === '+61') {
      return d.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3').trim();
    } else if (countryCode === '+49') {
      return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3').trim();
    } else if (countryCode === '+33') {
      return d.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5').trim();
    } else if (countryCode === '+39') {
      return d.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3').trim();
    }
    return d;
  };

  const parseStored = (stored: string) => {
    if (!stored) return { code: '+63', rest: '' };
    const m = stored.match(/^(\+\d{1,3})\s*(.*)$/);
    if (m) return { code: m[1], rest: m[2].replace(/\D/g, '') };
    return { code: '+63', rest: stored.replace(/\D/g, '') };
  };

  const initial = parseStored(value);
  const [countryCode, setCountryCode] = useState<string>(initial.code);
  const [rawDigits, setRawDigits] = useState<string>(initial.rest.slice(0, maxDigits ?? initial.rest.length));

  useEffect(() => {
    const digits = maxDigits ? rawDigits.slice(0, maxDigits) : rawDigits;
    const formatted = formatPhoneNumber(digits, countryCode);
    const combined = formatted ? `${countryCode} ${formatted}` : '';
    if (combined !== value) setValue(combined);
  }, [countryCode, rawDigits, maxDigits, setValue, value]);

  useEffect(() => {
    const parsed = parseStored(value);
    if (parsed.code !== countryCode) setCountryCode(parsed.code);
    const trimmed = parsed.rest.slice(0, maxDigits ?? parsed.rest.length);
    if (trimmed !== rawDigits) setRawDigits(trimmed);
  }, [value, maxDigits]);

  useEffect(() => {
    if (typeof maxDigits === 'number' && rawDigits.length > maxDigits) {
      const trimmed = rawDigits.slice(0, maxDigits);
      setRawDigits(trimmed);
      const formatted = formatPhoneNumber(trimmed, countryCode);
      const combined = formatted ? `${countryCode} ${formatted}` : '';
      if (combined !== value) setValue(combined);
    }
  }, [maxDigits]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setShowCountryDropdown(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const labelActive = isFocused || rawDigits.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      {labelActive && (
        <label className="absolute left-3 -top-2 text-xs bg-white px-1 rounded" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>
          {label}
        </label>
      )}

      <div className={`rounded-xl bg-white flex items-center border px-1 ${labelActive ? 'border-transparent ring-2 ring-[#549F74]' : 'border-gray-300'}`}>
        <div className="relative country-dropdown">
          <button
            type="button"
            onClick={() => setShowCountryDropdown(s => !s)}
            className="flex items-center gap-2 py-2 sm:py-3 pl-3 pr-3 rounded-l-xl text-gray-700 text-xs sm:text-sm"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 120)}
            aria-haspopup="listbox"
            aria-expanded={showCountryDropdown}
            style={{ fontFamily: 'Poppins' }}
          >
            <span className="text-sm">{countryCode}</span>
            <svg className="w-3 h-3 opacity-80" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.354a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z" />
            </svg>
          </button>

          {showCountryDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-48 sm:w-56 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg text-xs sm:text-sm">
              {countries.map(c => (
                <div
                  key={c.code}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCountryCode(c.code);
                    setShowCountryDropdown(false);
                    const digits = maxDigits ? rawDigits.slice(0, maxDigits) : rawDigits;
                    const formatted = formatPhoneNumber(digits, c.code);
                    const combined = formatted ? `${c.code} ${formatted}` : '';
                    if (combined !== value) setValue(combined);
                  }}
                  style={{ fontFamily: 'Poppins' }}
                >
                  <span className="text-lg">{c.flag}</span>
                  <div className="text-sm">
                    <div style={{ fontFamily: 'Poppins', fontWeight: 500 }}>{c.name}</div>
                    <div className="text-xs text-gray-500">{c.code}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-7 w-px bg-gray-200 mx-2" />

        <input
          id={id}
          type="text"
          value={formatPhoneNumber(rawDigits, countryCode)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            const limited = typeof maxDigits === 'number' ? digits.slice(0, maxDigits) : digits;
            setRawDigits(limited);
            const formatted = formatPhoneNumber(limited, countryCode);
            const combined = formatted ? `${countryCode} ${formatted}` : '';
            if (combined !== value) setValue(combined);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          placeholder={labelActive ? '' : 'Enter phone number'}
          className="flex-1 py-2 sm:py-3 pl-2 pr-4 focus:outline-none text-xs sm:text-sm"
          inputMode="tel"
          style={{ fontFamily: 'Poppins' }}
          aria-label="Phone number"
        />
      </div>
    </div>
  );
};

/** Classifications for guest age/type — used for per-pax tracking */
const GUEST_CLASSIFICATIONS: { value: GuestEntry['classification']; label: string; color: string }[] = [
  { value: 'Adult', label: 'Adult (18-59)', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'Senior', label: 'Senior (60+)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'Child', label: 'Child (2-17)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'Infant', label: 'Infant (0-1)', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'PWD', label: 'PWD', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

/**
 * GuestListSection — allows adding per-pax guest info with age/type classification.
 * The primary guest is auto-included from the client info above.
 */
const GuestListSection: React.FC<{
  guestList: GuestEntry[];
  onUpdateGuestList: (list: GuestEntry[]) => void;
  primaryGuestName: string;
}> = ({ guestList, onUpdateGuestList, primaryGuestName }) => {
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestClassification, setNewGuestClassification] = useState<GuestEntry['classification']>('Adult');

  /* Auto-add primary guest as first entry if not already present */
  useEffect(() => {
    if (primaryGuestName && guestList.length === 0) {
      onUpdateGuestList([{ id: 'primary', name: primaryGuestName, classification: 'Adult' }]);
    }
  }, [primaryGuestName]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Keep primary guest name in sync */
  useEffect(() => {
    if (primaryGuestName && guestList.length > 0 && guestList[0].id === 'primary' && guestList[0].name !== primaryGuestName) {
      const updated = [...guestList];
      updated[0] = { ...updated[0], name: primaryGuestName };
      onUpdateGuestList(updated);
    }
  }, [primaryGuestName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddGuest = () => {
    const name = newGuestName.trim();
    if (!name) return;
    const entry: GuestEntry = { id: `guest-${Date.now()}`, name, classification: newGuestClassification };
    onUpdateGuestList([...guestList, entry]);
    setNewGuestName('');
    setNewGuestClassification('Adult');
  };

  const handleRemoveGuest = (id: string) => {
    if (id === 'primary') return; // can't remove primary guest
    onUpdateGuestList(guestList.filter(g => g.id !== id));
  };

  const handleClassificationChange = (id: string, classification: GuestEntry['classification']) => {
    onUpdateGuestList(guestList.map(g => g.id === id ? { ...g, classification } : g));
  };

  const classificationColorMap = Object.fromEntries(GUEST_CLASSIFICATIONS.map(c => [c.value, c.color]));

  const guestCounts = guestList.reduce((acc, g) => {
    acc[g.classification] = (acc[g.classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm mt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[#0B5858]" style={{ fontFamily: 'Poppins' }}>
            Guest List (Per Pax)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>
            Add all guests staying at the property with their age classification
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {Object.entries(guestCounts).map(([cls, count]) => (
            <span key={cls} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${classificationColorMap[cls] || 'bg-gray-100 text-gray-700'}`}>
              {count} {cls}
            </span>
          ))}
        </div>
      </div>

      {/* Guest table */}
      {guestList.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
          <table className="w-full text-sm" style={{ fontFamily: 'Poppins' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Guest Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Classification</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guestList.map((guest, i) => (
                <tr key={guest.id} className={guest.id === 'primary' ? 'bg-[#0B5858]/5' : ''}>
                  <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">{guest.name}</span>
                      {guest.id === 'primary' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B5858] text-white font-medium">Primary</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={guest.classification}
                      onChange={(e) => handleClassificationChange(guest.id, e.target.value as GuestEntry['classification'])}
                      className="text-xs sm:text-sm px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B5858] focus:border-transparent bg-white"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {GUEST_CLASSIFICATIONS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {guest.id !== 'primary' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(guest.id)}
                        className="p-1 text-[#B84C4C] hover:bg-[#B84C4C]/10 rounded transition-colors cursor-pointer"
                        aria-label="Remove guest"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add guest form */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Guest Name</label>
          <input
            type="text"
            value={newGuestName}
            onChange={(e) => setNewGuestName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGuest(); } }}
            placeholder="Enter guest name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74]"
            style={{ fontFamily: 'Poppins' }}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="block text-xs font-medium text-gray-600 mb-1" style={{ fontFamily: 'Poppins' }}>Type</label>
          <select
            value={newGuestClassification}
            onChange={(e) => setNewGuestClassification(e.target.value as GuestEntry['classification'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#549F74] bg-white"
            style={{ fontFamily: 'Poppins' }}
          >
            {GUEST_CLASSIFICATIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddGuest}
          disabled={!newGuestName.trim()}
          className="px-4 py-2 bg-[#0B5858] text-white rounded-lg text-sm font-medium hover:bg-[#094b4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          style={{ fontFamily: 'Poppins' }}
        >
          + Add Guest
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-2" style={{ fontFamily: 'Poppins' }}>
        Total guests: {guestList.length} — The primary guest is auto-filled from the client information above.
      </p>
    </div>
  );
};

const ClientInfoStep: React.FC<ClientInfoStepProps> = ({ formData, listingId, listing, onUpdate, onUpdateField, onNext, onBack, onCancel }) => {
  const updateField = (k: keyof BookingFormData, v: any) => {
    if (typeof onUpdateField === 'function') {
      try {
        onUpdateField(k, v);
      } catch {
        onUpdate({ [k]: v });
      }
    } else {
      onUpdate({ [k]: v });
    }
  };

  const sanitizeName = (input: string) => {
    const cleaned = input.replace(/[^\p{L}\s'-]/gu, '');
    return collapseSpacesTrim(cleaned);
  };

  const sanitizeGeneric = (input: string) => {
    const cleaned = input.replace(/[^\p{L}\p{N}\s\.'-]/gu, '');
    return collapseSpacesTrim(cleaned);
  };

  const isValidEmail = (email: string) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  const dob = formData.dateOfBirth ?? '';
  const handleDobChange = (ymd: string) => updateField('dateOfBirth', ymd);

  const age = useMemo<number | null>(() => {
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    const [y, m, d] = dob.split('-').map((s) => parseInt(s, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const birth = new Date(y, m - 1, d);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let computedAge = today.getFullYear() - birth.getFullYear();
    const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (today < thisYearBirthday) computedAge--;
    return computedAge;
  }, [dob]);

  const isUnder18 = age !== null && age < 18;

  const [under18NotifDismissed, setUnder18NotifDismissed] = useState(false);
  useEffect(() => {
    setUnder18NotifDismissed(false);
  }, [dob]);

  const emailInvalid = (formData.email ?? '').trim().length > 0 && !isValidEmail(formData.email ?? '');

  const isFormValid = useMemo(() => {
    return !!(
      (formData.firstName ?? '').trim() &&
      (formData.lastName ?? '').trim() &&
      (formData.email ?? '').trim() &&
      (formData.preferredContactNumber ?? '').trim() &&
      (formData.gender ?? '').trim() &&
      (dob ? age !== null && age >= 18 : true)
    );
  }, [formData, dob, age]);

  return (
    <div className="p-4 sm:p-6 pb-16 md:pb-6 text-xs sm:text-sm md:text-base" style={{ fontFamily: 'Poppins' }}>
      <div className="max-w-6xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-bold text-[#0B5858] mb-1">Client Information</h2>
      <p className="text-xs sm:text-sm text-gray-500 mb-4">Please fill in your client details to continue</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
      {isUnder18 && !under18NotifDismissed && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 flex items-start justify-between" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.68-1.36 3.445 0l5.518 9.814c.75 1.334-.213 2.987-1.722 2.987H4.462c-1.51 0-2.472-1.653-1.722-2.987L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-9a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">
              <div className="font-medium text-red-800">Booking not allowed</div>
              <div className="text-xs text-red-700">Client must be at least 18 years old to book.</div>
            </div>
          </div>

          <button type="button" onClick={() => setUnder18NotifDismissed(true)} aria-label="Dismiss notification" className="text-red-600 hover:text-red-800 p-1" style={{ fontFamily: 'Poppins' }}>
            ✕
          </button>
        </div>
      )}

      <div className="border border-[#E6F5F4] rounded-lg p-3 sm:p-4 bg-white shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FloatingInput
            id="firstName"
            label="First Name *"
            value={formData.firstName ?? ''}
            setValue={(v) => updateField('firstName', v)}
            preventLeadingSpace
            sanitizeOnBlur={(v) => (v === '' ? '' : sanitizeName(v))}
          />
          <FloatingInput
            id="lastName"
            label="Last Name *"
            value={formData.lastName ?? ''}
            setValue={(v) => updateField('lastName', v)}
            preventLeadingSpace
            sanitizeOnBlur={(v) => (v === '' ? '' : sanitizeName(v))}
          />
          <div>
            <FloatingInput
              id="email"
              label="Email *"
              type="email"
              value={formData.email ?? ''}
              setValue={(v) => updateField('email', v.replace(/\s+/g, ''))}
              preventLeadingSpace
            />
            {emailInvalid && (
              <div className="mt-1 text-xs text-yellow-700" style={{ fontFamily: 'Poppins' }}>
                Please enter a valid email (e.g., name@gmail.com). This is a notification only.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FloatingInput
            id="nickname"
            label="Nickname"
            value={formData.nickname ?? ''}
            setValue={(v) => updateField('nickname', v)}
            preventLeadingSpace
            sanitizeOnBlur={(v) => (v === '' ? '' : sanitizeGeneric(v))}
          />

          <div>
            <label className="sr-only">Date of Birth</label>
            <FloatingDateParts id="dateOfBirth" label="Date of Birth" valueYMD={dob} onChange={handleDobChange} allowFuture={false} />
            <div className="mt-2 text-xs sm:text-sm">
              {dob && age === null && <div className="text-yellow-700" style={{ fontFamily: 'Poppins' }}>Please provide a valid date.</div>}
            </div>
          </div>

          <FloatingInput
            id="referredBy"
            label="Referred by"
            value={formData.referredBy ?? ''}
            setValue={(v) => updateField('referredBy', v)}
            preventLeadingSpace
            sanitizeOnBlur={(v) => (v === '' ? '' : sanitizeGeneric(v))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">Gender *</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('gender', option.value)}
                  className={`px-3 py-2 rounded-full border transition-colors text-sm ${
                    (formData.gender === option.value) ? 'border-[#0B5858] bg-[#0B5858] text-white' : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                  style={{ fontFamily: 'Poppins' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <PhoneInput
              id="preferredContactNumber"
              label="Preferred Contact Number"
              value={formData.preferredContactNumber ?? ''}
              setValue={(v) => updateField('preferredContactNumber', v)}
              maxDigits={formData.contactType === 'mobile' ? 10 : undefined}
            />

            <div className="flex flex-wrap gap-4 mt-3 items-center">
              {[
                { value: 'home', label: 'Home' },
                { value: 'mobile', label: 'Mobile' },
                { value: 'work', label: 'Work' }
              ].map((option) => (
                <label key={option.value} className="flex items-center text-sm">
                  <input type="radio" name="contactType" value={option.value} checked={formData.contactType === option.value} onChange={() => updateField('contactType', option.value)} className="w-4 h-4 text-[#0B5858] border-gray-300 focus:ring-[#0B5858]" />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-Pax Guest List ─────────────────────────────────────────── */}
      <GuestListSection
        guestList={(formData as any).guestList ?? []}
        onUpdateGuestList={(list) => updateField('guestList' as keyof BookingFormData, list)}
        primaryGuestName={`${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim()}
      />

      <div className="hidden lg:flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
        <button onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm" style={{ fontFamily: 'Poppins' }}>
          Cancel
        </button>
        <button onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm" style={{ fontFamily: 'Poppins' }}>
          Back
        </button>
        <button onClick={onNext} disabled={!isFormValid || isUnder18} className="px-6 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm" style={{ fontFamily: 'Poppins' }}>
          Next
        </button>
      </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 lg:self-start flex flex-col gap-4">
            <BookingSummarySidebar formData={formData} listingId={listingId} listing={listing} />
            <NeedHelpCard />
          </div>
        </aside>
      </div>
      </div>

      <div
        className="fixed left-0 right-0 bottom-0 bg-white border-t border-gray-200 p-3 lg:hidden"
        role="region"
        aria-label="Client actions"
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
            onClick={onBack}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            style={{ fontFamily: 'Poppins' }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!isFormValid || isUnder18}
            className="flex-1 px-3 py-2 bg-[#0B5858] text-white rounded-lg hover:bg-[#0a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ fontFamily: 'Poppins' }}
            aria-disabled={!isFormValid || isUnder18}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoStep;