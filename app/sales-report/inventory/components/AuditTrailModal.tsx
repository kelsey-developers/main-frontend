'use client';

import { useEffect, useMemo, useState, type TouchEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import type { ReplenishmentItem } from '../types';
import StatusBadge from './StatusBadge';
import {
  inventoryStockMovements,
  inventoryUnitStockMovements,
  inventoryPurchaseOrders,
  inventoryPurchaseOrderLines,
  inventorySupplierDirectory,
} from '../lib/inventoryDataStore';

interface AuditTrailModalProps {
  item: ReplenishmentItem | null;
  onClose: () => void;
}

// -----------------------------------------------------------------------------
// BRAND TOKENS
// -----------------------------------------------------------------------------
const B = {
  primary: '#05807e',
  dark: '#0b5858',
  accent: '#d97706',
  tint10: '#e8f4f4',
  tint20: '#cce8e8',
};

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------
type MovementType = 'in' | 'out' | 'adjustment' | 'damage';
type DamageSeverity = 'Low' | 'Medium' | 'High';
type DamageStatus = 'Resolved' | 'Pending' | 'Under Review';
type POStatus = 'Received' | 'Pending' | 'Partial' | 'Cancelled';

interface Movement {
  id: number | string;
  date: string;
  time: string;
  type: MovementType;
  qty: number;
  unit: string;
  notes: string;
  user: string;
  ref?: string;
}

interface DamageAdjustmentView {
  id: number | string;
  qty: number;
  unit: string;
  severity: DamageSeverity;
  status: DamageStatus;
  description: string;
  reportedDate: string;
  reportedBy: string;
  reviewedDate?: string;
  reviewedBy?: string;
}

interface PurchaseOrderView {
  id: string;
  orderDate: string;
  status: POStatus;
  qty: number;
  unit: string;
  unitPrice: number;
  supplier: string;
}

interface AuditItem {
  name: string;
  sku: string;
  warehouse: string;
  supplier: string;
  unitCost: number;
  totalValue: number;
  status: 'Active' | 'Inactive';
  lastModified: string;
  modifiedBy: string;
  auditNotes: string;
  movements: Movement[];
  damageAdjustments: DamageAdjustmentView[];
  lastPurchaseOrder: PurchaseOrderView | null;
}

function useModalNavbarHide() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);
}

// -----------------------------------------------------------------------------
// SAMPLE DATA (mock fallback)
// TODO(backend): Replace this mock object with API response data once endpoint is ready.
// -----------------------------------------------------------------------------
const SAMPLE_ITEM: AuditItem = {
  name: 'Sample Item',
  sku: 'SAMPLE-001',
  warehouse: 'Warehouse',
  supplier: 'Sample Supplier',
  unitCost: 150,
  totalValue: 1200,
  status: 'Active',
  lastModified: 'Feb 25, 2025',
  modifiedBy: 'Inventory Manager',
  auditNotes: 'Recent damage incident resolved. Stock levels recovering after Q1 demand spike.',
  movements: [
    { id: 1, date: 'Feb 15, 2025', time: '08:00 AM', type: 'in', qty: 50, unit: 'pcs', notes: 'PO-2025-001 received', user: 'Admin User', ref: 'PO-2025-001' },
    { id: 2, date: 'Feb 20, 2025', time: '08:00 AM', type: 'out', qty: 30, unit: 'pcs', notes: 'Distributed to Unit 711', user: 'Warehouse Staff' },
    { id: 3, date: 'Feb 22, 2025', time: '10:30 AM', type: 'adjustment', qty: -12, unit: 'pcs', notes: 'Cycle count correction', user: 'Admin User' },
    { id: 4, date: 'Feb 24, 2025', time: '02:15 PM', type: 'damage', qty: 2, unit: 'pcs', notes: 'Stained beyond use - removed', user: 'Warehouse Staff' },
    { id: 5, date: 'Mar 01, 2025', time: '09:00 AM', type: 'in', qty: 20, unit: 'pcs', notes: 'PO-2025-009 received', user: 'Admin User', ref: 'PO-2025-009' },
  ],
  damageAdjustments: [
    {
      id: 1,
      qty: 12,
      unit: 'pcs',
      severity: 'Medium',
      status: 'Resolved',
      description: 'Mold damage in storage area',
      reportedDate: 'Feb 25, 2025',
      reportedBy: 'John Inventory',
      reviewedDate: 'Feb 26, 2025',
      reviewedBy: 'Maria QA',
    },
    {
      id: 2,
      qty: 3,
      unit: 'pcs',
      severity: 'Low',
      status: 'Pending',
      description: 'Fraying on edges - minor wear from repeated use',
      reportedDate: 'Mar 02, 2025',
      reportedBy: 'Warehouse Staff',
    },
  ],
  lastPurchaseOrder: {
    id: 'PO-2025-009',
    orderDate: 'Feb 28, 2025',
    status: 'Received',
    qty: 20,
    unit: 'pcs',
    unitPrice: 150,
    supplier: 'Clean & Co',
  },
};

// -----------------------------------------------------------------------------
// STYLE CONFIG MAPS
// -----------------------------------------------------------------------------
const MOV_STYLE: Record<MovementType, { color: string; bg: string; border: string; sign: string; iconBg: string }> = {
  in: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', sign: '+', iconBg: '#dcfce7' },
  out: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', sign: '-', iconBg: '#f1f5f9' },
  adjustment: { color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe', sign: '+/-', iconBg: '#dbeafe' },
  damage: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', sign: '-', iconBg: '#fee2e2' },
};

const SEV_STYLE: Record<DamageSeverity, { color: string; bg: string; border: string }> = {
  Low: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  Medium: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  High: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const DST_STYLE: Record<DamageStatus, { color: string; bg: string; border: string }> = {
  Resolved: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  Pending: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  'Under Review': { color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
};

const PO_STYLE: Record<POStatus, { color: string; bg: string }> = {
  Received: { color: '#15803d', bg: '#f0fdf4' },
  Pending: { color: '#b45309', bg: '#fffbeb' },
  Partial: { color: '#0369a1', bg: '#eff6ff' },
  Cancelled: { color: '#dc2626', bg: '#fef2f2' },
};

// -----------------------------------------------------------------------------
// SMALL HELPERS
// -----------------------------------------------------------------------------
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.11em',
      color: '#94a3b8',
      textTransform: 'uppercase',
      marginBottom: '12px',
    }}
  >
    {children}
  </div>
);

const Divider = () => <div style={{ height: '1px', background: B.tint10, margin: '24px 0' }} />;

const CloseBtn = ({ onClose }: { onClose: () => void }) => (
  <button
    onClick={onClose}
    aria-label="Close"
    style={{
      background: 'rgba(255,255,255,0.15)',
      border: 'none',
      borderRadius: '8px',
      width: '34px',
      height: '34px',
      cursor: 'pointer',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
    }}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  </button>
);

const MetaCards = ({ item, isMobile, itemId, onClose }: { item: AuditItem; isMobile: boolean; itemId: string; onClose: () => void }) => {
  const router = useRouter();
  
  const handleSupplierClick = () => {
    onClose();
    router.push(`/sales-report/inventory/purchase-orders/create?itemId=${encodeURIComponent(itemId)}`);
  };

  const cards = [
    { label: 'WAREHOUSE', value: item.warehouse, sub: undefined, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0', clickable: false, isStatus: false },
    { label: 'SUPPLIER', value: item.supplier, sub: undefined, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0', clickable: true, onClick: handleSupplierClick, isStatus: false },
    { label: 'UNIT COST', value: `PHP ${item.unitCost}`, sub: undefined, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0', clickable: false, isStatus: false },
    { label: 'TOTAL VALUE', value: `PHP ${item.totalValue.toLocaleString()}`, sub: undefined, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0', clickable: false, isStatus: false },
    { label: 'STATUS', value: item.status, sub: undefined, color: item.status === 'Active' ? '#15803d' : '#dc2626', bg: '#f8fafc', border: '#fbcfe8', clickable: false, isStatus: true },
    { label: 'LAST MODIFIED', value: item.lastModified, sub: `by ${item.modifiedBy}`, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0', clickable: false, isStatus: false },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: '9px',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          onClick={c.clickable ? c.onClick : undefined}
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            padding: '11px 13px',
            cursor: c.clickable ? 'pointer' : 'default',
            transition: c.clickable ? 'all 0.2s ease' : 'none',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (c.clickable) {
              e.currentTarget.style.background = '#e8f4f4';
              e.currentTarget.style.borderColor = B.primary;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (c.clickable) {
              e.currentTarget.style.background = c.bg;
              e.currentTarget.style.borderColor = c.border;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '5px' }}>
            {c.label}
            {c.clickable && (
              <span style={{ marginLeft: '4px', fontSize: '8px', color: B.primary }}>▸</span>
            )}
          </div>
          {c.isStatus ? (
            <StatusBadge active={c.value === 'Active'} />
          ) : c.label === 'SUPPLIER' && !c.value ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
              }}
            >
              None
            </span>
          ) : (
            <>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: c.clickable ? B.primary : c.color }}>{c.value}</div>
              {c.sub && <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>{c.sub}</div>}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const StorageDistributionSection = ({ item, isMobile }: { item: AuditItem; isMobile: boolean }) => {
  // Extract unit distributions from movements
  const unitDistributions = useMemo(() => {
    const distributions: Record<string, { name: string; quantity: number }> = {};
    
    item.movements.forEach((movement) => {
      if (movement.type === 'out' && movement.notes.includes('Unit')) {
        // Extract unit name from notes (e.g., "Distributed to Unit 711")
        const match = movement.notes.match(/Unit\s+(\d+)/);
        if (match) {
          const unitName = `Unit ${match[1]}`;
          if (!distributions[unitName]) {
            distributions[unitName] = { name: unitName, quantity: 0 };
          }
          distributions[unitName].quantity += movement.qty;
        }
      }
    });
    
    return Object.values(distributions);
  }, [item.movements]);

  return (
    <div style={{ 
      background: 'white', 
      border: '1.5px solid #e8f4f4', 
      borderRadius: '12px', 
      padding: '16px',
      borderLeft: `3px solid ${B.primary}`
    }}>
      {/* Warehouse Storage */}
      <div style={{ marginBottom: unitDistributions.length > 0 ? '16px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 14V6L8 2L14 6V14H2Z" stroke={B.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 14V9H11V14" stroke={B.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: B.dark }}>MAIN WAREHOUSE</span>
        </div>
        <div style={{ paddingLeft: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            {item.warehouse}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Primary storage location
          </div>
        </div>
      </div>

      {/* Unit Distributions */}
      {unitDistributions.length > 0 && (
        <>
          <div style={{ height: '1px', background: '#e8f4f4', margin: '12px 0' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke={B.primary} strokeWidth="1.5"/>
                <path d="M6 2V14M10 2V14M2 6H14M2 10H14" stroke={B.primary} strokeWidth="1.5"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: B.dark }}>DISTRIBUTED TO UNITS</span>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: '8px',
              paddingLeft: '24px'
            }}>
              {unitDistributions.map((dist, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: '#e8f4f4',
                    border: `1px solid ${B.tint20}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: B.dark }}>{dist.name}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    color: B.primary,
                    background: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {dist.quantity} {item.movements[0]?.unit || 'pcs'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {unitDistributions.length === 0 && (
        <div style={{ 
          paddingLeft: '24px', 
          marginTop: '8px',
          fontSize: '11.5px', 
          color: '#94a3b8',
          fontStyle: 'italic'
        }}>
          No unit distributions recorded
        </div>
      )}
    </div>
  );
};

const DamageCard = ({ d }: { d: DamageAdjustmentView }) => {
  const sev = SEV_STYLE[d.severity];
  const dst = DST_STYLE[d.status];
  return (
    <div
      style={{
        background: 'white',
        border: '1.5px solid #f1f5f9',
        borderLeft: `3px solid ${sev.color}`,
        borderRadius: '12px',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{d.qty} {d.unit} damaged</span>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: sev.bg,
              color: sev.color,
              border: `1px solid ${sev.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            Severity: {d.severity}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: '99px',
            background: dst.bg,
            color: dst.color,
            border: `1px solid ${dst.border}`,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {d.status}
        </span>
      </div>

      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e8edf4',
          borderRadius: '7px',
          padding: '9px 12px',
          marginBottom: '10px',
          fontSize: '13px',
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        {d.description}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
          <strong style={{ color: '#64748b', fontWeight: 600 }}>Reported:</strong> {d.reportedDate} · {d.reportedBy}
        </span>
        {d.reviewedDate && (
          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            <strong style={{ color: '#64748b', fontWeight: 600 }}>Reviewed:</strong> {d.reviewedDate} · {d.reviewedBy}
          </span>
        )}
      </div>
    </div>
  );
};

const POBlock = ({ po, isMobile }: { po: PurchaseOrderView; isMobile: boolean }) => {
  const ps = PO_STYLE[po.status];
  return (
    <div style={{ background: '#f0f6ff', border: '1.5px solid #bfdbfe', borderLeft: '3px solid #60a5fa', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#1d4ed8', marginBottom: '14px' }}>
        LAST PURCHASE ORDER
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
          gap: '12px',
        }}
      >
        {[
          { label: 'PO ID', value: po.id, mono: true },
          { label: 'ORDER DATE', value: po.orderDate, mono: false },
          { label: 'QTY / PRICE', value: `${po.qty} ${po.unit} · PHP ${po.unitPrice}`, mono: false },
        ].map((f, i) => (
          <div key={i}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#3b82f6', marginBottom: '4px' }}>{f.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: f.mono ? "'DM Mono', monospace" : 'inherit' }}>{f.value}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', color: '#3b82f6', marginBottom: '4px' }}>STATUS</div>
          <span
            style={{
              display: 'inline-flex',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '99px',
              background: ps.bg,
              color: ps.color,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {po.status}
          </span>
        </div>
      </div>
    </div>
  );
};

const MovementCard = ({ mv }: { mv: Movement }) => {
  const m = MOV_STYLE[mv.type];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '13px 14px' }}>
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: m.iconBg,
          border: `2px solid ${m.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          color: m.color,
          flexShrink: 0,
        }}
      >
        {m.sign}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{Math.abs(mv.qty)} {mv.unit}</span>
            <span style={{ fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: m.bg, color: m.color, border: `1px solid ${m.border}`, textTransform: 'capitalize' }}>
              {mv.type}
            </span>
            {mv.ref && <span style={{ fontSize: '11px', fontFamily: "'DM Mono', monospace", color: B.primary }}>{mv.ref}</span>}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'DM Mono', monospace", color: m.color, flexShrink: 0 }}>
            {m.sign}{Math.abs(mv.qty)} {mv.unit}
          </span>
        </div>
        <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '3px', lineHeight: 1.4 }}>{mv.notes}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{mv.date} · {mv.time} · {mv.user}</div>
      </div>
    </div>
  );
};

const MovementHistory = ({ movements }: { movements: Movement[] }) => (
  <div style={{ border: `1px solid ${B.tint20}`, borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
    <div style={{ background: `linear-gradient(90deg, ${B.dark}, ${B.primary})`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)' }}>MOVEMENT</span>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.65)' }}>QTY CHANGE</span>
    </div>
    {movements.length === 0 ? (
      <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontFamily: 'Poppins' }}>
        No movement history
      </div>
    ) : (
      movements.map((mv, i) => (
        <div key={mv.id} style={{ borderBottom: i < movements.length - 1 ? `1px solid ${B.tint10}` : 'none' }}>
          <MovementCard mv={mv} />
        </div>
      ))
    )}
  </div>
);

const toDateText = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const toTimeText = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const mapDamageStatus = (value: string): DamageStatus => {
  if (value === 'resolved') return 'Resolved';
  if (value === 'in-review') return 'Under Review';
  return 'Pending';
};

const mapDamageSeverity = (value: string): DamageSeverity => {
  if (value === 'high') return 'High';
  if (value === 'medium') return 'Medium';
  return 'Low';
};

const mapPOStatus = (value?: string): POStatus => {
  if (value === 'received') return 'Received';
  if (value === 'cancelled') return 'Cancelled';
  return 'Pending';
};

const normalizeAuditItem = (source: ReplenishmentItem): AuditItem => {
  // Use live data: source.stockMovements if provided, else inventoryStockMovements + unit movements
  const getMovementRows = (): Movement[] => {
    if (source.stockMovements && source.stockMovements.length > 0) {
      const sorted = [...source.stockMovements].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return sorted.map((movement, index) => ({
        id: movement.id ?? `mv-${index + 1}`,
        date: toDateText(movement.createdAt) ?? '',
        time: toTimeText(movement.createdAt) ?? '',
        type: movement.type as MovementType,
        qty: movement.quantity,
        unit: source.unit,
        notes: (movement.notes || 'No note provided.').trim(),
        user: movement.createdBy || 'System User',
        ref: movement.referenceId,
      }));
    }
    const warehouseMoves = inventoryStockMovements
      .filter((m) => m.productId === source.id)
      .map((m) => ({
        id: m.id,
        ts: new Date(m.createdAt || m.movementDateTime || 0).getTime(),
        movement: m,
      }));
    const unitMoves = inventoryUnitStockMovements
      .filter((m) => m.productId === source.id)
      .map((m) => ({
        id: m.id,
        ts: new Date(m.recordedAt || 0).getTime(),
        movement: m,
      }));
    const merged = [...warehouseMoves, ...unitMoves].sort((a, b) => b.ts - a.ts);
    return merged.map(({ id, movement }, index) => {
      if ('quantity' in movement && 'createdAt' in movement) {
        const sm = movement as { quantity: number; createdAt?: string; notes?: string; createdBy?: string; referenceId?: string };
        return {
          id: id ?? `mv-${index + 1}`,
          date: toDateText(sm.createdAt) ?? '',
          time: toTimeText(sm.createdAt) ?? '',
          type: (movement as { type?: 'in' | 'out' }).type ?? 'out',
          qty: sm.quantity,
          unit: source.unit,
          notes: (sm.notes || 'No note provided.').trim(),
          user: sm.createdBy || 'System User',
          ref: sm.referenceId,
        };
      }
      const um = movement as { quantity: number; recordedAt?: string; recordedDate?: string; recordedTime?: string; reason?: string; createdBy?: string; referenceId?: string };
      const dtStr = um.recordedAt || (um.recordedDate ? `${um.recordedDate}T${um.recordedTime || '00:00'}` : '');
      return {
        id: id ?? `mv-${index + 1}`,
        date: toDateText(dtStr) ?? '',
        time: toTimeText(dtStr) ?? um.recordedTime ?? '',
        type: 'out' as MovementType,
        qty: um.quantity,
        unit: source.unit,
        notes: (um.reason || 'No note provided.').trim(),
        user: um.createdBy || 'System User',
        ref: um.referenceId,
      };
    });
  };
  const movementRows = getMovementRows();

  const damageRows: DamageAdjustmentView[] = source.damageAdjustments && source.damageAdjustments.length > 0
    ? source.damageAdjustments.map((damage, index) => ({
        id: damage.id ?? `da-${index + 1}`,
        qty: damage.quantity,
        unit: source.unit,
        severity: mapDamageSeverity(damage.severity),
        status: mapDamageStatus(damage.status),
        description: (damage.notes || 'No description provided.').trim(),
        reportedDate: toDateText(damage.reportedAt) || SAMPLE_ITEM.damageAdjustments[Math.min(index, SAMPLE_ITEM.damageAdjustments.length - 1)].reportedDate,
        reportedBy: damage.reportedBy || 'Unknown User',
        reviewedDate: toDateText(damage.reviewedAt),
        reviewedBy: damage.reviewedBy,
      }))
    : SAMPLE_ITEM.damageAdjustments;

  const getLastPO = (): PurchaseOrderView | null => {
    const productLines = inventoryPurchaseOrderLines
      .filter((l) => l.productId === source.id)
      .map((line) => {
        const po = inventoryPurchaseOrders.find((p) => p.id === line.poId);
        return { line, po };
      })
      .filter((x): x is { line: typeof x.line; po: NonNullable<typeof x.po> } => x.po != null)
      .sort((a, b) => new Date(b.po.orderDate).getTime() - new Date(a.po.orderDate).getTime());
    const latest = productLines[0];
    if (!latest) {
      if (source.lastPurchaseOrder?.id) {
        return {
          id: source.lastPurchaseOrder.id,
          orderDate: toDateText(source.lastPurchaseOrder.orderDate) ?? '',
          status: mapPOStatus(source.lastPurchaseOrder.status),
          qty: Math.max(source.shortfall, 1),
          unit: source.unit,
          unitPrice: source.unitCost,
          supplier: source.supplierName || '',
        };
      }
      return null;
    }
    const supplier = inventorySupplierDirectory.find((s) => s.id === latest.po.supplierId);
    return {
      id: latest.po.id,
      orderDate: toDateText(latest.po.orderDate) ?? '',
      status: mapPOStatus(latest.po.status),
      qty: latest.line.quantity,
      unit: source.unit,
      unitPrice: latest.line.unitPrice || source.unitCost,
      supplier: supplier?.name ?? '',
    };
  };
  const normalizedPO = getLastPO();

  return {
    name: source.name || SAMPLE_ITEM.name,
    sku: source.sku || SAMPLE_ITEM.sku,
    warehouse: source.warehouseName || SAMPLE_ITEM.warehouse,
    supplier: source.supplierName || '',
    unitCost: source.unitCost || SAMPLE_ITEM.unitCost,
    totalValue: source.totalValue || SAMPLE_ITEM.totalValue,
    status: source.isActive ? 'Active' : 'Inactive',
    lastModified: toDateText(source.updatedAt) || SAMPLE_ITEM.lastModified,
    modifiedBy: source.lastModifiedBy || SAMPLE_ITEM.modifiedBy,
    auditNotes: source.auditNotes && source.auditNotes.trim().length > 0 ? source.auditNotes : SAMPLE_ITEM.auditNotes,
    movements: movementRows,
    damageAdjustments: damageRows,
    lastPurchaseOrder: normalizedPO,
  };
};

const AuditTrailModal = ({ item, onClose }: AuditTrailModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [movementRefreshTick, setMovementRefreshTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onRefresh = () => setMovementRefreshTick((t) => t + 1);
    window.addEventListener('inventory:movement-updated', onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      window.removeEventListener('inventory:movement-updated', onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, []);

  useEffect(() => {
    if (!item) {
      document.body.style.overflow = '';
      return;
    }

    const onResize = () => setIsMobile(window.innerWidth < 600);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    onResize();
    document.body.style.overflow = 'hidden';
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  const viewItem = useMemo(() => {
    if (!item) return null;
    return normalizeAuditItem(item);
  }, [item, movementRefreshTick]);

  if (!viewItem || !mounted) return null;
  const pendingDamage = viewItem.damageAdjustments.filter((d) => d.status !== 'Resolved').length;

  const onSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    setSwipeStartY(event.touches[0].clientY);
    setIsSwiping(true);
  };

  const onSwipeMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isMobile || swipeStartY === null) return;
    const nextOffset = event.touches[0].clientY - swipeStartY;
    setSwipeOffsetY(Math.max(0, Math.min(nextOffset, 260)));
  };

  const onSwipeEnd = () => {
    if (!isMobile) return;
    if (swipeOffsetY > 95) {
      onClose();
      return;
    }
    setIsSwiping(false);
    setSwipeStartY(null);
    setSwipeOffsetY(0);
  };

  return createPortal(
    <>
      <style>{`
        @keyframes auditMobileSheetIn {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Audit trail for ${viewItem.name}`}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(17, 24, 39, 0.38)',
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: isMobile ? 0 : '20px',
          transition: 'opacity 0.24s ease-in-out',
        }}
      >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: isMobile ? '20px 20px 0 0' : '18px',
          width: isMobile ? '100%' : 'min(760px, 96vw)',
          height: isMobile ? '92dvh' : 'auto',
          minHeight: isMobile ? '90dvh' : '72vh',
          maxHeight: isMobile ? '92dvh' : '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 72px rgba(5,60,60,0.22), 0 4px 16px rgba(0,0,0,0.08)',
          fontFamily: "'Poppins', sans-serif",
          transform: isMobile ? `translateY(${swipeOffsetY}px)` : 'translateY(0)',
          transition: isSwiping ? 'none' : 'transform 0.2s ease-in-out',
          animation: isMobile ? 'auditMobileSheetIn 260ms ease-in-out' : 'none',
        }}
      >
        <div
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          style={{
            background: `linear-gradient(120deg, ${B.dark} 0%, ${B.primary} 100%)`,
            padding: isMobile ? '18px 20px 20px' : '22px 28px 24px',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {isMobile && <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Audit Trail
              </div>
              <h2 style={{ fontSize: isMobile ? '20px' : '23px', fontWeight: 700, color: 'white', margin: '0 0 5px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {viewItem.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.5)' }}>
                  SKU: {viewItem.sku}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: '99px',
                    background: viewItem.status === 'Active' ? 'rgba(134,239,172,0.2)' : 'rgba(252,165,165,0.2)',
                    color: viewItem.status === 'Active' ? '#86efac' : '#fca5a5',
                    border: viewItem.status === 'Active' ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(252,165,165,0.35)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {viewItem.status}
                </span>
                {pendingDamage > 0 && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      padding: '2px 9px',
                      borderRadius: '99px',
                      background: 'rgba(252,165,165,0.18)',
                      color: '#fca5a5',
                      border: '1px solid rgba(252,165,165,0.3)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {pendingDamage} damage pending
                  </span>
                )}
              </div>
            </div>
            {!isMobile && <CloseBtn onClose={onClose} />}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px 32px' : '24px 28px 28px' }}>
          <SectionLabel>Overview</SectionLabel>
          <MetaCards item={viewItem} isMobile={isMobile} itemId={item!.id} onClose={onClose} />

          <Divider />

          <SectionLabel>Storage & Distribution</SectionLabel>
          <StorageDistributionSection item={viewItem} isMobile={isMobile} />

          <Divider />

          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderLeft: `3px solid ${B.accent}`, borderRadius: '11px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L13 12H1L7 1.5Z" fill="#fef9c3" stroke="#d97706" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M7 5.5V8.5" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.7" fill="#d97706" />
              </svg>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: B.accent }}>AUDIT NOTES</span>
            </div>
            <p style={{ fontSize: '13px', color: '#78350f', margin: 0, lineHeight: 1.65 }}>{viewItem.auditNotes}</p>
          </div>

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionLabel>Damage Adjustments</SectionLabel>
            {viewItem.damageAdjustments.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: pendingDamage > 0 ? '#fef2f2' : '#f0fdf4', color: pendingDamage > 0 ? '#dc2626' : '#15803d', marginTop: '-8px' }}>
                {viewItem.damageAdjustments.length} report{viewItem.damageAdjustments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {viewItem.damageAdjustments.map((d) => (
              <DamageCard key={d.id} d={d} />
            ))}
          </div>

          <Divider />

          <SectionLabel>Last Purchase Order</SectionLabel>
          {viewItem.lastPurchaseOrder ? (
            <POBlock po={viewItem.lastPurchaseOrder} isMobile={isMobile} />
          ) : (
            <div style={{ border: `1px solid ${B.tint20}`, borderRadius: '12px', padding: '24px 16px', background: 'white', textAlign: 'center', fontSize: '13px', color: '#64748b', fontFamily: 'Poppins' }}>
              No purchase order
            </div>
          )}

          <Divider />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionLabel>Stock Movement History</SectionLabel>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '-8px' }}>
              {viewItem.movements.length === 0 ? 'No movement history' : `${viewItem.movements.length} entries`}
            </span>
          </div>
          <MovementHistory movements={viewItem.movements} />
        </div>
      </div>
      </div>
    </>,
    document.body
  );
};

export default AuditTrailModal;
