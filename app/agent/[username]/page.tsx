'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { getProfileByUsername } from '@/lib/api/profile';
import type { PublicProfile } from '@/lib/api/profile';
import { getAgentProperties } from '@/lib/api/units';
import { useAuth } from '@/contexts/AuthContext';
import type { ListingView } from '@/types/listing';
import PropertyCard from '@/components/PropertyCard';

function getInitials(fullName?: string | null, username?: string): string {
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(/\s+/);
    if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    return names[0][0].toUpperCase();
  }
  return username?.charAt(0).toUpperCase() || 'U';
}

export default function AgentUsernameProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user, isAgent } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shareOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && setShareOpen(false);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEscape);
    };
  }, [shareOpen]);

  useEffect(() => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setAvatarError(false);
    Promise.all([
      getProfileByUsername(username),
      getAgentProperties(username),
    ])
      .then(([p, units]) => {
        setProfile(p);
        setListings(units);
      })
      .catch((err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  const isOwnProfile = Boolean(user && profile && user.id === profile.userId);

  const handlePropertyClick = (id: string) => {
    router.push(`/unit/${id}`);
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/agent/${username}` : '';
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] -mt-8 flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#0B5858] border-r-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] -mt-8 flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Profile not found</h1>
          <p className="text-sm text-gray-500 mb-6">
            The user @{username} doesn&apos;t exist or their profile is not available.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-5 bg-[#0B5858] hover:bg-[#094848] text-white text-sm font-bold rounded-2xl transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = profile.profilePhotoUrl;
  const showAvatar = avatarUrl && !avatarError;
  const initials = getInitials(profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' '), profile.username);
  const socialLinks = profile.socialLinks || {};
  const hasSocialLinks = Object.values(socialLinks).some((v) => v && v.trim());

  const socialIcons: Record<string, { label: string; color: string; path: string }> = {
    facebook: { label: 'Facebook', color: '#1877F2', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
    instagram: { label: 'Instagram', color: '#E4405F', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    twitter: { label: 'X (Twitter)', color: '#000000', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    linkedin: { label: 'LinkedIn', color: '#0A66C2', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    whatsapp: { label: 'WhatsApp', color: '#25D366', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] -mt-8 bg-gray-50">
      <div className="space-y-8 animate-fade-in-up pt-6 pb-12">
        {/* Profile Section - Top */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex flex-col items-center md:items-start shrink-0">
              <div
                className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{
                  background: showAvatar ? 'transparent' : 'linear-gradient(to bottom right, #14b8a6, #0d9488)',
                }}
              >
                {showAvatar ? (
                  <img
                    src={avatarUrl!}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span
                    className="text-white text-2xl font-bold"
                    style={{ fontFamily: 'var(--font-poppins)', fontWeight: 700 }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/profile?edit=1')}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-100 hover:border-[#0B5858]/30 hover:bg-[#0B5858]/5 transition-all text-sm font-bold text-gray-700 hover:text-[#0B5858]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {profile.fullName || profile.username}
                </h1>
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-[#0B5858]/40 hover:bg-[#0B5858]/5 transition-all text-sm font-medium text-gray-600 hover:text-[#0B5858]"
                  title="Share profile"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
              <p className="text-base font-medium text-gray-600 mt-1">@{profile.username}</p>
              {profile.location && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 mt-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {profile.location}
                </div>
              )}
              {profile.aboutMe && (
                <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-2xl">
                  {profile.aboutMe}
                </p>
              )}
              {hasSocialLinks && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                  {(['facebook', 'instagram', 'twitter', 'linkedin', 'whatsapp'] as const).map((key) => {
                    const url = socialLinks[key];
                    if (!url || !url.trim()) return null;
                    const icon = socialIcons[key];
                    return (
                      <a
                        key={key}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                        title={icon.label}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: icon.color }}>
                          <path d={icon.path} />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">{icon.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Modal - matches Export modal style from agent commissions */}
        {shareOpen && shareUrl && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in bg-gray-900/40"
            onClick={() => setShareOpen(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Share profile</h3>
                <button
                  onClick={() => setShareOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-sm text-gray-500">Scan the QR code to open this profile</p>
                <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <QRCodeSVG value={shareUrl} size={180} level="M" includeMargin />
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-xl bg-[#0B5858] hover:bg-[#094848] text-white text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* My Properties Section - Bottom */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-gray-50/30">
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">My Properties</h2>
              <p className="text-xs font-medium text-gray-500 mt-1">
                {listings.length} listing{listings.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <PropertyCard
                  key={listing.id}
                  apartment={listing}
                  onApartmentClick={handlePropertyClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
