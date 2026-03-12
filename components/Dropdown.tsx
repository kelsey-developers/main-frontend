'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const scrollbarStyles = `
  .dropdown-list, .dropdown-scrollable-list {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    scroll-behavior: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
  .dropdown-list::-webkit-scrollbar, .dropdown-scrollable-list::-webkit-scrollbar { width: 8px; }
  .dropdown-list::-webkit-scrollbar-track, .dropdown-scrollable-list::-webkit-scrollbar-track {
    background: rgba(11, 88, 88, 0.06); border-radius: 9999px;
  }
  .dropdown-list::-webkit-scrollbar-thumb, .dropdown-scrollable-list::-webkit-scrollbar-thumb {
    background: #0B5858; border-radius: 9999px;
  }
  .dropdown-list::-webkit-scrollbar-thumb:hover, .dropdown-scrollable-list::-webkit-scrollbar-thumb:hover {
    background: #0a4a4a;
  }
  .dropdown-list, .dropdown-scrollable-list { scrollbar-width: thin; scrollbar-color: #0B5858 rgba(11, 88, 88, 0.06); }
  .dropdown-menu { opacity: 0; transform: translateY(4px); transition: opacity 150ms ease-out, transform 150ms ease-out; }
  .dropdown-enter { opacity: 1; transform: translateY(0); }
  .dropdown-exit { opacity: 0; transform: translateY(4px); }
`;

if (typeof document !== 'undefined') {
  const styleId = 'dropdown-scrollbar-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = scrollbarStyles;
    document.head.appendChild(styleSheet);
  }
  const portalId = 'dropdown-portal-container';
  if (!document.getElementById(portalId)) {
    const portalContainer = document.createElement('div');
    portalContainer.id = portalId;
    portalContainer.style.cssText = 'position: static !important; transform: none !important; will-change: auto !important; contain: none !important; isolation: auto !important; z-index: auto !important;';
    document.body.appendChild(portalContainer);
  }
}

interface DropdownOption {
  label: string;
  value: string;
  icon?: string;
}

interface DropdownProps {
  label: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuWidth?: string;
  maxVisibleItems?: number;
  alwaysScrollable?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  onSelect,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  menuWidth,
  maxVisibleItems = 5,
  alwaysScrollable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: string | number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const optionRowHeight = 40;
  const shouldScroll = alwaysScrollable || options.length >= maxVisibleItems;

  const calculateDropdownPosition = useCallback((rect: DOMRect) => {
    const targetMaxHeight = optionRowHeight * maxVisibleItems;
    const dropdownHeight = shouldScroll ? targetMaxHeight : Math.min(options.length * optionRowHeight, targetMaxHeight);
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const headerHeight = 64;
    const triggerTop = rect.top;
    const triggerLeft = rect.left;
    const triggerRight = rect.right;
    const triggerBottom = rect.bottom;
    const triggerWidth = rect.width;

    if (triggerWidth === 0 || triggerBottom === 0) {
      return {
        top: Math.max(headerHeight + 8, 100),
        left: Math.max(8, Math.min(triggerLeft, viewportWidth - 200)),
        width: Math.min(triggerWidth || 200, viewportWidth - 16)
      };
    }

    const spaceBelow = viewportHeight - triggerBottom;
    const spaceAbove = triggerTop - headerHeight;
    let topPosition = triggerBottom + 8;
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      topPosition = triggerTop - dropdownHeight - 8;
    }
    const minTop = headerHeight + 8;
    const maxTop = viewportHeight - 8;
    topPosition = Math.max(minTop, Math.min(topPosition, maxTop));
    if (topPosition + dropdownHeight > viewportHeight) {
      topPosition = Math.max(minTop, viewportHeight - dropdownHeight - 8);
    }

    let leftPosition = triggerLeft;
    const dropdownWidth = typeof menuWidth === 'string' ? parseInt(menuWidth) : (menuWidth || triggerWidth);
    const minLeft = 8;
    const maxLeft = viewportWidth - 8;
    if (leftPosition + dropdownWidth > maxLeft) {
      leftPosition = Math.max(minLeft, triggerRight - dropdownWidth);
    }
    if (leftPosition < minLeft) leftPosition = minLeft;
    const maxWidth = viewportWidth - 16;
    const finalWidth = Math.min(dropdownWidth, maxWidth);
    const finalLeft = Math.max(minLeft, Math.min(leftPosition, maxLeft - finalWidth));
    const finalTop = Math.max(minTop, Math.min(topPosition, maxTop));

    return {
      top: Math.round(finalTop),
      left: Math.round(finalLeft),
      width: Math.round(finalWidth)
    };
  }, [shouldScroll, options.length, menuWidth, maxVisibleItems]);

  const handleClose = useCallback(() => {
    if (!isOpen) return;
    setIsExiting(true);
    setFocusedIndex(-1);
    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
      triggerRef.current?.focus();
    }, 150);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition(calculateDropdownPosition(rect));
    }
    setIsOpen(true);
    setFocusedIndex(-1);
    setIsExiting(false);
  }, [disabled, calculateDropdownPosition]);

  const handleSelect = useCallback((value: string) => {
    onSelect(value);
    handleClose();
  }, [onSelect, handleClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleSelect(options[focusedIndex].value);
        } else {
          handleOpen();
        }
        break;
      case 'Escape':
        event.preventDefault();
        handleClose();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) handleOpen();
        else setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) handleOpen();
        else setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Tab':
        handleClose();
        break;
    }
  }, [disabled, isOpen, focusedIndex, options, handleSelect, handleOpen, handleClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && triggerRef.current && menuRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el || !shouldScroll) return;
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!over) return;
      const atTop = el.scrollTop <= 0;
      const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
      const goingDown = e.deltaY > 0;
      e.preventDefault();
      e.stopPropagation();
      if ((goingDown && !atBottom) || (!goingDown && !atTop)) {
        el.scrollTop += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel as EventListener);
  }, [isOpen, shouldScroll]);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition(calculateDropdownPosition(rect));
    }
  }, [isOpen, calculateDropdownPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => handleClose();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex] && listRef.current) {
      optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen, focusedIndex]);

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, options.length);
  }, [options.length]);

  const renderMenu = () => {
    if (!(isOpen || isExiting) || !dropdownPosition) return null;
    const portalContainer = document.getElementById('dropdown-portal-container') || document.body;
    return createPortal(
      <div
        ref={menuRef}
        className={`fixed dropdown-menu ${isOpen && !isExiting ? 'dropdown-enter' : 'dropdown-exit'} overflow-hidden`}
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 9999,
          position: 'fixed',
          margin: 0,
          padding: '4px 0',
          border: '1px solid rgba(11, 88, 88, 0.12)',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 18px 30px rgba(11, 88, 88, 0.08), 0 6px 12px rgba(15, 23, 42, 0.04)',
          pointerEvents: 'auto',
          visibility: 'visible',
          opacity: 1,
          transform: 'none'
        }}
      >
        <div
          ref={listRef}
          className="dropdown-list"
          style={{
            maxHeight: shouldScroll ? `${optionRowHeight * maxVisibleItems}px` : 'auto',
            overflowY: shouldScroll ? 'auto' : 'visible',
            overflowX: 'hidden'
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={el => { optionRefs.current[index] = el; }}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 h-10 text-[14px] transition ${
                focusedIndex === index ? 'bg-[rgba(11,88,88,0.11)] text-[#0B5858]' : 'text-[#111827] hover:bg-[rgba(11,88,88,0.06)]'
              }`}
              style={{ fontFamily: 'Poppins', fontWeight: 400 }}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <span className="flex items-center gap-2">
                {option.icon && <span className="text-lg">{option.icon}</span>}
                {option.label}
              </span>
              {label === option.label && (
                <svg className="w-4 h-4 text-[#0B5858]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              )}
            </button>
          ))}
        </div>
      </div>,
      portalContainer
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={isOpen ? handleClose : handleOpen}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition-shadow duration-150 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:border-transparent ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white text-slate-800 border-[#d1d5db] hover:shadow-sm cursor-pointer'
        } ${isOpen ? 'ring-2 ring-offset-2 border-transparent' : ''}`}
        style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 400, '--tw-ring-color': '#549F74' } as React.CSSProperties}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label || placeholder} dropdown`}
      >
        <span className={!label ? 'text-gray-500' : 'text-slate-900'}>{label || placeholder}</span>
        <span className={`ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 text-[#0B5858] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
          <svg style={{ width: 18, height: 18 }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {renderMenu()}
    </div>
  );
};

export default Dropdown;