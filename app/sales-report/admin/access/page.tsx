'use client';

import React, { useMemo, useState } from 'react';
import { AdminPageHeader, AdminStatCard, AdminSection } from '../components';

type PermissionKey =
  | 'stockOutCreate'
  | 'stockOutApprove'
  | 'poCreate'
  | 'poReceive'
  | 'adjustmentApprove'
  | 'auditView'
  | 'settingsEdit';

interface RoleDef {
  id: string;
  name: string;
  description: string;
}

interface UserAssignment {
  id: string;
  name: string;
  roleId: string;
  active: boolean;
}

const ROLE_DEFS: RoleDef[] = [
  { id: 'housekeeping-staff', name: 'Housekeeping Staff', description: 'Can request stock-out for assigned units.' },
  { id: 'housekeeping-lead', name: 'Housekeeping Lead', description: 'Can submit escalated requests and monitor usage.' },
  { id: 'warehouse-staff', name: 'Warehouse Staff', description: 'Can process stock movement and receiving.' },
  { id: 'inventory-manager', name: 'Inventory Manager', description: 'Can manage replenishment and approve adjustments.' },
  { id: 'finance', name: 'Finance', description: 'Can review cost impact, approve write-offs, and audit inventory spend.' },
  { id: 'admin', name: 'Admin', description: 'Full governance rights and setup control.' },
];

const PERMISSIONS: { key: PermissionKey; label: string; shortLabel: string }[] = [
  { key: 'stockOutCreate', label: 'Create stock-out request', shortLabel: 'Stock-out create' },
  { key: 'stockOutApprove', label: 'Approve stock-out exception', shortLabel: 'Stock-out approve' },
  { key: 'poCreate', label: 'Create purchase order', shortLabel: 'PO create' },
  { key: 'poReceive', label: 'Confirm goods receipt', shortLabel: 'PO receive' },
  { key: 'adjustmentApprove', label: 'Approve manual adjustment', shortLabel: 'Adjust approve' },
  { key: 'auditView', label: 'View audit and alerts', shortLabel: 'Audit view' },
  { key: 'settingsEdit', label: 'Edit setup and rules', shortLabel: 'Setup edit' },
];

const ROLE_PERMISSION_SEED: Record<string, PermissionKey[]> = {
  'housekeeping-staff': ['stockOutCreate'],
  'housekeeping-lead': ['stockOutCreate', 'auditView'],
  'warehouse-staff': ['stockOutCreate', 'poReceive', 'auditView'],
  'inventory-manager': ['stockOutCreate', 'poCreate', 'poReceive', 'stockOutApprove', 'adjustmentApprove', 'auditView'],
  finance: ['poCreate', 'stockOutApprove', 'adjustmentApprove', 'auditView'],
  admin: ['stockOutCreate', 'stockOutApprove', 'poCreate', 'poReceive', 'adjustmentApprove', 'auditView', 'settingsEdit'],
};

const LOCKED_ROLE_IDS = new Set<string>(['admin']);

const initialUsers: UserAssignment[] = [
  { id: 'u-001', name: 'Ana Cruz', roleId: 'housekeeping-staff', active: true },
  { id: 'u-002', name: 'Juan Reyes', roleId: 'warehouse-staff', active: true },
  { id: 'u-003', name: 'Maria Santos', roleId: 'inventory-manager', active: true },
  { id: 'u-004', name: 'Lara Finance', roleId: 'finance', active: true },
  { id: 'u-005', name: 'Mike Storage', roleId: 'warehouse-staff', active: true },
  { id: 'u-006', name: 'Ops Supervisor', roleId: 'housekeeping-lead', active: false },
];

export default function AccessControlPage() {
  const [matrix, setMatrix] = useState<Record<string, Record<PermissionKey, boolean>>>(() => {
    const initial: Record<string, Record<PermissionKey, boolean>> = {};

    ROLE_DEFS.forEach((role) => {
      const enabledSet = new Set(ROLE_PERMISSION_SEED[role.id] ?? []);
      initial[role.id] = {
        stockOutCreate: enabledSet.has('stockOutCreate'),
        stockOutApprove: enabledSet.has('stockOutApprove'),
        poCreate: enabledSet.has('poCreate'),
        poReceive: enabledSet.has('poReceive'),
        adjustmentApprove: enabledSet.has('adjustmentApprove'),
        auditView: enabledSet.has('auditView'),
        settingsEdit: enabledSet.has('settingsEdit'),
      };
    });

    return initial;
  });

  const [users, setUsers] = useState<UserAssignment[]>(initialUsers);

  const approverRoles = useMemo(
    () => ROLE_DEFS.filter((role) => matrix[role.id]?.stockOutApprove || matrix[role.id]?.adjustmentApprove).length,
    [matrix]
  );

  const enabledPermissionCount = useMemo(
    () =>
      ROLE_DEFS.reduce(
        (total, role) => total + PERMISSIONS.filter((permission) => matrix[role.id]?.[permission.key]).length,
        0
      ),
    [matrix]
  );

  const togglePermission = (roleId: string, permission: PermissionKey) => {
    if (LOCKED_ROLE_IDS.has(roleId)) {
      return;
    }

    setMatrix((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permission]: !prev[roleId]?.[permission],
      },
    }));
  };

  const updateUserRole = (userId: string, roleId: string) => {
    setUsers((prev) => prev.map((entry) => (entry.id === userId ? { ...entry, roleId } : entry)));
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) => prev.map((entry) => (entry.id === userId ? { ...entry, active: !entry.active } : entry)));
  };

  return (
    <div style={{ fontFamily: 'Poppins' }}>
      <AdminPageHeader
        title="Access Control"
        description="Configure who can request, approve, receive, and manage stock. Keep separation of duties so admin and finance approvals cannot be bypassed."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Roles Configured" value={ROLE_DEFS.length} accent="teal" />
        <AdminStatCard label="Approver Roles" value={approverRoles} accent="amber" />
        <AdminStatCard label="Enabled Permissions" value={enabledPermissionCount} accent="slate" />
      </div>

      <AdminSection title="Role and Permission Matrix" className="mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
              <tr>
                <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Role</th>
                {PERMISSIONS.map((permission) => (
                  <th
                    key={permission.key}
                    className="px-3 py-3 text-center text-white/90 uppercase tracking-wider text-[10px] font-semibold"
                    title={permission.label}
                  >
                    {permission.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_DEFS.map((role) => (
                <tr key={role.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{role.name}</span>
                      {LOCKED_ROLE_IDS.has(role.id) ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700 uppercase tracking-wide">
                          System locked
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{role.description}</div>
                  </td>
                  {PERMISSIONS.map((permission) => (
                    <td key={permission.key} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(matrix[role.id]?.[permission.key])}
                        disabled={LOCKED_ROLE_IDS.has(role.id)}
                        onChange={() => togglePermission(role.id, permission.key)}
                        className="h-4 w-4 rounded border-gray-300 text-[#0B5858] focus:ring-[#0B5858] disabled:opacity-50 disabled:cursor-not-allowed"
                        title={LOCKED_ROLE_IDS.has(role.id) ? 'Admin permissions are system-locked.' : permission.label}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1.3fr] gap-6">
        <AdminSection title="User Assignment">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-[#0B5858] to-[#05807e]">
                <tr>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-white/90 uppercase tracking-wider text-[10px] font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-white/90 uppercase tracking-wider text-[10px] font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-gray-800 font-medium">{user.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.roleId}
                        onChange={(event) => updateUserRole(user.id, event.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0B5858]/20 focus:border-[#0B5858]"
                      >
                        {ROLE_DEFS.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          user.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {user.active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(user.id)}
                        className="px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Toggle status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Poppins' }}>Separation of Duties Rules</h3>
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
