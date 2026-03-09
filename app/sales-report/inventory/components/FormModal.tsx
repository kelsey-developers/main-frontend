'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function FormModal({
  title,
  subtitle,
  submitLabel,
  onClose,
  onSubmit,
  children,
  maxWidthClass = 'max-w-[560px]',
}: {
  title: string;
  subtitle?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fn = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4">
      <div onClick={(event) => event.stopPropagation()} className={`bg-white rounded-2xl w-full ${maxWidthClass} max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl`}>
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-center">
          <div>
            {subtitle && (
              <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1" style={{ fontFamily: 'Poppins' }}>
                {subtitle}
              </div>
            )}
            <h3 className="text-[17px] font-bold text-white" style={{ fontFamily: 'Poppins' }}>
              {title}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        <div className="px-6 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button onClick={onSubmit} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ fontFamily: 'Poppins' }}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
