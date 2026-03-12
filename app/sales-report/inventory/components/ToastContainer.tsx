'use client';

import React from 'react';
import Toast, { type ToastType } from './Toast';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      <div className="flex flex-col gap-3 w-full max-w-[min(420px,100%)] pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
