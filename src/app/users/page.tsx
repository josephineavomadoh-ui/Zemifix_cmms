'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import {
  Users,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building,
  Layers,
  Edit2,
  Lock,
  Phone,
  Mail,
  UserCheck,
  X,
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    branchId: '',
    departmentId: '',
    accessScope: 'Department',
    approvalLimit: 0,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<any>({
    name: '',
    phone: '',
    roleId: '',
    branchId: '',
    departmentId: '',
    accessScope: 'Department',
    approvalLimit: 0,
    isActive: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, bRes, dRes] = await Promise.all([
        fetch('/api/users?includeRoles=true').then((r) => r.json()),
        fetch('/api/organization/branches').then((r) => r.json()),
        fetch('/api/organization/departments').then((r) => r.json()),
      ]);

      if (uRes.error || uRes.message) {
        setError(uRes.message || uRes.error);
      } else {
        if (uRes.users) setUsers(uRes.users);
        else if (uRes.data) setUsers(uRes.data);
        if (uRes.isDemoData) setIsDemoData(true);

        if (uRes.roles) {
          setRoles(uRes.roles);
          if (uRes.roles.length > 0 && !createForm.roleId) {
            setCreateForm((prev) => ({ ...prev, roleId: uRes.roles[0].id }));
          }
        }
      }

      if (bRes.data) {
        setBranches(bRes.data);
        if (bRes.data.length > 0 && !createForm.branchId) {
          setCreateForm((prev) => ({ ...prev, branchId: bRes.data[0].id }));
        }
      }
      if (dRes.data) setDepartments(dRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone || null,
        password: createForm.password,
        roleId: createForm.roleId,
        branchId: createForm.branchId,
        accessScope: createForm.accessScope,
        approvalLimit: Number(createForm.approvalLimit) || 0,
      };
      if (createForm.departmentId) payload.departmentId = createForm.departmentId;

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccessMsg(`Staff account "${payload.name}" successfully created.`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        roleId: roles[0]?.id || '',
        branchId: branches[0]?.id || '',
        departmentId: '',
        accessScope: 'Department',
        approvalLimit: 0,
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error creating staff user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        name: editForm.name,
        phone: editForm.phone || null,
        roleId: editForm.roleId,
        branchId: editForm.branchId,
        accessScope: editForm.accessScope,
        approvalLimit: Number(editForm.approvalLimit) || 0,
        isActive: editForm.isActive,
      };
      if (editForm.departmentId) payload.departmentId = editForm.departmentId;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setSuccessMsg(`Staff account "${payload.name}" successfully updated.`);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error updating staff user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      phone: user.phone || '',
      roleId: user.roleId || roles[0]?.id,
      branchId: user.branchId || branches[0]?.id,
      departmentId: user.departmentId || '',
      accessScope: user.accessScope || 'Department',
      approvalLimit: user.approvalLimit || 0,
      isActive: user.isActive,
    });
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Shield className="h-3.5 w-3.5" />
              <span>Domain 01: Identity, RBAC & Staff Directory</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Staff Users & Role Permissions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage internal staff accounts, branch scoping, dual-control approval limits, and roles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Staff Account</span>
            </button>
          </div>
        </div>

        {/* Success / Error / Demo Banners */}
        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start justify-between rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-rose-900 text-sm">PostgreSQL Unavailable</p>
                <p className="text-rose-700">{error}</p>
                <p className="text-[11px] text-rose-600 font-mono">
                  Persistent staff provisioning and edits are halted until PostgreSQL is reachable.
                </p>
              </div>
            </div>
            <button onClick={() => setError(null)}>
              <X className="h-3.5 w-3.5 text-rose-600" />
            </button>
          </div>
        )}

        {isDemoData && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-medium">
              <strong className="font-bold">Demonstration Baseline:</strong> Displaying static user accounts. Persistent modifications require an active PostgreSQL connection.
            </span>
          </div>
        )}

        {/* Staff Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Branch & Department</th>
                  <th className="py-3 px-4">Access Scope</th>
                  <th className="py-3 px-4 text-right">Approval Limit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isAdmin = u.email === 'admin@zemifix.local';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1336] text-[11px] font-bold text-white">
                            {u.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </div>
                          <div>
                            <div>{u.name}</div>
                            <div className="text-[11px] font-normal text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
                          {u.role?.name || 'Staff'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{u.branch?.name || '—'}</div>
                        <div className="text-[11px] text-slate-400">{u.department?.name || 'No department'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-700 font-semibold bg-slate-100 rounded px-2 py-0.5">
                          {u.accessScope}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        GH₵ {(Number(u.approvalLimit) || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:underline"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Staff Member */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336]">Provision New Staff Account</h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. Kwame Mensah"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Work Email *</label>
                    <input
                      required
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="k.mensah@zemifix.local"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Phone</label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+233 24 000 0000"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Initial Password *</label>
                    <input
                      required
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Min 8 characters"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">RBAC Role *</label>
                    <select
                      value={createForm.roleId}
                      onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Access Scope *</label>
                    <select
                      value={createForm.accessScope}
                      onChange={(e) => setCreateForm({ ...createForm, accessScope: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Own">Own (Individual Work Only)</option>
                      <option value="Department">Department</option>
                      <option value="Branch">Branch</option>
                      <option value="BranchAndBelow">Branch and Sub-branches</option>
                      <option value="Company">Company (Full Deployment)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Assigned Branch *</label>
                    <select
                      value={createForm.branchId}
                      onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Assigned Department</label>
                    <select
                      value={createForm.departmentId}
                      onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Dual-Control Approval Limit (GH₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={createForm.approvalLimit}
                    onChange={(e) => setCreateForm({ ...createForm, approvalLimit: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Provisioning...' : 'Provision Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Staff Member */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336]">
                  Edit Staff Account ({editingUser.email})
                </h3>
                <button onClick={() => setEditingUser(null)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Full Name</label>
                    <input
                      required
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">RBAC Role</label>
                    <select
                      value={editForm.roleId}
                      onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Access Scope</label>
                    <select
                      value={editForm.accessScope}
                      onChange={(e) => setEditForm({ ...editForm, accessScope: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Own">Own (Individual Work Only)</option>
                      <option value="Department">Department</option>
                      <option value="Branch">Branch</option>
                      <option value="BranchAndBelow">Branch and Sub-branches</option>
                      <option value="Company">Company (Full Deployment)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Assigned Branch</label>
                    <select
                      value={editForm.branchId}
                      onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Assigned Department</label>
                    <select
                      value={editForm.departmentId}
                      onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Approval Limit (GH₵)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editForm.approvalLimit}
                      onChange={(e) => setEditForm({ ...editForm, approvalLimit: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Account Status</label>
                    <select
                      value={editForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                      disabled={editingUser.email === 'admin@zemifix.local'}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs disabled:opacity-50"
                    >
                      <option value="true">Active</option>
                      <option value="false">Deactivated</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
