'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const FloatingInput: React.FC<{
  id: string;
  label: string;
  type?: string;
  value: string;
  setValue: (v: string) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  floating?: boolean;
}> = ({ id, label, type = 'text', value, setValue, leftIcon, rightIcon, inputMode, pattern, floating = true }) => {
  const labelLeftClass = leftIcon ? 'left-12' : 'left-4';
  const inputPaddingLeft = leftIcon ? 'pl-12' : 'pl-4';
  const inputPaddingRight = rightIcon ? 'pr-12' : 'pr-4';

  if (!floating) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center z-10" style={{ backgroundColor: '#0B5858' }}>
            {leftIcon}
          </div>
        )}
        <label htmlFor={id} className="block mb-1 text-sm text-gray-600 text-left" style={{ fontFamily: 'Poppins' }}>
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode={inputMode}
          pattern={pattern}
          className={`w-full py-3 ${inputPaddingLeft} ${inputPaddingRight} text-left border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-400 hover:shadow-md`}
          style={{ fontFamily: 'Poppins', fontWeight: 400, '--tw-ring-color': '#549F74' } as React.CSSProperties}
        />
      </div>
    );
  }

  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || (value != null && String(value).length > 0);

  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center z-10" style={{ backgroundColor: '#0B5858' }}>
          {leftIcon}
        </div>
      )}
      <label
        htmlFor={id}
        className={`absolute ${labelLeftClass} transition-all duration-200 pointer-events-none text-left ${
          isActive ? '-top-2 text-xs bg-white px-1 rounded' : 'top-1/2 -translate-y-1/2 text-gray-500'
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
        onBlur={() => setIsFocused(false)}
        onChange={(e) => setValue(e.target.value)}
        inputMode={inputMode}
        pattern={pattern}
        className={`w-full py-3 ${inputPaddingLeft} ${inputPaddingRight} text-left border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-400 hover:shadow-md`}
        style={{ fontFamily: 'Poppins', fontWeight: 400, '--tw-ring-color': '#549F74' } as React.CSSProperties}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
          {rightIcon}
        </div>
      )}
    </div>
  );
};

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [success, setSuccess] = useState(false);

  // Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState('');
  const [street, setStreet] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Account Setup
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('+63');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryButtonRef = useRef<HTMLButtonElement>(null);
  const [countryDropdownPosition, setCountryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const countries = [
    { code: '+63', name: 'Philippines', flag: '🇵🇭' },
    { code: '+1',  name: 'United States', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+81', name: 'Japan', flag: '🇯🇵' },
    { code: '+86', name: 'China', flag: '🇨🇳' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
    { code: '+39', name: 'Italy', flag: '🇮🇹' },
  ];

  const formatPhoneNumber = (value: string, code: string) => {
    const digits = value.replace(/\D/g, '');
    if (code === '+63' || code === '+1' || code === '+49' || code === '+39') {
      return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    } else if (code === '+44' || code === '+61') {
      return digits.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    } else if (code === '+81' || code === '+86') {
      return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
    } else if (code === '+91') {
      return digits.replace(/(\d{5})(\d{5})/, '$1 $2');
    } else if (code === '+33') {
      return digits.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return digits;
  };

  useEffect(() => {
    if (phone) setPhone(formatPhoneNumber(phone, countryCode));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  useEffect(() => {
    if (showCountryDropdown && countryButtonRef.current) {
      const rect = countryButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 256;
      let leftPosition = rect.left + window.scrollX;
      if (leftPosition + dropdownWidth > window.innerWidth) {
        leftPosition = rect.right + window.scrollX - dropdownWidth;
      }
      if (leftPosition < 0) leftPosition = 8;
      setCountryDropdownPosition({ top: rect.bottom + window.scrollY + 4, left: leftPosition, width: dropdownWidth });
    }
  }, [showCountryDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showMonthDropdown && monthDropdownRef.current && !monthDropdownRef.current.contains(target)) setShowMonthDropdown(false);
      if (showGenderDropdown && genderDropdownRef.current && !genderDropdownRef.current.contains(target)) setShowGenderDropdown(false);
      if (showCountryDropdown && countryDropdownRef.current && !countryDropdownRef.current.contains(target)) setShowCountryDropdown(false);
    };
    if (showCountryDropdown || showMonthDropdown || showGenderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showCountryDropdown, showMonthDropdown, showGenderDropdown]);

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);
  const isPasswordMatch = password === confirmPassword && confirmPassword.length > 0;

  const isStep1Valid = useMemo(() => {
    const dayNum = Number(birthDay);
    const yearNum = Number(birthYear);
    const currentYear = new Date().getFullYear();
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !!birthMonth &&
      Number.isFinite(dayNum) && dayNum >= 1 && dayNum <= 31 &&
      Number.isFinite(yearNum) && yearNum >= 1900 && yearNum <= currentYear &&
      gender.trim().length > 0 &&
      street.trim().length > 0 &&
      barangay.trim().length > 0 &&
      city.trim().length > 0 &&
      /^\d{4,}$/.test(zipCode.trim())
    );
  }, [firstName, lastName, birthMonth, birthDay, birthYear, gender, street, barangay, city, zipCode]);

  const isStep2Valid = useMemo(() => {
    return (
      /.+@.+\..+/.test(email.trim()) &&
      phone.trim().length >= 7 &&
      password.length >= 6 &&
      password === confirmPassword
    );
  }, [email, phone, password, confirmPassword]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Valid) { setError('Please complete all required fields in Personal Info.'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid || loading) return;
    setLoading(true);
    setError('');

    // Mock: simulate network delay then show success
    await new Promise(res => setTimeout(res, 1200));
    setLoading(false);
    setSuccess(true);

    setTimeout(() => { router.push('/login'); }, 2500);
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    margin: 0,
    padding: '4px 0',
    border: '1px solid rgba(11, 88, 88, 0.12)',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 18px 30px rgba(11, 88, 88, 0.08), 0 6px 12px rgba(15, 23, 42, 0.04)',
    zIndex: 9999,
  };

  const dropdownListStyle: React.CSSProperties = {
    maxHeight: '200px',
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
  };

  const dropdownItemClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-2 px-3 py-2.5 h-10 text-[14px] transition ${
      selected ? 'bg-[rgba(11,88,88,0.11)] text-[#0B5858]' : 'text-[#111827] hover:bg-[rgba(11,88,88,0.06)]'
    }`;

  const CheckIcon = () => (
    <svg className="w-4 h-4 text-[#0B5858]" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );

  const ChevronIcon = ({ open }: { open: boolean }) => (
    <span className={`ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 text-[#0B5858] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
      <svg style={{ width: 18, height: 18 }} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
      </svg>
    </span>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative" style={{ backgroundColor: '#0B5858' }}>
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat z-0" style={{ backgroundImage: "url('/bg.svg')" }} />

      {/* Success Overlay */}
      {success && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ backgroundColor: 'rgba(11,88,88,0.85)' }}>
          <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col items-center max-w-sm w-full mx-4 animate-fade-in">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#0B5858' }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-center mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>Registration Successful!</h3>
            <p className="text-gray-500 text-center text-sm" style={{ fontFamily: 'Poppins' }}>
              Your account has been created. Redirecting you to login&hellip;
            </p>
            <div className="mt-6 flex space-x-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#0B5858', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="flex-1 relative overflow-hidden z-10 hidden lg:block">
        <div className="relative z-10 p-12 h-full flex flex-col">
          <div className="pt-8 mb-16 ml-13">
            <Link href="/" className="block">
              <img src="/logo.svg" alt="Kelsey's Homestay" className="h-24 w-auto hover:opacity-80 transition-opacity" />
            </Link>
          </div>
          <div className="mb-6 ml-16 mt-16">
            <h1 className="text-white text-6xl mb-2" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
              Hello,<br />
              <span className="text-yellow-400" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>welcome!</span>
            </h1>
          </div>
          <div className="ml-16">
            <p className="text-white text-3xl" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
              A welcoming stay, the Kelsey&apos;s way
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-lg flex-1 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="lg:hidden pb-4 flex justify-center">
            <Link href="/" className="block">
              <img src="/logo.png" alt="Kelsey's Homestay" className="h-20 sm:h-24 w-auto hover:opacity-80 transition-opacity" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10">
            <h2 className="text-black text-center text-2xl sm:text-3xl mb-2 animate-fade-in" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
              Create an Account
            </h2>
            <p className="text-gray-600 text-center text-sm mb-6 sm:mb-8 animate-fade-in" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
              Already have an account?{' '}
              <Link href="/login" className="underline cursor-pointer" style={{ color: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>
                Log In
              </Link>
            </p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6 sm:mb-8 animate-fade-in">
              <div className="flex items-center relative">
                <div className="flex flex-col items-center relative z-10 mr-4 sm:mr-8">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    step === 1 ? 'border-teal-600 bg-teal-50' : 'border-teal-600 bg-teal-600'
                  }`}>
                    {step > 1 ? (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold text-teal-600">1</span>
                    )}
                  </div>
                  <span className="text-xs mt-1 sm:mt-2 font-medium whitespace-nowrap text-teal-600">Personal Info</span>
                </div>

                <div className={`absolute h-0.5 w-8 sm:w-16 transition-all duration-300 ${step > 1 ? 'bg-teal-600' : 'bg-gray-300'}`}
                  style={{ left: '50%', top: 'calc(50% - 12px)', transform: 'translate(-50%, -50%)' }}
                />

                <div className="flex flex-col items-center relative z-10 ml-4 sm:ml-8">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    step === 2 ? 'border-teal-600 bg-teal-50' : 'border-gray-300 bg-white'
                  }`}>
                    <span className={`text-xs font-semibold ${step === 2 ? 'text-teal-600' : 'text-gray-400'}`}>2</span>
                  </div>
                  <span className={`text-xs mt-1 sm:mt-2 font-medium whitespace-nowrap ${step === 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                    Account Setup
                  </span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl text-sm" style={{ fontFamily: 'Poppins' }}>
                {error}
              </div>
            )}

            <div className="relative">
              {/* Step 1 — Personal Info */}
              {step === 1 ? (
                <form onSubmit={handleContinue} className="space-y-4 sm:space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-[18px]">
                    <FloatingInput id="firstName" label="First Name" value={firstName} setValue={setFirstName} />
                    <FloatingInput id="lastName" label="Last Name" value={lastName} setValue={setLastName} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-[18px]">
                    {/* Birth Date */}
                    <div
                      className="relative border border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-300 focus-within:ring-2"
                      style={{ '--tw-ring-color': '#549F74' } as React.CSSProperties}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 0 0 2px #549F74'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgb(209 213 219)'; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div className="grid items-stretch" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                        {/* Month */}
                        <div ref={monthDropdownRef} className="relative border-r border-gray-300">
                          <button
                            type="button"
                            className="flex items-center justify-between py-3 px-3 cursor-pointer outline-none bg-transparent w-full h-full"
                            style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400 }}
                            onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                          >
                            <span className={birthMonth ? 'text-slate-900' : 'text-gray-500'}>{birthMonth || 'MM'}</span>
                            <ChevronIcon open={showMonthDropdown} />
                          </button>
                          {showMonthDropdown && (
                            <div className="absolute top-full left-0 mt-1 z-[9999] w-full" style={dropdownMenuStyle}
                              onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                              <div style={dropdownListStyle} onWheel={e => e.stopPropagation()}>
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                                  <button key={m} type="button"
                                    className={dropdownItemClass(birthMonth === m)}
                                    style={{ fontFamily: 'Poppins', fontWeight: 400, minHeight: '40px' }}
                                    onClick={e => { e.stopPropagation(); setBirthMonth(m); setShowMonthDropdown(false); }}>
                                    <span>{m}</span>
                                    {birthMonth === m && <CheckIcon />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Day */}
                        <div className="border-r border-gray-300 flex items-center">
                          <input id="birthDay" value={birthDay}
                            onChange={e => setBirthDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            inputMode="numeric" maxLength={2} placeholder="DD" autoComplete="off"
                            className="w-full py-3 px-3 text-center focus:outline-none bg-transparent"
                            style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400 }} />
                        </div>
                        {/* Year */}
                        <div className="flex items-center">
                          <input id="birthYear" value={birthYear}
                            onChange={e => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            inputMode="numeric" maxLength={4} placeholder="YYYY" autoComplete="off"
                            className="w-full py-3 px-3 text-center focus:outline-none bg-transparent"
                            style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400 }} />
                        </div>
                      </div>
                    </div>

                    {/* Gender */}
                    <div ref={genderDropdownRef} className="relative">
                      <button type="button"
                        className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-shadow duration-150 outline-none bg-white text-slate-800 border-[#d1d5db] hover:shadow-sm cursor-pointer ${showGenderDropdown ? 'ring-2 ring-offset-2 border-transparent' : ''}`}
                        style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400, '--tw-ring-color': '#549F74' } as React.CSSProperties}
                        onClick={() => setShowGenderDropdown(!showGenderDropdown)}>
                        <span className={gender ? 'text-slate-900' : 'text-gray-500'}>{gender || 'Select gender'}</span>
                        <ChevronIcon open={showGenderDropdown} />
                      </button>
                      {showGenderDropdown && (
                        <div className="absolute top-full left-0 mt-1 z-[9999] w-full" style={dropdownMenuStyle}
                          onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                          <div style={dropdownListStyle} onWheel={e => e.stopPropagation()}>
                            {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                              <button key={g} type="button"
                                className={dropdownItemClass(gender === g)}
                                style={{ fontFamily: 'Poppins', fontWeight: 400 }}
                                onClick={e => { e.stopPropagation(); setGender(g); setShowGenderDropdown(false); }}>
                                <span>{g}</span>
                                {gender === g && <CheckIcon />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-[18px]">
                    <FloatingInput id="street" label="Street" value={street} setValue={setStreet} />
                    <FloatingInput id="barangay" label="Barangay" value={barangay} setValue={setBarangay} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-[18px]">
                    <FloatingInput id="city" label="City" value={city} setValue={setCity} />
                    <FloatingInput id="zip" label="ZIP Code" value={zipCode}
                      setValue={v => setZipCode(v.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" />
                  </div>

                  <button type="submit" disabled={!isStep1Valid}
                    className="w-full py-3 px-4 rounded-3xl text-white text-base sm:text-lg transition-all duration-300 hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>
                    Save and Continue
                  </button>
                </form>
              ) : (
                /* Step 2 — Account Setup */
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fade-in">
                  <FloatingInput id="email" label="Email" type="email" value={email} setValue={setEmail} />

                  {/* Phone Number */}
                  <div className="relative" style={{ overflow: 'visible' }}>
                    <div
                      className="flex border border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-md transition-all duration-300 focus-within:ring-2"
                      style={{ '--tw-ring-color': '#549F74', overflow: 'visible' } as React.CSSProperties}
                      onFocus={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 0 0 2px #549F74'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgb(209 213 219)'; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div ref={countryDropdownRef} className="relative border-r border-[#d1d5db]" style={{ overflow: 'visible', zIndex: 9999 }}>
                        <button ref={countryButtonRef} type="button"
                          className="flex items-center justify-between py-3 pl-4 pr-3 cursor-pointer rounded-l-xl outline-none bg-white text-slate-800"
                          style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400, minWidth: '80px' }}
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}>
                          <span className="text-slate-900">{countryCode}</span>
                          <ChevronIcon open={showCountryDropdown} />
                        </button>

                        {/* Portal dropdown */}
                        {mounted && showCountryDropdown && ReactDOM.createPortal(
                          <div style={{
                            position: 'fixed',
                            top: `${countryDropdownPosition.top}px`,
                            left: `${countryDropdownPosition.left}px`,
                            width: `${countryDropdownPosition.width}px`,
                            padding: '4px 0',
                            border: '1px solid rgba(11, 88, 88, 0.12)',
                            borderRadius: '12px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 18px 30px rgba(11, 88, 88, 0.08), 0 6px 12px rgba(15, 23, 42, 0.04)',
                            zIndex: 99999,
                          }}
                            onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                            <div style={{ ...dropdownListStyle, width: '100%' }} onWheel={e => e.stopPropagation()}>
                              {countries.map(c => (
                                <button key={c.code} type="button"
                                  className={dropdownItemClass(countryCode === c.code)}
                                  style={{ fontFamily: 'Poppins', fontWeight: 400 }}
                                  onClick={e => { e.stopPropagation(); setCountryCode(c.code); setShowCountryDropdown(false); }}>
                                  <span className="flex items-center gap-2">
                                    <span className="text-lg">{c.flag}</span>
                                    <span>{c.name} {c.code}</span>
                                  </span>
                                  {countryCode === c.code && <CheckIcon />}
                                </button>
                              ))}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>

                      <input id="phone" type="tel" value={phone}
                        onChange={e => setPhone(formatPhoneNumber(e.target.value, countryCode))}
                        placeholder="Enter phone number"
                        className="flex-1 py-3 pl-4 pr-4 rounded-r-xl focus:outline-none"
                        style={{ fontFamily: 'Poppins', fontWeight: 400 }} />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <FloatingInput id="password" label="Password" type="password" value={password} setValue={setPassword} />
                    {password && (
                      <div className="space-y-1">
                        <div className="flex space-x-1">
                          {[1,2,3,4,5,6].map(level => (
                            <div key={level} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              level <= passwordStrength
                                ? passwordStrength <= 2 ? 'bg-red-500' : passwordStrength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                                : 'bg-gray-200'
                            }`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                          {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 4 ? 'Medium' : 'Strong'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <input id="confirmPassword" type="password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      className="w-full py-3 pl-4 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 hover:border-gray-400 hover:shadow-md"
                      style={{ fontFamily: 'Poppins', fontWeight: 400, '--tw-ring-color': '#549F74' } as React.CSSProperties}
                    />
                    <label htmlFor="confirmPassword"
                      className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                        (confirmPassword || confirmFocused) ? '-top-2 text-xs bg-white px-1 rounded' : 'top-1/2 -translate-y-1/2 text-gray-500'
                      }`}
                      style={{ fontFamily: 'Poppins', color: (confirmPassword || confirmFocused) ? '#0B5858' : undefined }}>
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {isPasswordMatch ? (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500" style={{ fontFamily: 'Poppins' }}>
                    Password must be at least 6 characters and match the confirmation.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                    <button type="button" onClick={() => setStep(1)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer transition-all duration-300"
                      style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                      Back
                    </button>
                    <button type="submit" disabled={loading || !isStep2Valid}
                      className="w-full sm:w-auto py-3 px-6 rounded-3xl text-white text-base sm:text-lg transition-all duration-300 hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins', fontWeight: 600 }}>
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Creating&hellip;
                        </span>
                      ) : 'Create Account'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
