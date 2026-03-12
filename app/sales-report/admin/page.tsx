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

const sectionLinks = [
  { href: '/sales-report/admin/inventory-setup', title: 'Inventory Setup', desc: 'Manage items, categories, suppliers, warehouses, units, and stock rules.' },
  { href: '/sales-report/admin/replenishment', title: 'Replenishment', desc: 'Create POs, monitor receiving, and control cancel/edit operations.' },
  { href: '/sales-report/admin/approval-queue', title: 'Approval Queue', desc: 'Approve flagged stock-out exceptions, write-offs, and manual overrides.' },
  { href: '/sales-report/admin/audit-alerts', title: 'Audit and Alerts', desc: 'Review who moved stock, why, and track low-stock or repeat-damage alerts.' },
  { href: '/sales-report/admin/access', title: 'Access Control', desc: 'Set who can stock out, approve requests, or view only.' },
];

const DASHBOARD_LINKS = [
  { href: '/sales-report/inventory', title: 'Inventory Dashboard', desc: 'Track stock, items, warehouses, purchase orders, and movements.' },
  { href: '/sales-report/finance', title: 'Finance Dashboard', desc: 'Revenue, bookings, damage impact, and export for accounting.' },
];

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadInventoryDataset(true)
      .then(() => { if (mounted) setRefresh((r) => r + 1); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const cards = [
    { title: 'Items Tracked', value: inventoryItems.length, accent: 'teal' as const },
    { title: 'Suppliers', value: inventorySupplierDirectory.length, accent: 'teal' as const },
    { title: 'Warehouses', value: inventoryWarehouseDirectory.length, accent: 'slate' as const },
    { title: 'Pending POs', value: inventoryPurchaseOrders.filter((e) => e.status === 'pending').length, accent: 'amber' as const },
    { title: 'Movements Logged', value: inventoryStockMovements.length, accent: 'slate' as const },
    { title: 'Damage Cases', value: inventoryDamageAdjustments.length, accent: 'red' as const },
  ];

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Inventory Admin Console"
        description="Govern master data, stock rules, approvals, and audit. Admin and finance validate usage and cost impact to keep stock integrity."
      />

      {/* Quick access to Inventory and Finance dashboards — same pattern as root admin */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DASHBOARD_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-gray-200 bg-white shadow-sm text-gray-900 hover:ring-2 hover:ring-[#0B5858]/20 hover:border-[#0B5858] transition-colors group"
            >
              <svg className="w-6 h-6 text-[#0B5858] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="block font-medium group-hover:text-[#0B5858] transition-colors">{link.title}</span>
                <p className="text-sm text-gray-500 mt-0.5">{link.desc}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0B5858] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {loading ? (
          cards.map((card) => (
            <AdminStatCard key={card.title} label={card.title} value="—" accent={card.accent} />
          ))
        ) : (
          cards.map((card) => (
            <AdminStatCard key={card.title} label={card.title} value={card.value} accent={card.accent} />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <AdminSection title="MVP Build Order">
          <div className="p-6">
            <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
              <li>Inventory Setup: items, suppliers, warehouses, units, and stock rules.</li>
              <li>Replenishment: PO create/edit/cancel and receiving (partial/full).</li>
              <li>Approval Queue: handle exceptions before stock is adjusted.</li>
              <li>Audit and Alerts: movement review, low stock, fast-moving, damage patterns.</li>
            </ol>
            <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Admin Guardrails</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#cce8e8] bg-[#e8f4f4] px-4 py-3 text-sm text-[#0b5858]">
                Do: Require reason and reference for every stock-out and adjustment.
              </div>
              <div className="rounded-lg border border-[#fdd8e0] bg-[#fff3f6] px-4 py-3 text-sm text-[#b4234d]">
                Do not: Edit quantity directly without movement trail.
              </div>
              <div className="rounded-lg border border-[#cce8e8] bg-[#e8f4f4] px-4 py-3 text-sm text-[#0b5858]">
                Do: Keep housekeeping flow and inventory flow on one stock movement logic.
              </div>
              <div className="rounded-lg border border-[#fdd8e0] bg-[#fff3f6] px-4 py-3 text-sm text-[#b4234d]">
                Do not: Delete movement history or bypass approvals for flagged actions.
              </div>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Admin Sections">
          <div className="p-6">
            <div className="space-y-2.5">
              {sectionLinks.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  className="block rounded-lg border border-gray-200 px-4 py-3 hover:bg-[#e8f4f4] hover:border-[#0B5858]/40 transition-colors"
                >
                  <div className="text-sm font-semibold text-[#0b5858]">{section.title}</div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{section.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
