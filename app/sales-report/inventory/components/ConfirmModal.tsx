'use client';

import { useEffect } from 'react';

export type ConfirmVariant = {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  headerClass: string;
};

export default function ConfirmModal({
  variant,
  contextLabel,
  contextValue,
  onConfirm,
  onClose,
}: {
  variant: ConfirmVariant;
  contextLabel?: string;
  contextValue?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);
    document.body.dataset.hideNavbar = 'true';
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', fn);

    return () => {
      window.removeEventListener('keydown', fn);
      document.body.style.overflow = '';

      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
        delete document.body.dataset.hideNavbar;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[1001] p-4">
      <div onClick={(event) => event.stopPropagation()} className="bg-white rounded-2xl w-full max-w-[460px] overflow-hidden shadow-2xl">
        <div className={`px-5 py-4 border-b-[1.5px] ${variant.headerClass}`}>
          <div className="text-[15px] font-bold" style={{ fontFamily: 'Poppins' }}>{variant.title}</div>
        </div>
        <div className="px-5 py-5">
          <p className="text-[13.5px] text-gray-600 leading-relaxed" style={{ fontFamily: 'Poppins' }}>{variant.message}</p>
          {contextLabel && contextValue && (
            <p className="text-[12px] text-gray-500 mt-3" style={{ fontFamily: 'Poppins' }}>
              {contextLabel}: <span className="font-semibold text-gray-700">{contextValue}</span>
            </p>
          )}
        </div>
        <div className="px-5 py-3.5 flex justify-end gap-2.5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-colors ${variant.confirmClass}`}
            style={{ fontFamily: 'Poppins' }}
          >
            {variant.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
