'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

const ROLES = ['Admin', 'Agent', 'Finance', 'Inventory', 'Housekeeping', 'Guest'] as const;
type RoleType = (typeof ROLES)[number];

type PermissionKey =
  | 'stockOutCreate'
  | 'stockOutApprove'
  | 'poCreate'
  | 'poReceive'
  | 'adjustmentApprove'
  | 'auditView'
  | 'settingsEdit';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullname: string;
  email: string;
  roles: string[];
}

const PERMISSIONS: { key: PermissionKey; label: string; shortLabel: string }[] = [
  { key: 'stockOutCreate', label: 'Create stock-out request', shortLabel: 'Stock-out create' },
  { key: 'stockOutApprove', label: 'Approve stock-out exception', shortLabel: 'Stock-out approve' },
  { key: 'poCreate', label: 'Create purchase order', shortLabel: 'PO create' },
  { key: 'poReceive', label: 'Confirm goods receipt', shortLabel: 'PO receive' },
  { key: 'adjustmentApprove', label: 'Approve manual adjustment', shortLabel: 'Adjust approve' },
  { key: 'auditView', label: 'View audit and alerts', shortLabel: 'Audit view' },
  { key: 'settingsEdit', label: 'Edit setup and rules', shortLabel: 'Setup edit' },
];

const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  Admin: ['stockOutCreate', 'stockOutApprove', 'poCreate', 'poReceive', 'adjustmentApprove', 'auditView', 'settingsEdit'],
  Agent: ['auditView'],
  Finance: ['poCreate', 'stockOutApprove', 'adjustmentApprove', 'auditView'],
  Inventory: ['stockOutCreate', 'poCreate', 'poReceive', 'stockOutApprove', 'adjustmentApprove', 'auditView'],
  Housekeeping: ['stockOutCreate', 'auditView'],
  Guest: [],
};

function toDisplayRole(role: string): RoleType {
  const map: Record<string, RoleType> = {
    finance: 'Finance',
    inventory: 'Inventory',
    operations: 'Housekeeping',
    housekeeping: 'Housekeeping',
    frontdesk: 'Agent',
    admin: 'Admin',
    agent: 'Agent',
  };
  return map[role.toLowerCase()] ?? 'Guest';
}

function getRoleDisplay(roles: string[], internalRole?: string): RoleType {
  if (internalRole) return toDisplayRole(internalRole);
  for (const r of ['Admin', 'Agent', 'Finance', 'Inventory', 'Housekeeping', 'Operations', 'Guest']) {
    if (roles.map((x) => x.toLowerCase()).includes(r.toLowerCase())) {
      return (r === 'Operations' ? 'Housekeeping' : r) as RoleType;
    }
  }
  return 'Guest';
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [internalRoles, setInternalRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/users?page=1&limit=100')
        .then((r) => r.json())
        .then((data) => setUsers(data.users ?? []))
        .catch(() => setUsers([])),
      fetch('/market-api/user-roles')
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: Record<string, string>) => setInternalRoles(data))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const approverRoles = useMemo(
    () => ROLES.filter((r) => ROLE_PERMISSIONS[r]?.includes('stockOutApprove') || ROLE_PERMISSIONS[r]?.includes('adjustmentApprove')).length,
    []
  );

  const enabledPermissionCount = useMemo(
    () => ROLES.reduce((total, r) => total + (ROLE_PERMISSIONS[r]?.length ?? 0), 0),
    []
  );

  const usersWithRoles = useMemo(
    () =>
      users.map((u) => {
        const internalRole = internalRoles[u.email];
        const role = getRoleDisplay(u.roles, internalRole);
        return { ...u, role };
      }),
    [users, internalRoles]
  );

  const internalRoleUsers = usersWithRoles.filter((u) =>
    ['Finance', 'Inventory', 'Housekeeping'].includes(u.role)
  );

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Access Control"
        description="View who has access to inventory operations. Roles are managed in Manage Users. This page shows the permission matrix by role and users with Sales Report access."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Roles" value={ROLES.length} accent="teal" />
        <AdminStatCard label="Approver Roles" value={approverRoles} accent="amber" />
        <AdminStatCard label="Enabled Permissions" value={enabledPermissionCount} accent="slate" />
      </div>

      <AdminSection title="Role and Permission Matrix" className="mb-6">
        <p className="text-xs text-gray-500 mb-3">
          Permissions are derived from role. Edit roles in{' '}
          <Link href="/manage-users" className="text-[#0B5858] font-medium underline">
            Manage Users
          </Link>
          .
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
              <tr>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Role</th>
                {PERMISSIONS.map((p) => (
                  <th
                    key={p.key}
                    className="px-3 py-3 text-center text-white/90 uppercase tracking-wider text-[10px] font-semibold"
                    title={p.label}
                  >
                    {p.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr key={role} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{role}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {role === 'Admin' && 'Full access'}
                      {role === 'Agent' && 'Bookings and clients'}
                      {role === 'Finance' && 'Finance dashboard, approve write-offs'}
                      {role === 'Inventory' && 'Inventory dashboard, POs, stock'}
                      {role === 'Housekeeping' && 'Housekeeping dashboard, stock-out'}
                      {role === 'Guest' && 'Browse and book'}
                    </div>
                  </td>
                  {PERMISSIONS.map((permission) => (
                    <td key={permission.key} className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex w-4 h-4 rounded border items-center justify-center ${
                          ROLE_PERMISSIONS[role]?.includes(permission.key)
                            ? 'bg-[#0B5858] border-[#0B5858] text-white'
                            : 'bg-white border-gray-200 text-gray-300'
                        }`}
                        title={ROLE_PERMISSIONS[role]?.includes(permission.key) ? 'Yes' : 'No'}
                      >
                        {ROLE_PERMISSIONS[role]?.includes(permission.key) ? '✓' : '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1.3fr] gap-6">
        <AdminSection
          title="Users with Sales Report Access"
          subtitle="Finance, Inventory, and Housekeeping users. Edit roles in Manage Users."
        >
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
                  <tr>
                    <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">User</th>
                    <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Role</th>
                    <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {internalRoleUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-sm text-gray-500">
                        No users with Finance, Inventory, or Housekeeping roles yet.
                      </td>
                    </tr>
                  ) : (
                    internalRoleUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{user.fullname}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor:
                                user.role === 'Finance'
                                  ? '#e0e7ff'
                                  : user.role === 'Inventory'
                                    ? '#cffafe'
                                    : user.role === 'Housekeeping'
                                      ? '#d1fae5'
                                      : '#f3f4f6',
                              color:
                                user.role === 'Finance'
                                  ? '#4338ca'
                                  : user.role === 'Inventory'
                                    ? '#0e7490'
                                    : user.role === 'Housekeeping'
                                      ? '#047857'
                                      : '#6b7280',
                            }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/manage-users"
                            className="px-2.5 py-1.5 rounded border border-[#0B5858] text-xs text-[#0B5858] hover:bg-[#e8f4f4]"
                          >
                            Edit in Manage Users
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>
            Separation of Duties Rules
          </h3>
          <div className="space-y-2.5 text-sm text-gray-700">
            <div className="rounded-lg border border-gray-200 p-3">
              A user who creates a manual adjustment should not be the same user who approves it.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              High-risk stock-out and write-off requests need approver roles enabled.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Finance should co-approve high-value write-offs and manual adjustments.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Audit view should stay enabled for leads and managers to preserve visibility.
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              Setup edit should be restricted to admin-level users.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
