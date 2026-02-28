'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { AgentSocialLinks } from '@/types/agent';

const DOMAIN = 'kelseyshomestay.com';
const QR_SIZE = 160;

function generateQRCodeSVG(url: string, size: number): string {
  const modules = 25;
  const cellSize = size / modules;
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) & 0xffffffff;
  }

  let rects = '';
  const drawFinder = (ox: number, oy: number) => {
    for (let fr = 0; fr < 7; fr++) {
      for (let fc = 0; fc < 7; fc++) {
        const isBorder = fr === 0 || fr === 6 || fc === 0 || fc === 6;
        const isInner = fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4;
        if (isBorder || isInner) {
          rects += `<rect x="${(ox + fc) * cellSize}" y="${(oy + fr) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0B5858"/>`;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  let seed = hash;
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      const inFinder =
        (r < 8 && c < 8) ||
        (r < 8 && c >= modules - 8) ||
        (r >= modules - 8 && c < 8);
      if (inFinder) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0B5858"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

interface ProfileHeaderProps {
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  location: string;
  socialLinks: AgentSocialLinks;
  isAgentView: boolean;
  slug: string;
  onEditClick: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  tagline,
  bio,
  avatarUrl,
  location,
  socialLinks,
  isAgentView,
  slug,
  onEditClick,
}) => {
  const [showShareCard, setShowShareCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState('');
  const shareCardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profileUrl = `${DOMAIN}/${slug}`;

  useEffect(() => {
    setQrSvg(generateQRCodeSVG(`https://${profileUrl}`, QR_SIZE));
  }, [profileUrl]);

  // Close share card when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareCardRef.current && !shareCardRef.current.contains(event.target as Node)) {
        setShowShareCard(false);
      }
    }
    if (showShareCard) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareCard]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${profileUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = QR_SIZE * 2;
      canvas.height = QR_SIZE * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const link = document.createElement('a');
      link.download = `qr-code-${slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          {/* Avatar */}
          <div className="shrink-0 self-center sm:self-start">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-200">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${avatarUrl}')` }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1
              className="text-2xl sm:text-3xl font-bold text-black mb-1"
              style={{ fontFamily: 'Poppins', fontWeight: 700 }}
            >
              {name}
            </h1>

            <p
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Poppins' }}
            >
              {tagline}
            </p>

            <div className="flex items-center justify-center sm:justify-start text-gray-600 mb-5">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm" style={{ fontFamily: 'Poppins' }}>
                {location}
              </span>
            </div>

            <h2
              className="text-sm font-semibold text-black mb-1"
              style={{ fontFamily: 'Poppins', fontWeight: 600 }}
            >
              About Me
            </h2>
            <p
              className="text-sm text-gray-600 leading-snug max-w-xl"
              style={{ fontFamily: 'Poppins' }}
            >
              {bio}
            </p>

            {/* Contact Me */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-black mb-1.5" style={{ fontFamily: 'Poppins', fontWeight: 600 }}>
                Contact Me
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition-opacity"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0014.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z" />
                    </svg>
                  </a>
                )}
                {socialLinks.messenger && (
                  <a
                    href={socialLinks.messenger}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#0084FF] flex items-center justify-center hover:opacity-80 transition-opacity"
                    aria-label="Messenger"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z" />
                    </svg>
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a
                    href={socialLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center hover:opacity-80 transition-opacity"
                    aria-label="WhatsApp"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-center gap-3 sm:gap-4">
            {isAgentView && (
              <div className="relative flex items-center gap-2">
                {/* Edit Profile Button */}
                <button
                  onClick={onEditClick}
                  className="border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ fontFamily: 'Poppins' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>

                {/* Share Button */}
                <button
                  onClick={() => setShowShareCard(!showShareCard)}
                  className="border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  style={{ fontFamily: 'Poppins' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>

                {/* Share Card Popup */}
                {showShareCard && (
                  <div
                    ref={shareCardRef}
                    className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-lg z-50"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3
                          className="text-sm font-semibold text-gray-900"
                          style={{ fontFamily: 'Poppins', fontWeight: 600 }}
                        >
                          Share Your Profile
                        </h3>
                        <button
                          onClick={() => setShowShareCard(false)}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Profile URL */}
                      <div className="mb-4">
                        <div className="flex items-stretch">
                          <div className="flex-1 flex items-center px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">
                            <svg className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span
                              className="text-xs text-gray-600 truncate"
                              style={{ fontFamily: 'Poppins' }}
                            >
                              {profileUrl}
                            </span>
                          </div>
                          <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 bg-[#0B5858] hover:bg-[#0d9488] text-white rounded-r-lg font-medium text-xs transition-colors whitespace-nowrap cursor-pointer"
                            style={{ fontFamily: 'Poppins', fontWeight: 600 }}
                          >
                            Copy
                          </button>
                        </div>
                        {copied && (
                          <p
                            className="text-xs text-green-600 mt-1.5"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            Link copied to clipboard!
                          </p>
                        )}
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center gap-3 pt-3 border-t border-gray-100">
                        <div
                          className="bg-white p-2 rounded-lg border border-gray-200"
                          dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <button
                          onClick={handleDownloadQR}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0B5858] bg-[#0B5858]/8 hover:bg-[#0B5858]/15 rounded-lg transition-colors cursor-pointer"
                          style={{ fontFamily: 'Poppins', fontWeight: 500 }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download QR as PNG
                        </button>
                      </div>

                      {/* Quick Share */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=https://${profileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          style={{ fontFamily: 'Poppins', fontWeight: 500 }}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                          Share
                        </a>
                        <a
                          href={`https://wa.me/?text=Check%20out%20my%20properties%20https://${profileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileHeader;
