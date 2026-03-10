'use client';

import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const typeConfig = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    borderL: 'border-l-emerald-500',
    iconBg: 'bg-emerald-200',
    text: 'text-emerald-900',
    subtext: 'text-emerald-800',
    closeHover: 'hover:bg-emerald-200',
    stroke: '#059669',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M13.5 4.5L6 12 2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    borderL: 'border-l-red-500',
    iconBg: 'bg-red-200',
    text: 'text-red-900',
    subtext: 'text-red-800',
    closeHover: 'hover:bg-red-200',
    stroke: '#dc2626',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M8 2.5L14 13H2L8 2.5Z" fill="#fecaca" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    borderL: 'border-l-amber-500',
    iconBg: 'bg-amber-200',
    text: 'text-amber-900',
    subtext: 'text-amber-800',
    closeHover: 'hover:bg-amber-200',
    stroke: '#d97706',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M8 2.5L14 13H2L8 2.5Z" fill="#fde68a" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 7v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    borderL: 'border-l-sky-500',
    iconBg: 'bg-sky-200',
    text: 'text-sky-900',
    subtext: 'text-sky-800',
    closeHover: 'hover:bg-sky-200',
    stroke: '#0284c7',
    Icon: () => (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="1" fill="currentColor" />
      </svg>
    ),
  },
};

export default function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  const config = typeConfig[type];
  const Icon = config.Icon;

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-[1.5px] border-l-[3px]
        w-full max-w-[min(420px,calc(100vw-2rem))]
        ${config.bg} ${config.border} ${config.borderL}
      `}
      style={{ fontFamily: 'Poppins', animation: 'toastFadeIn 0.2s ease-out' }}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}
          style={{ color: config.stroke }}
        >
          <Icon />
        </div>
        <span className={`text-[13px] font-semibold ${config.text} break-words`}>
          {message}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        title="Dismiss"
        className={`p-1.5 rounded-md transition-colors flex items-center flex-shrink-0 ${config.closeHover}`}
        aria-label="Dismiss"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={config.text}>
          <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
