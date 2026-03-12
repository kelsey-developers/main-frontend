'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from '@/lib/api/client';
import { loadInventoryDataset, inventorySupplierDirectory } from "../lib/inventoryDataStore";
import SummaryCard from "../components/SummaryCard";
import InventoryDropdown, { type InventoryDropdownOption } from "../components/InventoryDropdown";
import ActiveStatusToggle from "../components/ActiveStatusToggle";
import { useToast } from "../hooks/useToast";
import { avatarPalette, initials } from "../helpers/supplierHelpers";

type Supplier = (typeof inventorySupplierDirectory)[number];

const SupplierFormModal = ({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: Omit<Supplier, "id" | "activePOs" | "lastOrderDate" | "createdAt">) => void;
}) => {
  const { error } = useToast();
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    name:        supplier?.name        ?? "",
    contactName: supplier?.contactName ?? "",
    email:       supplier?.email       ?? "",
    phone:       supplier?.phone       ?? "",
    address:     supplier?.address     ?? "",
    notes:       supplier?.notes       ?? "",
    isActive:    supplier?.isActive    ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name        = "Required";
    if (!form.contactName.trim()) e.contactName = "Required";
    if (!form.email.trim())       e.email       = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.phone.trim())       e.phone       = "Required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (isEdit && supplier) {
      const noChanges =
        form.name.trim() === (supplier.name ?? '').trim() &&
        form.contactName.trim() === (supplier.contactName ?? '').trim() &&
        form.email.trim() === (supplier.email ?? '').trim() &&
        form.phone.trim() === (supplier.phone ?? '').trim() &&
        form.address.trim() === (supplier.address ?? '').trim() &&
        form.notes.trim() === (supplier.notes ?? '').trim() &&
        form.isActive === (supplier.isActive ?? true);
      if (noChanges) {
        error('No changes were made. Cancel or close to exit.');
        return;
      }
    }
    onSave(form);
    onClose();
  };

  const handleStatusToggle = (newStatus: boolean) => {
    setForm((f) => ({ ...f, isActive: newStatus }));
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
    };

    const modalCount = Number(document.body.dataset.modalCount ?? '0') + 1;
    document.body.dataset.modalCount = String(modalCount);

    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", fn);
      document.body.style.overflow = "";

      const nextModalCount = Math.max(0, Number(document.body.dataset.modalCount ?? '1') - 1);
      if (nextModalCount === 0) {
        delete document.body.dataset.modalCount;
      } else {
        document.body.dataset.modalCount = String(nextModalCount);
      }
    };
  }, [onClose]);

  const renderField = ({
    label, fieldKey, type = "text", placeholder = "",
  }: { label: string; fieldKey: keyof typeof form; type?: string; placeholder?: string }) => (
    <div className="flex flex-col gap-1.5">
      <label className={`text-[10.5px] font-bold tracking-wider uppercase ${errors[fieldKey] ? 'text-red-600' : 'text-gray-500'}`} style={{ fontFamily: 'Poppins' }}>
        {label}{errors[fieldKey] && <span className="font-normal ml-1.5 normal-case">— {errors[fieldKey]}</span>}
      </label>
      <input
        type={type}
        value={form[fieldKey] as string}
        onChange={e => { setForm(f => ({ ...f, [fieldKey]: e.target.value })); setErrors(ev => ({ ...ev, [fieldKey]: "" })); }}
        placeholder={placeholder}
        className={`px-3 py-2.5 border-[1.5px] rounded-lg text-[13px] outline-none w-full ${
          errors[fieldKey] 
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
            : 'border-gray-200 bg-white focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]'
        }`}
        style={{ fontFamily: 'Poppins' }}
      />
    </div>
  );

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-[rgba(17,24,39,0.38)] flex items-center justify-center z-[10000] p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[560px] max-h-[92dvh] overflow-hidden flex flex-col shadow-2xl"
        style={{ fontFamily: 'Poppins' }}
      >
        <div className="bg-gradient-to-r from-[#0b5858] to-[#05807e] px-6 py-5 flex justify-between items-center flex-shrink-0">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-white/50 mb-1">
              {isEdit ? "EDIT SUPPLIER" : "NEW SUPPLIER"}
            </div>
            <h3 className="text-[17px] font-bold text-white">
              {isEdit ? supplier!.name : "Add Supplier"}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="bg-white/15 hover:bg-white/25 rounded-lg w-8 h-8 flex items-center justify-center transition-colors">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-3.5">
            {renderField({ label: 'Supplier Name', fieldKey: 'name', placeholder: 'e.g. Clean & Co' })}
            <div className="grid grid-cols-2 gap-3">
              {renderField({ label: 'Contact Person', fieldKey: 'contactName', placeholder: 'Full name' })}
              {renderField({ label: 'Phone', fieldKey: 'phone', type: 'tel', placeholder: '+63 9XX XXX XXXX' })}
            </div>
            {renderField({ label: 'Email', fieldKey: 'email', type: 'email', placeholder: 'contact@supplier.com' })}
            {renderField({ label: 'Address', fieldKey: 'address', placeholder: 'Street, City' })}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-bold tracking-wider text-gray-500 uppercase" style={{ fontFamily: 'Poppins' }}>
                Notes <span className="font-normal normal-case text-gray-400">— optional</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Payment terms, lead time, special instructions…"
                rows={3}
                className="px-3 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white outline-none resize-vertical min-h-[72px] w-full focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            {isEdit && (
              <ActiveStatusToggle
                isActive={form.isActive}
                onToggle={handleStatusToggle}
                entityType="supplier"
              />
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-[#e8f4f4] flex justify-end gap-2.5 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-gray-600 text-[13px] font-medium hover:bg-gray-50 transition-colors" style={{ fontFamily: 'Poppins' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#0b5858] to-[#05807e] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ fontFamily: 'Poppins' }}>
            {isEdit ? "Save Changes" : "Add Supplier"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const SuppliersSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm min-w-[900px]">
    <div className="hidden md:grid grid-cols-[minmax(70px,0.7fr)_minmax(170px,2.2fr)_minmax(100px,1.5fr)_minmax(120px,1.5fr)_90px_90px_120px_100px_minmax(110px,1.2fr)] px-4 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]">
      {["SUPPLIER ID", "SUPPLIER NAME", "CONTACT PERSON", "EMAIL / PHONE", "SUPPLIER STATUS", "PO ORDERS", "LAST ORDER DATE", "PURCHASE ORDER STATUS", "ACTIONS"].map((h) => (
        <div key={h} className="text-[10.5px] font-semibold tracking-wider text-white/70" style={{ fontFamily: 'Poppins' }}>
          {h}
        </div>
      ))}
    </div>
      <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="grid grid-cols-1 md:grid-cols-[minmax(70px,0.7fr)_minmax(170px,2.2fr)_minmax(100px,1.5fr)_minmax(120px,1.5fr)_90px_90px_120px_100px_minmax(110px,1.2fr)] gap-3 md:gap-0 px-4 py-4 border-b border-gray-100 last:border-b-0"
        >
          {/* Supplier ID skeleton */}
          <div className="hidden md:flex items-center">
            <div className="h-3 w-32 rounded bg-slate-200" />
          </div>
          {/* Supplier name skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex-shrink-0" />
            <div className="flex flex-col gap-2 min-w-0">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-3 w-24 rounded bg-slate-200" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-2.5 w-20 rounded bg-slate-200" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-36 rounded bg-slate-200" />
            <div className="h-2.5 w-24 rounded bg-slate-200" />
          </div>
          {/* Supplier Status skeleton */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
          </div>

          <div className="hidden md:flex items-center justify-center">
            <div className="h-6 w-8 rounded bg-slate-200" />
          </div>
          <div className="hidden md:flex items-center">
            <div className="h-3 w-20 rounded bg-slate-200" />
          </div>
          <div className="hidden md:flex items-center">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 rounded-lg bg-slate-200" />
            <div className="h-8 w-8 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function SuppliersPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [sortKey, setSortKey] = useState<"name" | "lastOrder" | "activePOs">("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);

  useEffect(() => {
    let isMounted = true;
    void loadInventoryDataset()
      .finally(() => {
        if (!isMounted) return;
        setSuppliers([...inventorySupplierDirectory]);
        setIsLoading(false);
      });

    const onRefresh = () => {
      void loadInventoryDataset(true).finally(() => {
        if (isMounted) setSuppliers([...inventorySupplierDirectory]);
      });
    };

    window.addEventListener('inventory:movement-updated', onRefresh);
    window.addEventListener('focus', onRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('inventory:movement-updated', onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, []);

  const sortOptions: InventoryDropdownOption<"name" | "lastOrder" | "activePOs">[] = [
    { value: "name", label: "Name A-Z" },
    { value: "activePOs", label: "PO Orders (high to low)" },
    { value: "lastOrder", label: "Last order date" },
  ];

  const filtered = suppliers
    .filter(s => {
      const q = search.toLowerCase();
      const match = s.name.toLowerCase().includes(q)
        || s.contactName.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q);
      const statusMatch = filter === "All" || (filter === "Active" ? s.isActive : !s.isActive);
      return match && statusMatch;
    })
    .sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "activePOs") return b.activePOs - a.activePOs;
      if (sortKey === "lastOrder") return b.lastOrderDate.localeCompare(a.lastOrderDate);
      return 0;
    });

  const handleSave = (data: Omit<Supplier, "id" | "activePOs" | "lastOrderDate" | "createdAt">) => {
    const run = async () => {
      const payload = {
        name: data.name,
        contactName: data.contactName,
        contactEmail: data.email,
        contactPhone: data.phone,
        address: data.address,
        notes: data.notes,
        isActive: editTarget ? data.isActive : true,
      };

      if (editTarget) {
        await apiClient.patch(`/api/suppliers/${editTarget.id}`, payload);
      } else {
        await apiClient.post('/api/suppliers', payload);
      }

      await loadInventoryDataset(true);
      setSuppliers([...inventorySupplierDirectory]);
      success(editTarget ? 'Supplier updated successfully.' : 'Supplier added successfully.');
    };

    void run().catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supplier save error:', err);
      }
      error('We couldn’t save the supplier. Please try again.');
    });
  };

  const openAdd = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (s: Supplier) => { setEditTarget(s); setFormOpen(true); };

  return (
    <>
      <style>{`
        @keyframes inventoryReveal {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .inventory-reveal {
          opacity: 0;
          animation: inventoryReveal 560ms ease-in-out forwards;
        }
        .add-supplier-btn:hover {
          background: #0b5858 !important;
          color: #ffffff !important;
          border-color: #0b5858 !important;
        }
        .supplier-row:hover {
          background: #e8f4f4 !important;
        }
      `}</style>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 inventory-reveal">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
            <Link href="/sales-report/inventory" className="text-[#0B5858] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Suppliers</span>
          </nav>
          <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins' }}>
            Supplier Directory
          </h1>
          <p className="text-gray-600 mt-1" style={{ fontFamily: 'Poppins' }}>
            Manage suppliers and their purchase order relationships
          </p>
        </div>
        <button
          onClick={openAdd}
          className="add-supplier-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-[1.5px] border-[#05807e] bg-white text-[#05807e] text-[13px] font-semibold transition-all"
          style={{ fontFamily: 'Poppins' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 inventory-reveal">
        {[
          { label: "Total Suppliers", value: suppliers.length, gradient: "from-[#0B5858] to-[#0a4a4a]" },
          { label: "Active", value: suppliers.filter(s => s.isActive).length, gradient: "from-green-600 to-green-700" },
          { label: "Inactive", value: suppliers.filter(s => !s.isActive).length, gradient: "from-gray-500 to-gray-600" },
          { label: "Active PO Orders", value: suppliers.reduce((acc, s) => acc + s.activePOs, 0), gradient: "from-[#05807e] to-[#0B5858]" },
        ].map((stat, i) => (
          <SummaryCard
            key={i}
            label={stat.label}
            value={stat.value}
            gradient={stat.gradient}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 inventory-reveal">
        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, contact, or email…"
            className="w-full pl-10 pr-4 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-[13px] bg-white text-gray-900 outline-none focus:border-[#05807e] focus:ring-4 focus:ring-[#cce8e8]"
            style={{ fontFamily: 'Poppins' }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>

        <div className="flex gap-2">
          <div className="inline-flex gap-1 bg-white border-[1.5px] border-gray-200 rounded-lg p-1">
            {(["All", "Active", "Inactive"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  filter === f 
                    ? 'bg-[#05807e] text-white' 
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                style={{ fontFamily: 'Poppins' }}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative z-[60]">
            <InventoryDropdown
              value={sortKey}
              onChange={setSortKey}
              options={sortOptions}
              minWidthClass="min-w-[210px]"
              menuZIndexClass="z-[999]"
            />
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="inventory-reveal">
        {isLoading ? (
          <SuppliersSkeleton />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-[minmax(70px,0.7fr)_minmax(170px,2.2fr)_minmax(100px,1.5fr)_minmax(120px,1.5fr)_90px_90px_120px_100px_minmax(110px,1.2fr)] px-4 py-3 bg-gradient-to-r from-[#0b5858] to-[#05807e]">
            {["SUPPLIER ID", "SUPPLIER NAME", "CONTACT PERSON", "EMAIL / PHONE", "SUPPLIER STATUS", "PO ORDERS", "LAST ORDER DATE", "PURCHASE ORDER STATUS", "ACTIONS"].map((h, i) => (
              <div key={i} className={`text-[10.5px] font-semibold tracking-wider text-white/70 ${i === 5 ? 'text-center' : ''}`} style={{ fontFamily: 'Poppins' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Table Body */}
          {filtered.length === 0 ? (
            <div className="py-12 px-6 text-center text-gray-400 text-sm" style={{ fontFamily: 'Poppins' }}>
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 mb-1">No suppliers found</div>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div>
              {filtered.map((s, idx) => {
              const [fg, bg] = avatarPalette(s.name);
              const isLast = idx === filtered.length - 1;
              return (
              <div
                  key={s.id}
                  className={`supplier-row relative grid grid-cols-1 md:grid-cols-[minmax(70px,0.7fr)_minmax(170px,2.2fr)_minmax(100px,1.5fr)_minmax(120px,1.5fr)_90px_90px_120px_100px_minmax(110px,1.2fr)] gap-3 md:gap-0 px-4 py-4 ${!isLast ? 'border-b border-gray-100' : ''} ${s.isActive ? 'bg-white' : 'bg-gray-50 opacity-80'} transition-colors`}
                >
                  {/* Mobile supplier active status badge (top-right) */}
                  <div className="absolute right-4 top-3 md:hidden">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide border ${
                        s.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {/* Supplier ID (desktop) */}
                  <div
                    className="hidden md:flex items-center text-[11px] text-gray-400 break-all pr-2"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {s.id}
                  </div>

                  {/* Supplier Name + (mobile) contact */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: bg, color: fg, fontFamily: 'Poppins' }}>
                      {initials(s.name)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[13.5px] font-semibold text-gray-900 whitespace-normal break-words"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {s.name}
                      </div>
                      {/* Supplier ID (mobile) */}
                      <div
                        className="mt-0.5 text-[11px] text-gray-400 break-all md:hidden"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {s.id}
                      </div>
                      {/* Mobile contact summary under name */}
                      <div
                        className="mt-0.5 text-[11px] text-gray-500 md:hidden whitespace-normal break-words"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {s.contactName}
                        {s.address && (
                          <>
                            {" · "}
                            {s.address.split(",").slice(1).join(",").trim() || s.address}
                          </>
                        )}
                      </div>
                      {s.notes && (
                        <div
                          className="hidden lg:block text-[11px] text-gray-400 whitespace-normal break-words max-w-[220px] mt-0.5"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          {s.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact (desktop column only) */}
                  <div className="hidden md:flex md:flex-col md:justify-center min-w-0 overflow-hidden">
                    <div className="text-[13px] font-medium text-gray-700 truncate" style={{ fontFamily: 'Poppins' }} title={s.contactName}>{s.contactName}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate" style={{ fontFamily: 'Poppins' }} title={s.address}>
                      {s.address.split(",").slice(1).join(",").trim() || s.address}
                    </div>
                  </div>

                  {/* Email / Phone */}
                  <div className="md:flex md:flex-col md:justify-center min-w-0 overflow-hidden">
                    <div className="text-[12.5px] text-[#05807e] font-medium truncate" style={{ fontFamily: 'Poppins' }} title={s.email}>{s.email}</div>
                    <div className="text-[11.5px] text-gray-400 mt-0.5 truncate" style={{ fontFamily: 'Poppins' }} title={s.phone}>{s.phone}</div>
                  </div>

                  {/* Supplier Status */}
                  <div className="hidden md:flex items-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide border ${
                        s.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* POs */}
                  <div className="hidden md:flex items-center justify-center">
                    <span
                      className={`text-[15px] font-bold ${s.activePOs > 0 ? 'text-[#0b5858]' : 'text-gray-300'}`}
                      style={{ fontFamily: 'Poppins' }}
                    >
                      {s.activePOs}
                    </span>
                  </div>

                  {/* Last Order */}
                  <div className="hidden md:flex items-center">
                    <div className="text-[12.5px] text-gray-600" style={{ fontFamily: 'Poppins' }}>{s.lastOrderDate}</div>
                  </div>

                  {/* Purchase Order Status */}
                  <div className="hidden md:flex items-center">
                    {s.activePOs > 0 ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide bg-[#e8f4f4] text-[#0b5858] border border-[#cce8e8]"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide bg-gray-50 text-gray-500 border border-gray-200" style={{ fontFamily: 'Poppins' }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 md:justify-start flex-wrap">
                    <button
                      onClick={() => router.push(`/sales-report/inventory/purchase-orders?supplierId=${s.id}`)}
                      className="px-3 py-1.5 rounded-lg border border-[#cce8e8] bg-white text-[#0b5858] text-[11.5px] font-semibold hover:bg-[#e8f4f4] transition-colors whitespace-nowrap"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      View PO Orders
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-[#05807e] hover:text-[#0b5858] transition-all duration-150 p-1.5 rounded hover:bg-[#e8f4f4] hover:scale-105 active:scale-95"
                      title="Edit supplier"
                      aria-label="Edit supplier"
                      style={{ fontFamily: 'Poppins' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.333 2.00004C11.5084 1.82463 11.7163 1.68648 11.9451 1.59347C12.1738 1.50046 12.4191 1.45435 12.6663 1.45435C12.9136 1.45435 13.1589 1.50046 13.3876 1.59347C13.6164 1.68648 13.8243 1.82463 13.9997 2.00004C14.1751 2.17546 14.3132 2.38334 14.4062 2.61209C14.4992 2.84084 14.5453 3.08618 14.5453 3.33337C14.5453 3.58057 14.4992 3.82591 14.4062 4.05466C14.3132 4.28341 14.1751 4.49129 13.9997 4.66671L4.99967 13.6667L1.33301 14.6667L2.33301 11L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Mobile-only stats */}
                  <div className="md:hidden flex gap-2 pt-2 border-t border-gray-100">
                    <div className="flex-1 bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>PO Orders</div>
                      <div
                        className={`text-[17px] font-bold ${s.activePOs > 0 ? 'text-[#0b5858]' : 'text-gray-300'}`}
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {s.activePOs}
                      </div>
                    </div>
                    <div className="flex-1 bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>Last Order</div>
                      <div className="text-[12.5px] font-semibold text-gray-700" style={{ fontFamily: 'Poppins' }}>{s.lastOrderDate}</div>
                    </div>
                    <div className="flex-1 bg-[#e8f4f4] rounded-lg p-2">
                      <div className="text-[9.5px] font-bold tracking-wider text-gray-500 uppercase mb-1" style={{ fontFamily: 'Poppins' }}>PO Status</div>
                      {s.activePOs > 0 ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide bg-[#e8f4f4] text-[#0b5858] border border-[#cce8e8]"
                          style={{ fontFamily: 'Poppins' }}
                        >
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wide bg-gray-50 text-gray-500 border border-gray-200" style={{ fontFamily: 'Poppins' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 text-[12px] text-gray-400 inventory-reveal" style={{ fontFamily: 'Poppins' }}>
        Showing <span className="font-semibold text-[#05807e]">{filtered.length}</span> of {suppliers.length} suppliers
        {search && <span> — &quot;<em>{search}</em>&quot;</span>}
      </div>

      {/* Modals */}
      {formOpen && (
        <SupplierFormModal
          supplier={editTarget}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
