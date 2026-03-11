import Link from 'next/link';
import {
  mockReplenishmentItems,
  mockSupplierDirectoryData,
  mockWarehouseDirectoryData,
  mockPurchaseOrders,
  mockStockMovements,
  mockDamageAdjustments,
} from '../inventory/lib/inventoryData';
import { AdminPageHeader, AdminStatCard, AdminSection } from './components';

const cards = [
  { title: 'Items Tracked', value: mockReplenishmentItems.length, accent: 'teal' as const },
  { title: 'Suppliers', value: mockSupplierDirectoryData.length, accent: 'teal' as const },
  { title: 'Warehouses', value: mockWarehouseDirectoryData.length, accent: 'slate' as const },
  {
    title: 'Pending POs',
    value: mockPurchaseOrders.filter((e) => e.status === 'pending').length,
    accent: 'amber' as const,
  },
  { title: 'Movements Logged', value: mockStockMovements.length, accent: 'slate' as const },
  { title: 'Damage Cases', value: mockDamageAdjustments.length, accent: 'red' as const },
];

const sectionLinks = [
  {
    href: '/sales-report/admin/inventory-setup',
    title: 'Inventory Setup',
    desc: 'Manage items, categories, suppliers, warehouses, units, and stock rules.',
  },
  {
    href: '/sales-report/admin/replenishment',
    title: 'Replenishment',
    desc: 'Create POs, monitor receiving, and control cancel/edit operations.',
  },
  {
    href: '/sales-report/admin/approval-queue',
    title: 'Approval Queue',
    desc: 'Approve flagged stock-out exceptions, write-offs, and manual overrides.',
  },
  {
    href: '/sales-report/admin/audit-alerts',
    title: 'Audit and Alerts',
    desc: 'Review who moved stock, why, and track low-stock or repeat-damage alerts.',
  },
  {
    href: '/sales-report/admin/access',
    title: 'Access Control',
    desc: 'Set who can stock out, approve requests, or view only.',
  },
];

export default function AdminOverviewPage() {
  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Inventory Admin Console"
        description="Govern master data, stock rules, approvals, and audit. Admin and finance validate usage and cost impact to keep stock integrity."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((card) => (
          <AdminStatCard
            key={card.title}
            label={card.title}
            value={card.value}
            accent={card.accent}
          />
        ))}
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
