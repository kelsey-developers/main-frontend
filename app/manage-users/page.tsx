'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = ['Guest', 'Agent', 'Finance', 'Inventory', 'Housekeeping', 'Admin'] as const;
type RoleType = (typeof ROLES)[number];

/** Chip shadow helper — same pattern as admin/cleaning, lending */
const chipShadow = (r: number, g: number, b: number, a = 0.35) => `0 1px 0 rgba(${r},${g},${b},${a})`;

/** Dropdown — same as admin/commissions, admin/cleaning: rounded-2xl, shadow, click-outside close */
function CustomDropdown({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:border-[#0B5858]/30 hover:bg-gray-50 transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption.label}</span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 w-full min-w-[140px] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setTimeout(() => setIsOpen(false), 150); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                value === option.value ? 'bg-[#0B5858]/10 text-[#0B5858]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#0B5858] active:bg-[#0B5858]/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullname: string;
  email: string;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  status: string;
  createdAt: string;
  roles: string[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  role: RoleType;
}

/** Role chip styles — design-system: chipStyle (backgroundColor, color, boxShadow) for chip-shadow pills */
const roleColors: Record<string, { bg: string; text: string; label: string; chipStyle: { backgroundColor: string; color: string; boxShadow: string } }> = {
  Admin:        { bg: '#B84C4C', text: '#fff', label: 'Admin',        chipStyle: { backgroundColor: '#B84C4C', color: '#fff',     boxShadow: chipShadow(184, 76, 76, 0.35) } },
  Agent:        { bg: '#FACC15', text: '#92400e', label: 'Agent',      chipStyle: { backgroundColor: '#FACC15', color: '#92400e', boxShadow: chipShadow(250, 204, 21, 0.4) } },
  Guest:        { bg: '#0B5858', text: '#fff', label: 'Guest',        chipStyle: { backgroundColor: '#0B5858', color: '#fff',     boxShadow: chipShadow(11, 88, 88, 0.35) } },
  Finance:      { bg: '#6366F1', text: '#fff', label: 'Finance',      chipStyle: { backgroundColor: '#6366F1', color: '#fff',     boxShadow: chipShadow(99, 102, 241, 0.35) } },
  Inventory:    { bg: '#0891B2', text: '#fff', label: 'Inventory',    chipStyle: { backgroundColor: '#0891B2', color: '#fff',     boxShadow: chipShadow(8, 145, 178, 0.35) } },
  Housekeeping: { bg: '#059669', text: '#fff', label: 'Housekeeping', chipStyle: { backgroundColor: '#059669', color: '#fff',     boxShadow: chipShadow(5, 150, 105, 0.35) } },
};

/** Convert a Prisma/market-backend role string to the display name used in ROLES. */
function toDisplayRole(role: string): RoleType {
  const map: Record<string, RoleType> = {
    finance:      'Finance',
    inventory:    'Inventory',
    operations:   'Housekeeping',
    frontdesk:    'Agent', // closest public-facing role
    admin:        'Admin',
    agent:        'Agent',
  };
  return map[role.toLowerCase()] ?? 'Guest';
}

function getRoleDisplay(roles: string[]) {
  for (const r of ['Admin', 'Agent', 'Finance', 'Inventory', 'Housekeeping', 'Operations', 'Guest']) {
    if (roles.map((x) => x.toLowerCase()).includes(r.toLowerCase())) {
      // Normalize "Operations" → "Housekeeping" for display
      return r === 'Operations' ? 'Housekeeping' : r;
    }
  }
  return roles[0] ?? 'Guest';
}

function getInitials(user: User) {
  const names = user.fullname.trim().split(/\s+/);
  if (names.length >= 2) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  return names[0]?.[0]?.toUpperCase() ?? 'U';
}

function Avatar({ user }: { user: User }) {
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        minWidth: 40,
        minHeight: 40,
        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
      }}
    >
      <span className="text-xs font-bold text-white" style={{ fontFamily: 'Poppins' }}>
        {getInitials(user)}
      </span>
    </div>
  );
}

/** Role chip — design-system: chip-shadow, chipStyle (same as admin/cleaning status chips) */
function RoleBadge({ role }: { role: string }) {
  const cfg = roleColors[role] ?? { label: role, chipStyle: { backgroundColor: '#f5f5f4', color: '#57534e', boxShadow: chipShadow(168, 162, 158, 0.22) } };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium chip-shadow whitespace-nowrap" style={cfg.chipStyle}>
      {cfg.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: i === 1 ? '80%' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function ManageUsers() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Internal roles stored in market-backend, keyed by email
  const [internalRoles, setInternalRoles] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', email: '', role: 'Guest' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async (pageNum = 1, searchVal = search, roleVal = roleFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', '20');
      if (searchVal.trim()) params.set('search', searchVal.trim());
      if (roleVal) params.set('role', roleVal);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load users');

      setUsers(data.users ?? []);
      setPagination({ total: data.total, page: data.page, limit: data.limit, total_pages: data.total_pages });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  // Fetch internal role mappings from market-backend on mount
  useEffect(() => {
    fetch('/market-api/user-roles')
      .then((r) => r.ok ? r.json() as Promise<Record<string, string>> : Promise.resolve({}))
      .then((data) => setInternalRoles(data))
      .catch(() => {/* non-fatal */});
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchUsers(1, val, roleFilter);
    }, 400);
  };

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val);
    fetchUsers(1, search, val);
  };

  const openEdit = (user: User) => {
    // Prefer internal role (from market-backend) if one exists for this email
    const internalRole = internalRoles[user.email];
    const displayRole = internalRole
      ? toDisplayRole(internalRole)
      : (getRoleDisplay(user.roles) as RoleType) ?? 'Guest';
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, role: displayRole });
    setEditError(null);
    setEditingUser(user);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');

      // Refresh internal roles so the table badge updates immediately
      const updatedInternal = await fetch('/market-api/user-roles')
        .then((r) => r.ok ? r.json() as Promise<Record<string, string>> : Promise.resolve(internalRoles))
        .catch(() => internalRoles);
      setInternalRoles(updatedInternal);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                firstName: (data as Record<string, unknown>).firstName as string ?? u.firstName,
                lastName:  (data as Record<string, unknown>).lastName  as string ?? u.lastName,
                fullname:  (data as Record<string, unknown>).fullname  as string ?? u.fullname,
                email:     (data as Record<string, unknown>).email     as string ?? u.email,
                roles:     (data as Record<string, unknown>).roles     as string[] ?? u.roles,
              }
            : u
        )
      );
      closeEdit();
      showToast('User updated successfully');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm transition-all duration-150"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins', fontWeight: 700 }}>
                Manage Users
              </h1>
              {!loading && (
                <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Poppins' }}>
                  {pagination.total} {pagination.total === 1 ? 'user' : 'users'} total
                </p>
              )}
            </div>
          </div>

          {/* Search and role filter — same layout and design as admin/commissions, admin/cleaning */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858] bg-white transition-all shadow-sm"
              />
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <CustomDropdown
                value={roleFilter}
                onChange={handleRoleFilterChange}
                options={[{ value: '', label: 'All Roles' }, ...ROLES.map((r) => ({ value: r, label: r }))]}
                className="min-w-[140px]"
              />
            </div>
          </div>

          {/* Table — design-system: rounded-3xl, header style, body divide-y, pagination footer (same as admin/cleaning) */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['User', 'Email', 'Contact', 'Gender', 'Joined', 'Role', ''].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-7 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-red-500">{error}</p>
                          <button type="button" onClick={() => fetchUsers(pagination.page)} className="text-sm font-medium text-[#0B5858] hover:underline">
                            Try again
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-7 py-14 text-center text-sm font-medium text-gray-400">
                        No users match your filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const internalRole = internalRoles[user.email];
                      const role = internalRole ? toDisplayRole(internalRole) : getRoleDisplay(user.roles);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar user={user} />
                              <span className="font-medium text-gray-900">{user.fullname}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate">{user.email}</td>
                          <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{user.phone || '—'}</td>
                          <td className="px-5 py-4 text-gray-600">{user.gender || '—'}</td>
                          <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-5 py-4">
                            <RoleBadge role={role} />
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination — same as admin/cleaning: Showing X to Y of Z, prev/next icons, page numbers */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-7 py-4 border-t border-gray-100 bg-white gap-4">
              <p className="text-xs font-medium text-gray-500">
                Showing <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-gray-900">{pagination.total}</span> results
              </p>
              {!loading && !error && pagination.total_pages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                    aria-label="Previous page"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (pagination.total_pages > 5) {
                        if (pagination.page > 3 && pagination.page < pagination.total_pages - 1) {
                          pageNum = pagination.page - 2 + i;
                        } else if (pagination.page >= pagination.total_pages - 1) {
                          pageNum = pagination.total_pages - 4 + i;
                        }
                      }
                      const isActive = pagination.page === pageNum;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => fetchUsers(pageNum)}
                          className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-300 ${
                            isActive ? 'bg-[#0B5858] text-white shadow-md shadow-[#0B5858]/30 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 group active:scale-95"
                    aria-label="Next page"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Role legend */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'Poppins' }}>
              Role Permissions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {(
                [
                  { role: 'Guest',        desc: 'Can browse and make bookings' },
                  { role: 'Agent',        desc: 'Can manage bookings and clients' },
                  { role: 'Finance',      desc: 'Access to Finance section of Sales Report' },
                  { role: 'Inventory',    desc: 'Access to Inventory section of Sales Report' },
                  { role: 'Housekeeping', desc: 'Access to Housekeeping section of Sales Report' },
                  { role: 'Admin',        desc: 'Full access to all features and dashboards' },
                ] as { role: string; desc: string }[]
              ).map(({ role, desc }) => (
                <div key={role} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50/60">
                  <RoleBadge role={role} />
                  <span className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: 'Poppins' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeEdit}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar user={editingUser} />
                <div>
                  <h2 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Poppins' }}>
                    Edit User
                  </h2>
                  <p className="text-xs text-gray-400" style={{ fontFamily: 'Poppins' }}>
                    ID #{editingUser.id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              {editError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Poppins' }}>{editError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5" style={{ fontFamily: 'Poppins' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                    style={{ fontFamily: 'Poppins' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5" style={{ fontFamily: 'Poppins' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                    style={{ fontFamily: 'Poppins' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5" style={{ fontFamily: 'Poppins' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                  style={{ fontFamily: 'Poppins' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2" style={{ fontFamily: 'Poppins' }}>
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => {
                    const cfg = roleColors[r] ?? { bg: '#888', text: '#fff', label: r };
                    const selected = editForm.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, role: r }))}
                        className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-150 ${
                          selected ? 'border-transparent shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                        style={
                          selected
                            ? { backgroundColor: cfg.bg, color: cfg.text, fontFamily: 'Poppins' }
                            : { fontFamily: 'Poppins' }
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-gray-400" style={{ fontFamily: 'Poppins' }}>
                  Finance, Inventory, and Housekeeping roles grant access to the Sales Report dashboard.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                  style={{ fontFamily: 'Poppins' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: '#0B5858', fontFamily: 'Poppins' }}
                >
                  {editLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${
            toast.type === 'success' ? 'bg-[#0B5858]' : 'bg-red-500'
          }`}
          style={{ fontFamily: 'Poppins' }}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
