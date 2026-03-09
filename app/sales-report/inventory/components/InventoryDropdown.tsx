'use client';

import React, { useMemo, useState } from 'react';

export interface InventoryDropdownOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface InventoryDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: InventoryDropdownOption<T>[];
  placeholder?: string;
  placeholderWhen?: T;
  leadingIcon?: React.ReactNode;
  hideIcon?: boolean;
  align?: 'left' | 'right';
  minWidthClass?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  backdropZIndexClass?: string;
  menuZIndexClass?: string;
  useFixedPosition?: boolean;
}

const DefaultSortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 3h11M3 6.5h7M5 10h3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function InventoryDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  placeholderWhen,
  leadingIcon,
  hideIcon = false,
  align = 'right',
  minWidthClass,
  fullWidth = false,
  disabled = false,
  backdropZIndexClass = 'z-40',
  menuZIndexClass = 'z-50',
  useFixedPosition = false,
}: InventoryDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value]
  );

  const label =
    placeholder && placeholderWhen !== undefined && value === placeholderWhen
      ? placeholder
      : (selected?.label ?? placeholder ?? 'Select');

  const handleButtonClick = () => {
    if (useFixedPosition && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen((current) => !current);
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleButtonClick}
        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border-[1.5px] bg-white text-[13px] outline-none transition-all ${
          fullWidth ? 'w-full' : ''
        } ${minWidthClass ?? 'min-w-[180px]'} ${
          open
            ? 'border-[#0B5858] ring-2 ring-[#cce8e8]'
            : 'border-gray-200'
        } ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${
          placeholder && placeholderWhen !== undefined && value === placeholderWhen
            ? 'text-gray-500'
            : 'text-gray-900 font-medium'
        }`}
        style={{ fontFamily: 'Poppins' }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {!hideIcon && (leadingIcon ?? <DefaultSortIcon />)}
          <span className="truncate">{label}</span>
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          fill="none"
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden="true"
        >
          <path
            d="M1.5 3.5l4 4 4-4"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <>
          {!useFixedPosition && <div className={`fixed inset-0 ${backdropZIndexClass}`} onClick={() => setOpen(false)} />}
          <div
            className={`bg-white border-[1.5px] border-gray-200 rounded-xl shadow-xl overflow-y-auto max-h-[260px] ${menuZIndexClass} ${
              fullWidth ? 'w-full' : (minWidthClass ?? 'min-w-[180px]')
            } ${useFixedPosition ? 'fixed' : 'absolute top-full mt-1.5'} ${align === 'left' ? 'left-0' : 'right-0'}`}
            style={useFixedPosition && buttonRect ? {
              top: `${buttonRect.bottom + 6}px`,
              [align === 'left' ? 'left' : 'right']: align === 'left' ? `${buttonRect.left}px` : `${window.innerWidth - buttonRect.right}px`,
              width: align === 'left' && fullWidth ? `${buttonRect.width}px` : undefined,
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            } : {
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex items-center gap-2 w-full text-left px-3.5 py-2.5 text-[13px] border-b transition-colors ${
                  index < options.length - 1 ? 'border-gray-50' : 'border-transparent'
                } ${
                  option.value === value
                    ? 'bg-[#e8f4f4] text-[#0b5858] font-semibold'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ fontFamily: 'Poppins' }}
              >
                {option.value === value ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="#05807e"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="w-3 inline-block" />
                )}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
