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

const getStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: '#ecfdf5',
        border: '#10b981',
        icon: '✓',
        text: '#065f46',
      };
    case 'error':
      return {
        bg: '#fef2f2',
        border: '#ef4444',
        icon: '✕',
        text: '#7f1d1d',
      };
    case 'warning':
      return {
        bg: '#fffbeb',
        border: '#f59e0b',
        icon: '!',
        text: '#78350f',
      };
    default:
      return {
        bg: '#eff6ff',
        border: '#3b82f6',
        icon: 'ℹ',
        text: '#1e40af',
      };
  }
};

export default function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  const styles = getStyles(type);

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 12,
        borderLeft: `4px solid ${styles.border}`,
        background: styles.bg,
        color: styles.text,
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: styles.border,
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {styles.icon}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'none',
          border: 'none',
          color: styles.border,
          cursor: 'pointer',
          fontSize: 18,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
