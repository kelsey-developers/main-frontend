'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const PAYROLL_API_BASE = '/api/payroll-proxy';

export default function RegisterAsEmployeePage() {
  const { user } = useAuth();

  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${PAYROLL_API_BASE}/api/employee-registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          email: user.email,
          message: message.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error ?? `Error ${res.status}`);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(11,88,88,0.1)' }}>
              <svg className="w-8 h-8" fill="none" stroke="#0B5858" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>
            Register as Employee
          </h1>
          <p className="text-gray-500 text-center text-sm mb-8" style={{ fontFamily: 'Poppins' }}>
            Submit a registration request and HR will review it. Once approved, your account will automatically have employee access.
          </p>

          {submitted ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(11,88,88,0.1)' }}>
                <svg className="w-7 h-7" fill="none" stroke="#0B5858" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Poppins' }}>Request Submitted!</p>
              <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Poppins' }}>
                HR will review your request and approve it shortly. Log out and log back in once approved to get employee access.
              </p>
              <Link href="/home"
                className="inline-block py-3 px-6 rounded-2xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'Poppins' }}>
                Back to Home
              </Link>
            </div>
          ) : user ? (
            /* Logged-in: show registration form */
            <>
              <div className="mb-5 p-4 rounded-xl border border-gray-100" style={{ backgroundColor: 'rgba(11,88,88,0.04)' }}>
                <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Poppins' }}>Submitting as</p>
                <p className="text-sm font-semibold" style={{ fontFamily: 'Poppins', color: '#0B5858' }}>{user.email}</p>
              </div>

              <div className="mb-5">
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontFamily: 'Poppins' }}>
                  Message to HR <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I'm a housekeeper at the resort, my supervisor is Ana…"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:border-[#0B5858]"
                  style={{ fontFamily: 'Poppins' }}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" style={{ fontFamily: 'Poppins' }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-2xl text-white text-sm font-semibold text-center transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}
                >
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
                <Link href="/home"
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-semibold text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'Poppins' }}>
                  Back to Home
                </Link>
              </div>
            </>
          ) : (
            /* Not logged in: show steps + CTA */
            <>
              <div className="space-y-4 mb-8">
                {[
                  { step: '1', label: 'Sign up or log in', desc: 'Create a regular account using your work email address.' },
                  { step: '2', label: 'Submit a request', desc: 'Come back here and submit your employee registration request.' },
                  { step: '3', label: 'Wait for approval', desc: 'HR will review and approve your request. Log back in to get employee access.' },
                ].map(({ step, label, desc }) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}>
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Poppins' }}>{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup"
                  className="flex-1 py-3 px-4 rounded-2xl text-white text-sm font-semibold text-center transition-all hover:opacity-90"
                  style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}>
                  Create an Account
                </Link>
                <Link href="/home"
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-semibold text-center border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'Poppins' }}>
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
