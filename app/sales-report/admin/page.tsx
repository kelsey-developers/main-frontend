'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadInventoryDataset,
  inventoryItems,
  inventorySupplierDirectory,
  inventoryWarehouseDirectory,
  inventoryPurchaseOrders,
  inventoryStockMovements,
  inventoryDamageAdjustments,
} from '../inventory/lib/inventoryDataStore';
import { AdminPageHeader, AdminStatCard, AdminSection } from './components';
import type { ChargeType } from '../finance/types';
import { fetchChargeTypes } from '../finance/lib/chargeTypesService';

const SECTION_LINKS = [
  {
    href: '/sales-report/admin/inventory-setup',
    title: 'Inventory Setup',
    desc: 'Items, categories, suppliers, warehouses, units, and stock rules.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
      </svg>
    ),
  },
  {
    href: '/sales-report/admin/replenishment',
    title: 'Replenishment',
    desc: 'Create POs, monitor receiving, control cancel/edit operations.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: '/sales-report/admin/charges-addons',
    title: 'Charges & Add-ons',
    desc: 'Configure pricing add-ons like cleaning fee, extra head, early check-in.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/sales-report/admin/approval-queue',
    title: 'Approval Queue',
    desc: 'Approve flagged stock-out exceptions, write-offs, and manual overrides.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/sales-report/admin/audit-alerts',
    title: 'Audit & Alerts',
    desc: 'Review stock movements, low-stock flags, and repeat damage patterns.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: '/sales-report/admin/access',
    title: 'Access Control',
    desc: 'Set who can stock out, approve requests, or view only.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function AdminOverviewPage() {
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [, setRefresh] = useState(0);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadInventoryDataset(true);
        if (mounted) setRefresh((r) => r + 1);
      } finally {
        if (mounted) setInventoryLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const chargeData = await fetchChargeTypes();
        if (!mounted) return;
        setChargeTypes(chargeData);
      } catch {
        // keep empty array on error
      } finally {
        if (mounted) setMasterLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const statCards = [
    { title: 'Items Tracked',     value: inventoryItems.length,                                          accent: 'teal'  as const },
    { title: 'Suppliers',         value: inventorySupplierDirectory.length,                               accent: 'teal'  as const },
    { title: 'Warehouses',        value: inventoryWarehouseDirectory.length,                              accent: 'slate' as const },
    { title: 'Pending POs',       value: inventoryPurchaseOrders.filter((e) => e.status === 'pending').length, accent: 'amber' as const },
    { title: 'Movements Logged',  value: inventoryStockMovements.length,                                  accent: 'slate' as const },
    { title: 'Damage Cases',      value: inventoryDamageAdjustments.length,                               accent: 'red'   as const },
  ];

  return (
    <div style={{ fontFamily: 'Poppins' }} className="space-y-8 pb-10">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Inventory Admin Console"
        description="Govern master data, pricing, stock rules, approvals, and audit. All data is live from your connected backend."
      />

      {/* ── INVENTORY STAT CARDS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <AdminStatCard
            key={card.title}
            label={card.title}
            value={inventoryLoading ? '—' : card.value}
            accent={card.accent}
          />
        ))}
      </div>

      {/* ── MASTER DATA: UNITS + CHARGES SIDE BY SIDE ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* PRODUCT PRICE LIST */}
        <AdminSection
          title="Product Price List"
          subtitle="All received inventory products and their unit costs"
          headerAction={
            <Link
              href="/sales-report/admin/inventory-setup"
              className="text-xs font-semibold text-[#0B5858] hover:underline whitespace-nowrap"
            >
              Manage products →
            </Link>
          }
        >
          {/* Fixed-height scrollable body — header sticky, rows scroll */}
          <div className="flex flex-col" style={{ height: 320 }}>
            <div className="overflow-x-auto flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#0b5858] to-[#05807e]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {inventoryLoading ? (
                    <TableSkeleton cols={5} />
                  ) : inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                        No products found. Products appear here once a goods receipt is created.
                      </td>
                    </tr>
                  ) : (
                    inventoryItems.map((p) => (
                      <tr key={p.id} className="hover:bg-[#f0fafa] transition-colors">
                        <td className="px-4 py-3 text-gray-900 font-medium">
                          <span className="line-clamp-1">{p.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{p.sku || '—'}</td>
                        <td className="px-4 py-3">
                          {p.category ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-[#e8f4f4] text-[#0b5858] text-xs font-medium capitalize">
                              {p.category}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                          ₱{p.unitCost.toLocaleString()}
                          <span className="text-gray-400 font-normal text-xs">/{p.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={p.isLowStock ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                            {p.currentStock.toLocaleString()}
                          </span>
                          {p.isLowStock && (
                            <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">LOW</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {inventoryLoading ? 'Loading…' : `${inventoryItems.length} product${inventoryItems.length !== 1 ? 's' : ''} loaded`}
          </div>
        </AdminSection>

        {/* CHARGES & ADD-ONS */}
        <AdminSection
          title="Charges & Add-ons"
          subtitle="All active charge types configured in the system"
          headerAction={
            <Link
              href="/sales-report/admin/charges-addons"
              className="text-xs font-semibold text-[#0B5858] hover:underline whitespace-nowrap"
            >
              Manage charges →
            </Link>
          }
        >
          {/* Fixed-height scrollable body — header sticky, rows scroll */}
          <div className="flex flex-col" style={{ height: 320 }}>
            <div className="overflow-x-auto flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#0b5858] to-[#05807e]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Charge</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Pricing model</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Default</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {masterLoading ? (
                    <TableSkeleton cols={4} />
                  ) : chargeTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                        No charge types configured yet.{' '}
                        <Link href="/sales-report/admin/charges-addons" className="text-[#0B5858] font-medium underline">
                          Add one now →
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    chargeTypes.map((c) => (
                      <tr key={c.id} className="hover:bg-[#f0fafa] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 line-clamp-1">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.exampleLabel}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                          {c.defaultAmount != null ? `₱${c.defaultAmount.toLocaleString()}` : <span className="text-gray-400 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${c.appliedToBills ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.appliedToBills ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            {masterLoading ? 'Loading…' : `${chargeTypes.length} charge type${chargeTypes.length !== 1 ? 's' : ''} loaded`}
          </div>
        </AdminSection>
      </div>

      {/* ── BOTTOM ROW: SECTIONS + QUICK ACCESS ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">

        {/* ADMIN SECTIONS NAV */}
        <AdminSection title="Admin Sections" subtitle="Navigate to specific admin modules">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTION_LINKS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3.5 hover:bg-[#e8f4f4] hover:border-[#0B5858]/40 transition-colors group"
              >
                <span className="mt-0.5 flex-shrink-0 text-[#0B5858] group-hover:scale-110 transition-transform">
                  {section.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#0b5858]">{section.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </AdminSection>

        {/* QUICK ACCESS + GUARDRAILS */}
        <div className="space-y-6">
          <AdminSection title="Quick Access" subtitle="Jump to key dashboards">
            <div className="p-5 space-y-3">
              {[
                { href: '/sales-report/inventory', label: 'Inventory Dashboard', sub: 'Stock, warehouses, POs, movements' },
                { href: '/sales-report/finance',   label: 'Finance Dashboard',   sub: 'Revenue, bookings, charges, damage' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-[#0B5858] hover:ring-2 hover:ring-[#0B5858]/15 transition-all group"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0B5858]">{link.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{link.sub}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0B5858] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </AdminSection>

          <AdminSection title="Admin Guardrails">
            <div className="p-5 space-y-2.5">
              {[
                { type: 'do',    text: 'Require reason and reference for every stock-out.' },
                { type: 'dont',  text: 'Edit quantity directly without a movement trail.' },
                { type: 'do',    text: 'Keep housekeeping and inventory on one stock movement logic.' },
                { type: 'dont',  text: 'Delete movement history or bypass approvals.' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
                    item.type === 'do'
                      ? 'border border-[#cce8e8] bg-[#e8f4f4] text-[#0b5858]'
                      : 'border border-[#fdd8e0] bg-[#fff3f6] text-[#b4234d]'
                  }`}
                >
                  <span className="font-bold flex-shrink-0">{item.type === 'do' ? '✓' : '✕'}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>
      </div>
    </div>
  );
}
