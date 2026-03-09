'use client';

import React from 'react';
import { createPortal } from 'react-dom';

interface ShareModalProps {
  show: boolean;
  onClose: () => void;
  onCopyLink: () => void;
  isLinkCopied: boolean;
  shareUrl: string;
  onFacebookShare: () => void;
  onTwitterShare: () => void;
  onWhatsAppShare: () => void;
  onEmailShare: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  show,
  onClose,
  onCopyLink,
  isLinkCopied,
  shareUrl,
  onFacebookShare,
  onTwitterShare,
  onWhatsAppShare,
  onEmailShare,
}) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-[10000]"
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.38)',
        transition: 'background-color 0.25s ease'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{fontFamily: 'Poppins', fontWeight: 700}}>
            Share Property
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Link Display */}
        <div className="mb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <div className="flex-1 text-sm text-gray-600 truncate" style={{fontFamily: 'Poppins'}}>
              {shareUrl}
            </div>
            <button 
              onClick={onCopyLink}
              className={`px-3 py-1 text-white text-sm rounded-md transition-all duration-200 ${
                isLinkCopied 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
              style={{fontFamily: 'Poppins', fontWeight: 500}}
            >
              {isLinkCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {/* Facebook */}
          <button 
            onClick={onFacebookShare}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm" style={{fontFamily: 'Poppins', fontWeight: 600}}>Facebook</div>
            </div>
          </button>

          {/* Twitter */}
          <button 
            onClick={onTwitterShare}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm" style={{fontFamily: 'Poppins', fontWeight: 600}}>Twitter</div>
            </div>
          </button>

          {/* WhatsApp */}
          <button 
            onClick={onWhatsAppShare}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"></path>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm" style={{fontFamily: 'Poppins', fontWeight: 600}}>WhatsApp</div>
            </div>
          </button>

          {/* Email */}
          <button 
            onClick={onEmailShare}
            className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm" style={{fontFamily: 'Poppins', fontWeight: 600}}>Email</div>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShareModal;
