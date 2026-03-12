'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import InventoryDropdown from '@/app/sales-report/inventory/components/InventoryDropdown';
import SingleDatePicker from '@/components/SingleDatePicker';
import { useToast } from '@/app/sales-report/inventory/hooks/useToast';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { processStockOut } from '@/app/sales-report/inventory/lib/inventoryLedger';
import {
  loadInventoryDataset,
  inventoryItems,
  getDisplayableInventoryItems,
  inventoryWarehouseDirectory,
  inventoryUnits,
  isWarehouseActive,
} from '@/app/sales-report/inventory/lib/inventoryDataStore';
import { getTodayInPhilippineTime } from '@/lib/dateUtils';

// ─── Brand colors (unit mode from inventory StockOutModal) ─────────
const C = {
  darkTeal: '#0b5858',
  teal: '#05807e',
  bg: '#f8f8f8',
  red: '#f10e3b',
  redSoft: '#fff0f3',
  green: '#28950e',
  greenBg: '#f0faf0',
  lightGray: '#e5e7eb',
  midGray: '#9ca3af',
  darkGray: '#374151',
  white: '#ffffff',
  unGrad1: '#0f766e',
  unGrad2: '#14b8a6',
  unBtn: '#0f766e',
  unBookingBg: '#ecfeff',
  unBookingBorder: '#0f766e',
  unBookingText: '#0b5858',
};

const REASONS_UN = [
  'Guest Booking',
  'Room Preparation',
  'Damage Replacement',
  'Room Restocking',
  'Checkout Replenishment',
  'Other',
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1.5px solid ${C.lightGray}`,
  fontSize: 14,
  color: C.darkGray,
  background: C.white,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'Poppins',
  transition: 'border-color 0.15s',
};

function Field({
  label,
  required,
  hint,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.darkGray,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'Poppins',
        }}
      >
        {label}
        {required && <span style={{ color: C.red }}>*</span>}
        {hint && (
          <span style={{ fontWeight: 400, color: C.midGray, fontSize: 11 }}>· {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ label, color }: { label: string; color?: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: color ?? C.midGray,
        letterSpacing: 1.8,
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'Poppins',
      }}
    >
      <span>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.lightGray }} />
    </div>
  );
}

function StockPill({ available, reorder, unit }: { available: number; reorder: number; unit: string }) {
  const low = available <= reorder;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: low ? C.redSoft : C.greenBg,
        color: low ? C.red : C.green,
        fontFamily: 'Poppins',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: low ? C.red : C.green }} />
      {available} {unit}
      {low ? ' · Low' : ''}
    </span>
  );
}

interface LineItem {
  productId: string;
  quantity: string;
}

function LineItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  sourceWarehouse,
}: {
  item: LineItem;
  index: number;
  onUpdate: (i: number, k: keyof LineItem, v: string) => void;
  onRemove: (i: number) => void;
  sourceWarehouse?: string;
}) {
  const product = inventoryItems.find((p) => p.id === item.productId);
  const wh = sourceWarehouse
    ? inventoryWarehouseDirectory.find((w) => w.id === sourceWarehouse)
    : undefined;
  const whBalance = wh?.inventoryBalances.find((b) => b.productId === item.productId);
  const avail = sourceWarehouse && whBalance !== undefined
    ? whBalance.quantity
    : (product ? product.currentStock : 0);
  const over = !!(product && item.quantity && parseInt(item.quantity) > avail);

  const itemOptions = sourceWarehouse && wh
    ? wh.inventoryBalances
        .filter((b) => b.quantity > 0)
        .map((b) => {
          const p = inventoryItems.find((i) => i.id === b.productId);
          return { value: b.productId, label: `${p?.sku ?? b.productId} — ${b.productName}` };
        })
    : getDisplayableInventoryItems().map((p) => ({
        value: p.id,
        label: `${p.sku} — ${p.name}`,
      }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 36px',
        gap: 10,
        alignItems: 'start',
        padding: '14px',
        background: index % 2 === 0 ? C.bg : C.white,
        borderRadius: 12,
        border: `1.5px solid ${over ? C.red + '60' : C.lightGray}`,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {index === 0 && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Item <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <InventoryDropdown
          value={item.productId || ''}
          onChange={(value) => onUpdate(index, 'productId', value)}
          options={[
            { value: '', label: sourceWarehouse ? 'Select item…' : 'Select warehouse first' },
            ...itemOptions,
          ]}
          placeholder="Select item…"
          placeholderWhen=""
          hideIcon={true}
          fullWidth={true}
          minWidthClass="min-w-0"
          align="left"
          backdropZIndexClass="z-[10005]"
          menuZIndexClass="z-[10010]"
          useFixedPosition={true}
        />
        {product && <StockPill available={avail} reorder={product.minStock} unit={product.unit} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {index === 0 && (
          <label style={{ fontSize: 12, fontWeight: 600, color: C.darkGray, fontFamily: 'Poppins' }}>
            Qty <span style={{ color: C.red }}>*</span>
          </label>
        )}
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
          placeholder="0"
          style={{ ...inputStyle, borderColor: over ? C.red : C.lightGray }}
        />
        {over && (
          <span style={{ fontSize: 11, color: C.red, fontFamily: 'Poppins' }}>Exceeds stock</span>
        )}
      </div>
      <button
        onClick={() => onRemove(index)}
        style={{
          width: 36,
          height: 38,
          borderRadius: 8,
          border: `1.5px solid ${C.lightGray}`,
          background: 'none',
          color: C.midGray,
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: index === 0 ? 22 : 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddItemBtn({ onAdd, accent }: { onAdd: () => void; accent: string }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onAdd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%',
        padding: '11px',
        marginTop: 10,
        border: `2px dashed ${hov ? accent : C.lightGray}`,
        borderRadius: 10,
        background: 'none',
        cursor: 'pointer',
        color: hov ? accent : C.midGray,
        fontWeight: 600,
        fontSize: 13,
        fontFamily: 'Poppins',
        transition: 'all 0.15s',
      }}
    >
      + Add Another Item
    </button>
  );
}

interface UnitDraft {
  confirmedBy: string;
  idNumber: string;
  unit: string;
  booking: string;
  reason: string;
  srcWarehouse: string;
  date: string;
  reference: string;
  notes: string;
  items: LineItem[];
}

type BookingSummary = {
  id: string;
  code: string;
  guest: string;
  checkIn: string;
  checkOut: string;
  unit: string;
};

// TODO: Wire this up to real synced bookings when available.
const BOOKINGS: BookingSummary[] = [];

function UnitForm({ onDraftChange }: { onDraftChange: (draft: UnitDraft) => void }) {
  const authState = useMockAuth();
  const [confirmedBy, setConfirmedBy] = useState(authState.userProfile?.fullname || '');
  const [idNumber, setIdNumber] = useState(authState.user?.id || '');
  const [unit, setUnit] = useState('');
  const [booking, setBooking] = useState('');
  const [reason, setReason] = useState('');
  const [srcWarehouse, setSrcWarehouse] = useState('');
  const [date, setDate] = useState(getTodayInPhilippineTime());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: '' }]);
  const upd = (i: number, k: keyof LineItem, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? { ...it, [k]: v } : it)));
  const rem = (i: number) => setItems((p) => (p.length > 1 ? p.filter((_, ix) => ix !== i) : p));
  const bk = BOOKINGS.find((b) => b.id === booking);

  useEffect(() => {
    onDraftChange({
      confirmedBy,
      idNumber,
      unit,
      booking,
      reason,
      srcWarehouse,
      date,
      reference,
      notes,
      items,
    });
  }, [confirmedBy, idNumber, unit, booking, reason, srcWarehouse, date, reference, notes, items, onDraftChange]);

  const warehouses = inventoryWarehouseDirectory.filter((wh) => isWarehouseActive(wh));

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Confirmed By" required hint="Your name">
          <input
            type="text"
            value={confirmedBy}
            readOnly
            placeholder="e.g. Maria Santos"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </Field>
        <Field label="ID Number" required hint="Employee/Staff ID">
          <input
            type="text"
            value={idNumber}
            readOnly
            placeholder="e.g. EMP-2025-002"
            style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </Field>
      </div>
      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '14px 0 22px' }} />
      <SectionLabel label="UNIT & BOOKING" color={C.darkTeal} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Unit / Room" required>
          <InventoryDropdown
            value={unit}
            onChange={(value) => setUnit(value)}
            options={[
              { value: '', label: 'Select unit…' },
              ...inventoryUnits.map((u) => ({ value: u.id, label: u.name })),
            ]}
            placeholder="Select unit…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        <Field label="Link to Booking" hint="Optional">
          <InventoryDropdown
            value={booking}
            onChange={(value) => setBooking(value)}
            options={[
              { value: '', label: 'Select booking…' },
              ...BOOKINGS.map((b) => ({ value: b.id, label: `${b.code} · ${b.guest}` })),
            ]}
            placeholder="Select booking…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
      </div>

      {bk && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            background: C.unBookingBg,
            borderRadius: 12,
            borderLeft: `3px solid ${C.unBookingBorder}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { l: 'Guest', v: bk.guest },
            { l: 'Stay', v: `${bk.checkIn} → ${bk.checkOut}` },
            { l: 'Unit', v: bk.unit },
          ].map((m) => (
            <div key={m.l}>
              <div
                style={{
                  fontSize: 10,
                  color: C.unBookingText,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  marginBottom: 3,
                  fontFamily: 'Poppins',
                }}
              >
                {m.l}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.unBtn, fontFamily: 'Poppins' }}>
                {m.v}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Field label="Reason" required>
          <InventoryDropdown
            value={reason}
            onChange={(value) => setReason(value)}
            options={[
              { value: '', label: 'Select reason…' },
              ...REASONS_UN.map((r) => ({ value: r, label: r })),
            ]}
            placeholder="Select reason…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        <Field label="Pull from Warehouse" required>
          <InventoryDropdown
            value={srcWarehouse}
            onChange={(value) => setSrcWarehouse(value)}
            options={[
              { value: '', label: 'Select warehouse…' },
              ...warehouses.map((w) => ({ value: w.id, label: w.name })),
            ]}
            placeholder="Select warehouse…"
            placeholderWhen=""
            hideIcon={true}
            fullWidth={true}
            minWidthClass="min-w-0"
            align="left"
            backdropZIndexClass="z-[10005]"
            menuZIndexClass="z-[10010]"
            useFixedPosition={true}
          />
        </Field>
        <Field label="Date" required>
          <SingleDatePicker
            value={date}
            onChange={setDate}
            placeholder="Select date"
            calendarZIndex={10020}
          />
        </Field>
        <Field label="Reference No." hint="Optional">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. BK-2025-001"
            style={inputStyle}
          />
        </Field>
      </div>

      <div style={{ borderTop: `1.5px dashed ${C.lightGray}`, margin: '8px 0 22px' }} />
      <SectionLabel label="ITEMS TO ALLOCATE TO UNIT" color={C.darkTeal} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <LineItemRow
            key={i}
            item={it}
            index={i}
            onUpdate={upd}
            onRemove={rem}
            sourceWarehouse={srcWarehouse}
          />
        ))}
      </div>
      <AddItemBtn
        onAdd={() => setItems((p) => [...p, { productId: '', quantity: '' }])}
        accent={C.unBtn}
      />

      <Field label="Notes" style={{ marginTop: 16 }}>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional remarks for this unit allocation…"
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </Field>
    </>
  );
}

interface HousekeepingStockOutModalProps {
  onClose: () => void;
}

export default function HousekeepingStockOutModal({ onClose }: HousekeepingStockOutModalProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, setRefreshTick] = useState(0);
  const { error } = useToast();
  const [unitDraft, setUnitDraft] = useState<UnitDraft | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recordedItemsCount, setRecordedItemsCount] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setMounted(true);
  }, []);

  // Same data loading as inventory StockOutModal: loadInventoryDataset + refresh on movement/focus
  useEffect(() => {
    void loadInventoryDataset()
      .finally(() => {
        setRefreshTick((tick) => tick + 1);
      });

    const refresh = () => {
      void loadInventoryDataset(true).finally(() => {
        setRefreshTick((tick) => tick + 1);
      });
    };

    window.addEventListener('inventory:movement-updated', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('inventory:movement-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 230);
  };

  const handleSubmit = async () => {
    try {
      if (!unitDraft) {
        error('Form is still loading. Please try again.');
        return;
      }
      if (!unitDraft.unit || !unitDraft.srcWarehouse || !unitDraft.reason || !unitDraft.date) {
        error('Please fill unit, source warehouse, reason, and date.');
        return;
      }

      const validItems = unitDraft.items.filter(
        (entry) => entry.productId && Number(entry.quantity) > 0
      );
      if (!validItems.length) {
        error('Add at least one item with quantity.');
        return;
      }

      for (const entry of validItems) {
        await processStockOut({
          productId: entry.productId,
          warehouseId: unitDraft.srcWarehouse,
          quantity: Number(entry.quantity),
          reason: unitDraft.reason,
          date: unitDraft.date,
          reference: unitDraft.reference || unitDraft.booking || undefined,
          notes: unitDraft.notes || undefined,
          createdBy: unitDraft.confirmedBy || undefined,
          unitId: unitDraft.unit,
        });
      }

      setRecordedItemsCount(
        unitDraft.items.filter((e) => e.productId && Number(e.quantity) > 0).length
      );
      setShowSuccessModal(true);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('Stock-out error:', err);
      }
      error('We couldn’t complete the stock-out. Please try again.');
    }
  };

  const grad = `linear-gradient(135deg, ${C.unGrad1}, ${C.unGrad2})`;

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(17, 24, 39, 0.38)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: showSuccessModal ? 448 : 720,
            maxHeight: showSuccessModal ? 'auto' : '92vh',
            background: C.white,
            borderRadius: 22,
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
            transition: 'transform 0.26s cubic-bezier(0.34,1.4,0.64,1), opacity 0.22s ease',
            opacity: visible ? 1 : 0,
          }}
        >
          {!showSuccessModal && (
            <div
              style={{
                background: grad,
                padding: '22px 28px',
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 2,
                    color: 'rgba(255,255,255,0.52)',
                    marginBottom: 5,
                    fontFamily: 'Poppins',
                  }}
                >
                  HOUSEKEEPING · UNIT / ROOM
                </div>
                <div
                  style={{
                    color: C.white,
                    fontWeight: 800,
                    fontSize: 22,
                    marginBottom: 3,
                    fontFamily: 'Poppins',
                  }}
                >
                  Housekeeping Stock Out
                </div>
                <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, fontFamily: 'Poppins' }}>
                  Allocate items to a room or unit
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.18)',
                  color: C.white,
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              >
                ×
              </button>
            </div>
          )}

          {showSuccessModal ? (
            <div className="p-6" style={{ fontFamily: 'Poppins' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-gray-900">Stock out logged successfully</h2>
                  <p className="text-[12px] text-gray-600 mt-0.5">
                    {recordedItemsCount} item{recordedItemsCount !== 1 ? 's' : ''} deducted from inventory
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-gray-700 mb-5">
                You can review movements in the Stock Movement History.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-[13px] rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setShowSuccessModal(false);
                    handleClose();
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
                <UnitForm onDraftChange={setUnitDraft} />
              </div>

              <div
                style={{
                  padding: '16px 28px',
                  borderTop: `1px solid ${C.lightGray}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                  background: C.white,
                }}
              >
                <span style={{ fontSize: 12, color: C.midGray, fontFamily: 'Poppins' }}>
                  <span style={{ color: C.red }}>*</span> Required · Logged as <strong>Stock Out</strong>
                </span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleClose}
                    style={{
                      background: 'none',
                      border: `1.5px solid ${C.lightGray}`,
                      borderRadius: 10,
                      padding: '10px 22px',
                      cursor: 'pointer',
                      color: C.darkGray,
                      fontWeight: 600,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    style={{
                      background: C.unBtn,
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 26px',
                      cursor: 'pointer',
                      color: C.white,
                      fontWeight: 700,
                      fontSize: 14,
                      fontFamily: 'Poppins',
                      boxShadow: '0 4px 16px rgba(15,118,110,0.35)',
                      transition: 'filter 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                  >
                    Confirm Stock Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
