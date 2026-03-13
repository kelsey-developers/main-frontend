'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StockOutModal from '../components/StockOutModal';

export default function StockOutPage() {
  const searchParams = useSearchParams();
  const [modalMode, setModalMode] = useState<'warehouse' | 'unit' | 'damage' | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const unitPrefill = useMemo(
    () => ({
      unitId: searchParams.get('unitId') || '',
      confirmedBy: searchParams.get('confirmedBy') || '',
      idNumber: searchParams.get('idNumber') || '',
      itemId: searchParams.get('itemId') || '',
    }),
    [searchParams]
  );

  const warehousePrefill = useMemo(
    () => ({
      warehouseId: searchParams.get('warehouseId') || '',
    }),
    [searchParams]
  );

  const returnTo = searchParams.get('returnTo') || '/sales-report/inventory/items';

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'warehouse' || mode === 'unit' || mode === 'damage') {
      setModalMode(mode);
    }
  }, [searchParams]);

  const cards = [
    {
      mode: 'warehouse' as const,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 21h18M3 7l9-4 9 4M5 21V10M19 21V10M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Warehouse Stock Out',
      desc: 'Deduct stock from a warehouse — general use, disposal, damage write-off, or inter-warehouse transfer',
      tag: 'WAREHOUSE',
      tagBg: 'rgba(5, 128, 126, 0.09)',
      tagColor: '#05807e',
      gradient: 'linear-gradient(135deg, #0b5858, #05807e)',
    },
    {
      mode: 'unit' as const,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Unit Stock Out',
      desc: 'Allocate items to a specific room or unit — for guest bookings, room prep, or restocking',
      tag: 'UNIT / ROOM',
      tagBg: 'rgba(5, 128, 126, 0.14)',
      tagColor: '#0b5858',
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    },
    {
      mode: 'damage' as const,
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Damage / Write-off',
      desc: 'Deduct stock tied to a damage receipt — movement reference is the damage incident ID only',
      tag: 'DAMAGE',
      tagBg: 'rgba(185, 28, 28, 0.1)',
      tagColor: '#b91c1c',
      gradient: 'linear-gradient(135deg, #7f1d1d, #b91c1c)',
    },
  ];

  return (
    <>
      <style>{`
        .card-wrapper:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px var(--hover-shadow);
          border-color: var(--accent-color);
        }
        .card-wrapper {
          transition: all 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        .card-accent {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card-wrapper:hover .card-accent {
          opacity: 1;
        }
        .card-icon {
          transition: all 0.2s;
        }
        .card-wrapper:hover .card-icon {
          background: var(--icon-bg);
          color: white;
        }
        .card-arrow {
          transition: color 0.2s, transform 0.2s;
          color: #e5e7eb;
        }
        .card-wrapper:hover .card-arrow {
          color: var(--accent-color);
        }
        .card-wrapper:hover .card-arrow-icon {
          transform: translateX(4px);
        }
        .card-arrow-icon {
          transition: transform 0.2s;
        }
      `}</style>
      
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
          <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
            Inventory
          </Link>
          <span>/</span>
          <Link href="/sales-report/inventory/items" className="text-[#0B5858] hover:underline">
            Items
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Stock Out</span>
        </nav>
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
          Stock Out
        </h1>
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
          Record stock leaving inventory — choose the type below
        </p>
      </div>


      <p className="text-gray-700 text-base mb-7 leading-relaxed" style={{ fontFamily: 'Poppins' }}>
        Is this stock going out from a general warehouse, or being allocated to a specific room or unit?
      </p>

      {/* ── Choice cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {cards.map((card) => (
          <button
            key={card.mode}
            onClick={() => setModalMode(card.mode)}
            onMouseEnter={() => setHoveredCard(card.mode)}
            onMouseLeave={() => setHoveredCard(null)}
            className="card-wrapper bg-white border-2 border-gray-200 rounded-[20px] p-7 cursor-pointer text-left shadow-sm relative overflow-hidden"
            style={{
              '--hover-shadow':
                card.mode === 'damage'
                  ? 'rgba(185, 28, 28, 0.2)'
                  : card.mode === 'warehouse'
                    ? 'rgba(5, 128, 126, 0.22)'
                    : 'rgba(15, 118, 110, 0.24)',
              '--accent-color':
                card.mode === 'damage' ? '#b91c1c' : card.mode === 'warehouse' ? '#05807e' : '#0f766e',
              '--icon-bg':
                card.mode === 'damage' ? '#7f1d1d' : card.mode === 'warehouse' ? '#0b5858' : '#0f766e',
            } as React.CSSProperties}
          >
            {/* Accent strip on hover */}
            <div
              className="card-accent absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]"
              style={{ background: card.gradient }}
            />

            {/* Tag */}
            <div
              className="inline-flex items-center rounded-md px-2.5 py-1 mb-5 text-[10px] font-extrabold tracking-widest"
              style={{
                background: card.tagBg,
                color: card.tagColor,
                fontFamily: 'Poppins',
              }}
            >
              {card.tag}
            </div>

            {/* Icon */}
            <div
              className="card-icon w-[52px] h-[52px] rounded-[14px] bg-gray-100 flex items-center justify-center text-2xl mb-[18px]"
              style={{ 
                fontFamily: 'Poppins',
                color: card.mode === 'warehouse' ? '#05807e' : '#25b1a6',
              }}
            >
              {card.icon}
            </div>

            <div className="font-extrabold text-xl text-[#0b5858] mb-2" style={{ fontFamily: 'Poppins' }}>
              {card.label}
            </div>
            <div className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: 'Poppins' }}>
              {card.desc}
            </div>

            {/* Arrow */}
            <div className="card-arrow mt-6 flex items-center gap-1.5 font-bold text-[13px]" style={{ fontFamily: 'Poppins' }}>
              <span>Record stock out</span>
              <span className="card-arrow-icon">→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Helper note */}
      <div
        className="mt-8 p-4 rounded-xl border-l-[3px] text-[13px] text-gray-700 leading-relaxed"
        style={{
          background: 'rgba(241, 14, 59, 0.06)',
          borderColor: '#f10e3b',
          fontFamily: 'Poppins',
        }}
      >
        <strong className="text-[#b00]">Note:</strong> All stock out movements permanently reduce{' '}
        <em>InventoryBalance</em>. This cannot be undone without a corrective Stock In entry.
      </div>

      {/* ── Modal pop-up ── */}
      {modalMode && (
        <StockOutModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          unitPrefill={modalMode === 'unit' ? unitPrefill : undefined}
          warehousePrefill={modalMode === 'warehouse' ? warehousePrefill : undefined}
          returnTo={returnTo}
        />
      )}
    </>
  );
}
