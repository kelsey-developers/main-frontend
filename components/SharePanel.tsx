'use client';

import React, { useState, useRef, useEffect } from 'react';
import { generateQRCodeSVG } from '@/lib/qrCode';

const QR_SIZE = 200;
const DOMAIN = 'kelseyshomestay.com';

export interface SharePanelProps {
  /** Path segment after domain, e.g. "juan" or "recruit" */
  slug: string;
  /** Optional referral or other query params */
  referralCode?: string;
  /** Whether to show the download QR button */
  showDownload?: boolean;
  /** Label for the panel */
  label?: string;
  /** Optional QR filename suffix */
  filename?: string;
  /** Layout: "section" renders a full card section, "inline" renders a compact row */
  variant?: 'section' | 'inline';
  /** URL override — if provided, uses this instead of building from slug/referralCode */
  urlOverride?: string;
}

/**
 * SharePanel — Consolidated shareable link + QR code component.
 * Replaces the duplicate implementations in ProfileHeader, SharingTools, and network/page.tsx.
 */
const SharePanel: React.FC<SharePanelProps> = ({
  slug,
  referralCode,
  showDownload = true,
  label = 'Your Shareable Link',
  filename,
  variant = 'section',
  urlOverride,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const profilePath = referralCode ? `${slug}?ref=${referralCode}` : slug;
  const shareUrl = urlOverride ?? `https://${DOMAIN}/${profilePath}`;
  const displayUrl = urlOverride ? urlOverride.replace('https://', '') : `${DOMAIN}/${profilePath}`;

  useEffect(() => {
    setQrSvg(generateQRCodeSVG(shareUrl, QR_SIZE));
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch { /* fallback silent */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrSvg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const blob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = QR_SIZE * 2;
      canvas.height = QR_SIZE * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${filename ?? `qr-${slug}`}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  if (variant === 'inline') {
    return (
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {qrSvg && (
          <div className="shrink-0">
            <div className="bg-white p-2 rounded-xl shadow-sm" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <canvas ref={canvasRef} className="hidden" />
            {showDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className="mt-2 w-full text-center text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                style={{ fontFamily: 'Poppins' }}
              >
                Download QR
              </button>
            )}
          </div>
        )}
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-white/70 mb-2" style={{ fontFamily: 'Poppins' }}>
            {label}
          </label>
          <div className="flex items-stretch">
            <div className="flex-1 flex items-center px-3 py-2.5 bg-white/10 border border-white/20 rounded-l-xl">
              <span className="text-xs text-white truncate" style={{ fontFamily: 'Poppins' }}>{displayUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-white text-[#0B5858] font-semibold text-sm rounded-r-xl hover:bg-white/90 transition-colors cursor-pointer whitespace-nowrap"
              style={{ fontFamily: 'Poppins' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              Facebook
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out my profile: ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              style={{ fontFamily: 'Poppins' }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Section variant (full card)
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
            Share Your Profile
          </h2>
          <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Poppins' }}>
            Share your unique link or QR code with clients
          </p>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              {qrSvg && (
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              )}
              <canvas ref={canvasRef} className="hidden" />
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0B5858] bg-[#0B5858]/8 hover:bg-[#0B5858]/15 rounded-xl transition-colors cursor-pointer"
                  style={{ fontFamily: 'Poppins', fontWeight: 500 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download QR as PNG
                </button>
              )}
            </div>

            {/* URL + Share */}
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Poppins', fontWeight: 500 }}>
                {label}
              </label>
              <div className="flex items-stretch">
                <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl">
                  <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm text-gray-600 truncate" style={{ fontFamily: 'Poppins', fontWeight: 400 }}>
                    {displayUrl}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-[#0B5858] hover:bg-[#0d9488] text-white rounded-r-xl font-medium text-sm transition-colors whitespace-nowrap cursor-pointer"
                  style={{ fontFamily: 'Poppins', fontWeight: 600 }}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3" style={{ fontFamily: 'Poppins' }}>
                Share on Facebook, Messenger, or WhatsApp to attract clients directly to your profile.
              </p>
              <div className="flex gap-2 mt-4">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  style={{ fontFamily: 'Poppins', fontWeight: 500 }}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Share
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out my properties ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  style={{ fontFamily: 'Poppins', fontWeight: 500 }}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SharePanel;
