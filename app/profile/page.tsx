'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getMyProfile, setupProfile, updateProfile } from '@/lib/api/profile';
import type { UserProfile, SocialLinks } from '@/lib/api/profile';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';

type Step = 'username' | 'about' | 'contact';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login?redirect=/profile');
      return;
    }
    getMyProfile()
      .then((res) => {
        if (res.profile) {
          setProfile(res.profile);
          if (isEditMode) {
            setAboutMe(res.profile.aboutMe || '');
            setSocialLinks(res.profile.socialLinks || {});
            setLoading(false);
          } else {
            router.replace(`/agent/${res.profile.username}`);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [user, router, isEditMode]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'username' || step === 'about') handleNext();
    else doSubmit();
  };

  const handleNext = () => {
    if (step === 'username') {
      const trimmed = username.trim().toLowerCase().replace(/\s+/g, '');
      if (!trimmed || trimmed.length < 2) {
        setError('Username must be at least 2 characters');
        return;
      }
      if (!/^[a-z0-9_-]+$/.test(trimmed)) {
        setError('Username can only contain letters, numbers, underscores, and hyphens');
        return;
      }
      setError('');
      setStep('about');
    } else if (step === 'about') {
      setStep('contact');
    } else {
      doSubmit();
    }
  };

  const doSubmit = async () => {
    setError('');
    const trimmed = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!trimmed || trimmed.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    setSubmitting(true);
    try {
      await setupProfile({
        username: trimmed,
        aboutMe: aboutMe.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length ? socialLinks : undefined,
      });
      router.replace(`/agent/${trimmed}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create profile';
      setError(msg);
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (step === 'about') setStep('contact');
    else if (step === 'contact') doSubmit();
  };

  if (!user) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B5858]" />
      </div>
    );
  }

  if (loading || (profile && !isEditMode)) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen flex items-center justify-center bg-gray-50`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B5858]" />
      </div>
    );
  }

  const doUpdate = async () => {
    setError('');
    setSubmitting(true);
    try {
      await updateProfile({
        aboutMe: aboutMe.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length ? socialLinks : undefined,
      });
      router.replace(`/agent/${profile!.username}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (profile && isEditMode) {
    return (
      <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 pt-24 pb-12 px-4`}>
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
            Edit profile
          </h1>
          <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'var(--font-poppins)' }}>
            @{profile.username}
          </p>
          <div className="space-y-6">
            <div>
              <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700 mb-2">
                About me
              </label>
              <textarea
                id="aboutMe"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Tell people a bit about yourself..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5858] focus:ring-2 focus:ring-[#0B5858]/20 outline-none resize-none"
                style={{ fontFamily: 'var(--font-poppins)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Social links (optional)
              </label>
              <div className="space-y-3">
                {(['facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp'] as const).map((key) => (
                  <input
                    key={key}
                    type="url"
                    value={socialLinks[key] || ''}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                    placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5858] focus:ring-2 focus:ring-[#0B5858]/20 outline-none"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  />
                ))}
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-poppins)' }}>
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/agent/${profile.username}`)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doUpdate}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-medium hover:bg-[#094848] disabled:opacity-50"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${LAYOUT_NAVBAR_OFFSET} min-h-screen bg-gray-50 pt-24 pb-12 px-4`}>
      <div className="max-w-md mx-auto">
        <h1
          className="text-2xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          Set up your profile
        </h1>
        <p className="text-sm text-gray-600 mb-8" style={{ fontFamily: 'var(--font-poppins)' }}>
          Create a username to get your shareable profile link. You can skip the optional steps.
        </p>

        <div className="flex gap-2 mb-6">
          {(['username', 'about', 'contact'] as const).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                (step === 'username' && s === 'username') ||
                (step === 'about' && (s === 'username' || s === 'about')) ||
                (step === 'contact')
                  ? 'bg-[#0B5858]'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {step === 'username' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5858] focus:ring-2 focus:ring-[#0B5858]/20 outline-none"
                style={{ fontFamily: 'var(--font-poppins)' }}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Letters, numbers, underscores, hyphens only. Your profile will be at /agent/{username || 'username'}
              </p>
            </div>
          )}

          {step === 'about' && (
            <div>
              <label htmlFor="aboutMe" className="block text-sm font-medium text-gray-700 mb-2">
                About me (optional)
              </label>
              <textarea
                id="aboutMe"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder="Tell people a bit about yourself..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5858] focus:ring-2 focus:ring-[#0B5858]/20 outline-none resize-none"
                style={{ fontFamily: 'var(--font-poppins)' }}
              />
            </div>
          )}

          {step === 'contact' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Social links (optional)
              </label>
              <div className="space-y-3">
                {(['facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp'] as const).map((key) => (
                  <input
                    key={key}
                    type="url"
                    value={socialLinks[key] || ''}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                    placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#0B5858] focus:ring-2 focus:ring-[#0B5858]/20 outline-none"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-poppins)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {(step === 'about' || step === 'contact') && (
              <button
                type="button"
                onClick={() => setStep(step === 'contact' ? 'about' : 'username')}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Back
              </button>
            )}
            {(step === 'about' || step === 'contact') && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2.5 rounded-lg text-gray-600 text-sm font-medium hover:text-gray-800"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={step === 'contact' ? doSubmit : handleNext}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#0B5858] text-white text-sm font-medium hover:bg-[#094848] disabled:opacity-50"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {submitting ? 'Creating...' : step === 'contact' ? 'Finish' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
