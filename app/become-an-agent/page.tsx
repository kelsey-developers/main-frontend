'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { getAgentRegistrationConfig } from '@/services/agentRegistrationService';
import { CheckCircleIcon, ArrowRightIcon, ArrowUpTrayIcon, DocumentTextIcon, UserGroupIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as SolidCheckCircleIcon } from '@heroicons/react/24/solid';

const DOMAIN = 'kelseyshomestay.com';

type Step = 'form' | 'success';

function BecomeAnAgentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const recruitedById = searchParams.get('recruitedBy') ?? '';
  const [step, setStep] = useState<Step>('form');
  const [registrationFee, setRegistrationFee] = useState(500);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    recruitedBy: recruitedById,
    feeProofFile: null as File | null,
    agreeTerms: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const config = await getAgentRegistrationConfig();
        setRegistrationFee(config.registrationFee);
      } catch (error) {
        console.error('Failed to load config', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (field: string, value: string | boolean | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.fullname.trim()) err.fullname = 'Full name is required';
    if (!form.email.includes('@')) err.email = 'Enter a valid email address';
    if (!form.phone.trim()) err.phone = 'Contact number is required';
    if (form.password.length < 8) err.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) err.confirmPassword = 'Passwords do not match';
    if (!form.agreeTerms) err.agreeTerms = 'You must agree to the terms and conditions';

    setErrors(err);

    if (Object.keys(err).length > 0) {
      const firstErrorField = Object.keys(err)[0];
      const element = document.getElementById(`field-${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setStep('success');
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] transition-all duration-200 hover:border-gray-300 placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const errorClass = "text-xs text-red-500 mt-1.5 flex items-center gap-1";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-100 border-t-[#0B5858] mb-4" />
        <p className="text-gray-500 font-medium">Preparing your application...</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4 py-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-12 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0B5858]/5 to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
              <SolidCheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Application Received!</h2>
            <p className="text-gray-600 mb-8">
              Your registration is currently <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">pending admin review</span>.
              We&apos;ll send a confirmation email once approved, usually within 1–2 business days.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 mb-8 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Application Details</h3>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm mt-0.5"><DocumentTextIcon className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p className="text-sm font-medium text-gray-900">{form.email}</p>
                </div>
              </div>
              
              {form.recruitedBy && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm mt-0.5"><UserGroupIcon className="w-4 h-4 text-gray-500" /></div>
                  <div>
                    <p className="text-xs text-gray-500">Referred By</p>
                    <p className="text-sm font-medium text-gray-900">{form.recruitedBy}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm mt-0.5"><CurrencyDollarIcon className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-500">Registration Fee</p>
                  <p className="text-sm font-medium text-gray-900">₱{registrationFee.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 text-sm font-bold text-white bg-[#0B5858] hover:bg-[#094a4a] rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              Back to Homepage
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Left Column: Brand & Info */}
        <div className="lg:w-5/12 lg:sticky lg:top-24 h-fit">
          <div className="bg-[#0B5858] rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#FACC15]/10 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <span className="inline-block py-1 px-3 rounded-full bg-white/20 text-white/90 text-xs font-semibold tracking-wider uppercase mb-6 backdrop-blur-md border border-white/10">
                Partner Program
              </span>
              
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Join our <span className="text-[#FACC15]">Agent Network</span>
              </h1>
              
              <p className="text-white/80 text-lg mb-10 leading-relaxed">
                Turn your network into net worth. Partner with Kelsey&apos;s Homestay and earn attractive commissions on every successful booking.
              </p>

              <div className="space-y-6 mb-10">
                {[
                  { icon: CurrencyDollarIcon, title: 'Earn Up To 10%', desc: 'Get competitive commission rates on all your direct referrals.' },
                  { icon: UserGroupIcon, title: 'Build Your Team', desc: 'Recruit sub-agents and earn overriding commissions from their sales.' },
                  { icon: ChartBarIcon, title: 'Real-time Tracking', desc: 'Monitor your earnings, payouts, and network growth through a dedicated dashboard.' },
                ].map((benefit, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5">
                        <benefit.icon className="w-5 h-5 text-[#FACC15]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{benefit.title}</h3>
                      <p className="text-sm text-white/70 mt-1 leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Registration Fee Box */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 relative overflow-hidden group hover:bg-white/15 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <p className="text-sm text-white/80 font-medium mb-1">One-time Registration Fee</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">₱{registrationFee.toLocaleString()}</span>
                  <span className="text-sm text-white/60 mb-1.5">PHP</span>
                </div>
                {recruitedById && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2">
                    <span className="text-xl">🤝</span>
                    <p className="text-sm text-white/80 leading-snug">
                      You were invited by <strong className="text-white bg-white/20 px-1.5 py-0.5 rounded ml-1">{recruitedById}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:w-7/12">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-10 relative">
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Application Form</h2>
              <p className="text-gray-500 text-sm mt-1">Please fill in your details accurately to speed up the approval process.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section: Personal Info */}
              <div className="space-y-5" id="field-fullname">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#0B5858]/10 text-[#0B5858] flex items-center justify-center font-bold text-sm">1</div>
                  <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                </div>

                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.fullname}
                    onChange={(e) => set('fullname', e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className={`${inputClass} ${errors.fullname ? 'border-red-300 ring-4 ring-red-50' : ''}`}
                  />
                  {errors.fullname && (
                    <p className={errorClass}>
                      <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.fullname}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" id="field-email">
                  <div>
                    <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="juan@example.com"
                      className={`${inputClass} ${errors.email ? 'border-red-300 ring-4 ring-red-50' : ''}`}
                    />
                    {errors.email && (
                      <p className={errorClass}>
                        <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.email}
                      </p>
                    )}
                  </div>
                  <div id="field-phone">
                    <label className={labelClass}>Contact Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="+63 912 345 6789"
                      className={`${inputClass} ${errors.phone ? 'border-red-300 ring-4 ring-red-50' : ''}`}
                    />
                    {errors.phone && (
                      <p className={errorClass}>
                        <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Section: Account Setup */}
              <div className="space-y-5" id="field-password">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#0B5858]/10 text-[#0B5858] flex items-center justify-center font-bold text-sm">2</div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`${inputClass} ${errors.password ? 'border-red-300 ring-4 ring-red-50' : ''}`}
                    />
                    {errors.password && (
                      <p className={errorClass}>
                        <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.password}
                      </p>
                    )}
                  </div>
                  <div id="field-confirmPassword">
                    <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      placeholder="Repeat password"
                      className={`${inputClass} ${errors.confirmPassword ? 'border-red-300 ring-4 ring-red-50' : ''}`}
                    />
                    {errors.confirmPassword && (
                      <p className={errorClass}>
                        <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {recruitedById && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mt-4">
                    <label className={labelClass}>Referred By (Optional)</label>
                    <input
                      type="text"
                      value={form.recruitedBy}
                      onChange={(e) => set('recruitedBy', e.target.value)}
                      className={inputClass}
                      placeholder="Agent ID"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                      <SolidCheckCircleIcon className="w-4 h-4 text-green-500" />
                      Pre-filled from your invite link. You can edit this if needed.
                    </p>
                  </div>
                )}
              </div>

              <hr className="border-gray-100" />

              {/* Section: Payment */}
              <div className="space-y-5" id="field-feeProofFile">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#0B5858]/10 text-[#0B5858] flex items-center justify-center font-bold text-sm">3</div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Verification</h3>
                </div>

                <div className="bg-[#0B5858]/5 border border-[#0B5858]/10 rounded-2xl p-5 mb-2">
                  <h4 className="text-sm font-bold text-[#0B5858] mb-2 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5" />
                    How to pay
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Please transfer exactly <strong className="text-gray-900">₱{registrationFee.toLocaleString()}</strong> via:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B5858]"></span>
                      <span className="font-semibold">GCash:</span> 0917-XXX-XXXX
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0B5858]"></span>
                      <span className="font-semibold">BDO:</span> 1234-5678-9012 (Kelsey&apos;s Homestay)
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <label className={labelClass}>Upload Proof of Payment</label>
                  <label className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 group overflow-hidden ${form.feeProofFile ? 'border-[#0B5858] bg-[#0B5858]/5' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-[#0B5858]/50'}`}>
                    {form.feeProofFile ? (
                      <div className="text-center p-4 z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100">
                          <CheckCircleIcon className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">{form.feeProofFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">Click to upload a different file</p>
                      </div>
                    ) : (
                      <div className="text-center p-6 z-10">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                          <ArrowUpTrayIcon className="w-5 h-5 text-[#0B5858]" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Click to upload screenshot</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, or PDF (Max 5MB)</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => set('feeProofFile', e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {errors.feeProofFile && (
                    <p className={errorClass}>
                      <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.feeProofFile}
                    </p>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Section: Terms & Submit */}
              <div className="space-y-6 pt-2" id="field-agreeTerms">
                <label className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="relative flex items-center justify-center pt-1">
                    <div className="relative w-5 h-5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={form.agreeTerms}
                        onChange={(e) => set('agreeTerms', e.target.checked)}
                        className="peer appearance-none w-5 h-5 bg-white border border-gray-300 rounded focus:outline-none cursor-pointer transition-all checked:bg-[#0B5858] checked:border-[#0B5858]"
                      />
                      <svg
                        className="absolute top-0 left-0 w-5 h-5 p-[3px] pointer-events-none opacity-0 peer-checked:opacity-100 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="#" className="text-[#0B5858] font-bold hover:underline">Terms and Conditions</a>{' '}
                    and acknowledge that my application is subject to admin approval. I understand that the registration fee is non-refundable if the application is rejected.
                  </div>
                </label>
                {errors.agreeTerms && (
                  <p className={`${errorClass} ml-2`}>
                    <span className="w-1 h-1 rounded-full bg-red-500" /> {errors.agreeTerms}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-6 text-base font-bold text-gray-900 bg-[#FACC15] hover:bg-[#eab308] rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(250,204,21,0.39)] hover:shadow-[0_6px_20px_rgba(250,204,21,0.23)] disabled:opacity-70 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                      Processing Application...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </button>
                
                <p className="text-center text-sm text-gray-500">
                  Already an agent?{' '}
                  <button type="button" onClick={() => router.push('/login')} className="text-[#0B5858] font-bold hover:underline cursor-pointer">
                    Log in here
                  </button>
                </p>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BecomeAnAgentPage() {
  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-[#F8FAFC]`}>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#0B5858] mb-4" />
          <p className="text-gray-500 font-medium">Loading application form...</p>
        </div>
      }>
        <BecomeAnAgentContent />
      </Suspense>
    </div>
  );
}

// Keep old URL working
export const dynamic = 'force-dynamic';
