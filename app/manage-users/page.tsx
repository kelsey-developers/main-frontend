'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = ['Guest', 'Agent', 'Admin'] as const;
type RoleType = (typeof ROLES)[number];

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

const roleColors: Record<string, { bg: string; text: string; label: string }> = {
  Admin: { bg: '#B84C4C', text: '#fff', label: 'Admin' },
  Agent: { bg: '#FACC15', text: '#0B5858', label: 'Agent' },
  Guest: { bg: '#558B8B', text: '#fff', label: 'Guest' },
};

function getRoleDisplay(roles: string[]) {
  for (const r of ['Admin', 'Agent', 'Guest']) {
    if (roles.includes(r)) return r;
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

function RoleBadge({ role }: { role: string }) {
  const cfg = roleColors[role] ?? { bg: '#888', text: '#fff', label: role };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: 'Poppins' }}
    >
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
    const role = getRoleDisplay(user.roles) as RoleType;
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, role });
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

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                firstName: data.firstName,
                lastName: data.lastName,
                fullname: data.fullname,
                email: data.email,
                roles: data.roles,
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

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B5858]/30 focus:border-[#0B5858] transition-all"
                style={{ fontFamily: 'Poppins' }}
              />
            </div>

            {/* Role filter */}
            <div className="flex gap-2 flex-wrap">
              {['', ...ROLES].map((r) => {
                const active = roleFilter === r;
                const cfg = r ? roleColors[r] : null;
                return (
                  <button
                    key={r || 'all'}
                    onClick={() => handleRoleFilterChange(r)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 border ${
                      active
                        ? 'border-transparent shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    style={
                      active && cfg
                        ? { backgroundColor: cfg.bg, color: cfg.text, fontFamily: 'Poppins' }
                        : active
                        ? { backgroundColor: '#0B5858', color: '#fff', fontFamily: 'Poppins' }
                        : { fontFamily: 'Poppins' }
                    }
                  >
                    {r || 'All Roles'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr style={{ backgroundColor: '#0B5858' }}>
                    {['User', 'Email', 'Contact', 'Gender', 'Joined', 'Role', ''].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-4 text-left text-white text-sm font-semibold"
                        style={{ fontFamily: 'Poppins' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-500 font-medium" style={{ fontFamily: 'Poppins' }}>{error}</p>
                          <button
                            onClick={() => fetchUsers(pagination.page)}
                            className="text-sm text-[#0B5858] underline hover:no-underline"
                            style={{ fontFamily: 'Poppins' }}
                          >
                            Try again
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-gray-400 font-medium" style={{ fontFamily: 'Poppins' }}>No users found</p>
                          {(search || roleFilter) && (
                            <button
                              onClick={() => { setSearch(''); setRoleFilter(''); fetchUsers(1, '', ''); }}
                              className="text-sm text-[#0B5858] underline hover:no-underline"
                              style={{ fontFamily: 'Poppins' }}
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user, idx) => {
                      const role = getRoleDisplay(user.roles);
                      return (
                        <tr
                          key={user.id}
                          className={`border-b border-gray-50 transition-colors duration-100 hover:bg-[#f0f9f9] ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          {/* User */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar user={user} />
                              <span className="font-medium text-gray-900 text-sm" style={{ fontFamily: 'Poppins' }}>
                                {user.fullname}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 max-w-[200px] truncate block" style={{ fontFamily: 'Poppins' }}>
                              {user.email}
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>
                              {user.phone || '—'}
                            </span>
                          </td>

                          {/* Gender */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600" style={{ fontFamily: 'Poppins' }}>
                              {user.gender || '—'}
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="px-5 py-3.5">
                            <span className="text-sm text-gray-600 whitespace-nowrap" style={{ fontFamily: 'Poppins' }}>
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5">
                            <RoleBadge role={role} />
                          </td>

                          {/* Edit */}
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => openEdit(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0B5858] border border-[#0B5858]/30 rounded-lg hover:bg-[#0B5858] hover:text-white transition-all duration-150"
                              style={{ fontFamily: 'Poppins' }}
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

            {/* Pagination */}
            {!loading && !error && pagination.total_pages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - pagination.page) <= 2)
                    .map((p) => (
                      <button
                        key={p}
                        onClick={() => fetchUsers(p)}
                        className="px-3 py-1.5 text-sm rounded-lg border transition-all"
                        style={{
                          fontFamily: 'Poppins',
                          backgroundColor: p === pagination.page ? '#0B5858' : 'white',
                          color: p === pagination.page ? '#fff' : '#4b5563',
                          borderColor: p === pagination.page ? '#0B5858' : '#e5e7eb',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ fontFamily: 'Poppins' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Role legend */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3" style={{ fontFamily: 'Poppins' }}>
              Role Permissions
            </p>
            <div className="flex flex-wrap gap-6">
              {ROLES.map((r) => {
                const cfg = roleColors[r];
                const desc: Record<string, string> = {
                  Guest: 'Can browse and make bookings',
                  Agent: 'Can manage bookings and clients',
                  Admin: 'Full access to all features',
                };
                return (
                  <div key={r} className="flex items-center gap-2">
                    <RoleBadge role={r} />
                    <span className="text-sm text-gray-500" style={{ fontFamily: 'Poppins' }}>{desc[r]}</span>
                  </div>
                );
              })}
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
                    const cfg = roleColors[r];
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
