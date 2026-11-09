'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Users, Plus, RefreshCw, CheckCircle2, AlertCircle, Shield, Edit2, X, Search, Key, History, Monitor } from 'lucide-react';

const demoRoles = [
  { id: 'r-1', name: 'System Administrator', userCount: 1, description: 'Full deployment access — all modules', permissions: [{ module: 'All modules', level: 'Full' }] },
  { id: 'r-2', name: 'Operations Manager', userCount: 2, description: 'Manage work orders, PM, assets and reports', permissions: [{ module: 'Work Orders', level: 'Full' }, { module: 'Assets', level: 'Full' }, { module: 'PM', level: 'Full' }] },
  { id: 'r-3', name: 'Branch Manager', userCount: 2, description: 'Branch-scoped approval and oversight', permissions: [{ module: 'Work Orders', level: 'Approve' }, { module: 'Procurement', level: 'Approve' }] },
  { id: 'r-4', name: 'Senior Technician', userCount: 4, description: 'Execute and close work orders, record labor', permissions: [{ module: 'Work Orders', level: 'Edit' }, { module: 'Inventory', level: 'Create' }] },
  { id: 'r-5', name: 'Technician', userCount: 8, description: 'Execute assigned work orders and log hours', permissions: [{ module: 'Work Orders', level: 'Edit' }] },
  { id: 'r-6', name: 'Procurement Officer', userCount: 1, description: 'Manage supplier relations and purchasing', permissions: [{ module: 'Procurement', level: 'Full' }] },
  { id: 'r-7', name: 'Finance Officer', userCount: 1, description: 'Invoicing, payments and financial reporting', permissions: [{ module: 'Finance', level: 'Full' }] },
  { id: 'r-8', name: 'Requester', userCount: 12, description: 'Submit maintenance requests only', permissions: [{ module: 'Requests', level: 'Create' }] },
];

const demoAuditLog = [
  { id: 'al-1', at: 'Nov 8, 11:22', userName: 'Nana Yaw Addo', action: 'Updated staff account', entityType: 'User', entityId: 'Samuel Osei', ip: '197.251.8.44', status: 'Success' },
  { id: 'al-2', at: 'Nov 8, 09:14', userName: 'Kofi Owusu', action: 'Approved work order', entityType: 'Work Order', entityId: 'WO-00284', ip: '197.251.8.12', status: 'Success' },
  { id: 'al-3', at: 'Nov 7, 16:50', userName: 'System', action: 'Failed login attempt', entityType: 'Auth', entityId: 'unknown@zemifix.local', ip: '41.66.200.11', status: 'Failed' },
  { id: 'al-4', at: 'Nov 7, 14:30', userName: 'Nana Yaw Addo', action: 'Created branch', entityType: 'Branch', entityId: 'OUT-KMS-02', ip: '197.251.8.44', status: 'Success' },
  { id: 'al-5', at: 'Nov 7, 09:00', userName: 'Kwesi Mensah', action: 'Logged labor on WO', entityType: 'Work Order', entityId: 'WO-00284', ip: '10.0.1.22', status: 'Success' },
  { id: 'al-6', at: 'Nov 6, 16:11', userName: 'System', action: 'Access denied — scope violation', entityType: 'Auth', entityId: 'Grace Owusu', ip: '10.0.1.40', status: 'Denied' },
];

const demoSessions = [
  { id: 'ss-1', userName: 'Nana Yaw Addo', device: 'Chrome 119 — Windows 11', ip: '197.251.8.44', lastActive: 'Nov 8, 11:25', otpVerified: true, active: true },
  { id: 'ss-2', userName: 'Kwesi Mensah', device: 'Mobile Safari — iPhone 15', ip: '10.0.1.22', lastActive: 'Nov 8, 10:45', otpVerified: true, active: true },
  { id: 'ss-3', userName: 'Samuel Osei', device: 'Firefox 121 — Ubuntu', ip: '10.0.1.15', lastActive: 'Nov 8, 09:30', otpVerified: false, active: false },
  { id: 'ss-4', userName: 'Kofi Owusu', device: 'Edge 119 — Windows 10', ip: '197.251.8.12', lastActive: 'Nov 7, 17:00', otpVerified: true, active: false },
];

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [userTab, setUserTab] = useState<'directory' | 'roles' | 'audit' | 'sessions'>('directory');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '', roleId: '', branchId: '', departmentId: '', accessScope: 'Department', approvalLimit: 0 });
  const [editForm, setEditForm] = useState<any>({ name: '', phone: '', roleId: '', branchId: '', departmentId: '', accessScope: 'Department', approvalLimit: 0, isActive: true });

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, bRes, dRes] = await Promise.all([
        fetch('/api/users?includeRoles=true').then((r) => r.json()),
        fetch('/api/organization/branches').then((r) => r.json()),
        fetch('/api/organization/departments').then((r) => r.json()),
      ]);
      if (uRes.error || uRes.message) { setError(uRes.message || uRes.error); }
      else {
        if (uRes.users) setUsers(uRes.users);
        else if (uRes.data) setUsers(uRes.data);
        if (uRes.isDemoData) setIsDemoData(true);
        if (uRes.roles) {
          setRoles(uRes.roles);
          if (uRes.roles.length > 0 && !createForm.roleId) setCreateForm((p) => ({ ...p, roleId: uRes.roles[0].id }));
        }
      }
      if (bRes.data) {
        setBranches(bRes.data);
        if (bRes.data.length > 0 && !createForm.branchId) setCreateForm((p) => ({ ...p, branchId: bRes.data[0].id }));
      }
      if (dRes.data) setDepartments(dRes.data);
    } catch (err: any) { setError(err?.message || 'Failed to load user directory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError(null);
    try {
      const payload: any = { name: createForm.name, email: createForm.email, phone: createForm.phone || null, password: createForm.password, roleId: createForm.roleId, branchId: createForm.branchId, accessScope: createForm.accessScope, approvalLimit: Number(createForm.approvalLimit) || 0 };
      if (createForm.departmentId) payload.departmentId = createForm.departmentId;
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setSuccessMsg(`Staff account "${payload.name}" successfully created.`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', password: '', roleId: roles[0]?.id || '', branchId: branches[0]?.id || '', departmentId: '', accessScope: 'Department', approvalLimit: 0 });
      loadData();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true); setError(null);
    try {
      const payload: any = { name: editForm.name, phone: editForm.phone || null, roleId: editForm.roleId, branchId: editForm.branchId, accessScope: editForm.accessScope, approvalLimit: Number(editForm.approvalLimit) || 0, isActive: editForm.isActive };
      if (editForm.departmentId) payload.departmentId = editForm.departmentId;
      const res = await fetch(`/api/users/${editingUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setSuccessMsg(`Staff account "${payload.name}" successfully updated.`);
      setEditingUser(null);
      loadData();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setEditForm({ name: u.name, phone: u.phone || '', roleId: u.roleId || roles[0]?.id, branchId: u.branchId || branches[0]?.id, departmentId: u.departmentId || '', accessScope: u.accessScope || 'Department', approvalLimit: u.approvalLimit || 0, isActive: u.isActive });
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.name?.toLowerCase().includes(q);
  });

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <Shell>
      <div className="space-y-0 pb-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Users & Access</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Staff & Permissions</h1>
            <p className="mt-1 text-sm text-slate-500">Staff directory, role-based access control, audit log and session management.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
            <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]">
              <Plus className="h-4 w-4" />Add Staff
            </button>
          </div>
        </div>

        {/* Banners */}
        {successMsg && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)}><X className="h-3.5 w-3.5 text-emerald-600" /></button>
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" /><div><p className="font-bold text-rose-900">PostgreSQL Unavailable</p><p className="mt-0.5">{error}</p></div></div>
            <button onClick={() => setError(null)}><X className="h-3.5 w-3.5 text-rose-600" /></button>
          </div>
        )}
        {isDemoData && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-800">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demonstration baseline:</strong>&nbsp;Displaying static user accounts. Persistent modifications require PostgreSQL.
          </div>
        )}

        {/* KPI strip */}
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { v: users.length, l: 'Total staff', dot: 'bg-slate-400' },
            { v: users.filter((u) => u.isActive).length, l: 'Active', dot: 'bg-emerald-400' },
            { v: users.filter((u) => !u.isActive).length, l: 'Suspended', dot: 'bg-slate-300' },
            { v: demoRoles.length, l: 'Roles defined', dot: 'bg-blue-400' },
          ].map((c) => (
            <div key={c.l} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className={`h-2 w-2 rounded-full shrink-0 ${c.dot}`} />
              <span className="text-sm font-bold tabular-nums text-[#0B1336]">{c.v}</span>
              <span className="text-[11px] font-medium text-slate-500">{c.l}</span>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar + tabs combined */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="relative sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, role…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
            </div>
          </div>

          <div className="border-b border-slate-100 px-4">
            <nav className="-mb-px flex gap-1">
              {[
                { id: 'directory', label: 'Directory', icon: Users, count: users.length },
                { id: 'roles', label: 'Roles & Permissions', icon: Key, count: demoRoles.length },
                { id: 'audit', label: 'Audit Log', icon: History },
                { id: 'sessions', label: 'Sessions', icon: Monitor, count: demoSessions.filter((s) => s.active).length },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = userTab === t.id;
                return (
                  <button key={t.id} onClick={() => setUserTab(t.id as typeof userTab)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${isActive ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Icon className="h-3.5 w-3.5" />{t.label}
                    {typeof t.count === 'number' && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-orange-100 text-[#E65200]' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Directory */}
          {userTab === 'directory' && (
            loading ? <div className="p-8 text-center text-xs text-slate-400">Loading staff data…</div> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Staff Member', 'Role', 'Branch & Dept', 'Access Scope', 'Approval Limit', 'Status', 'Action'].map((h, i) => <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${i === 4 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id} className={`border-b border-slate-50 hover:bg-orange-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B1336] text-[11px] font-bold text-white">{initials(u.name)}</div>
                            <div><p className="font-semibold text-slate-900">{u.name}</p><p className="text-[11px] text-slate-400">{u.email}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{u.role?.name || 'Staff'}</span></td>
                        <td className="px-4 py-3"><p className="font-medium text-slate-800">{u.branch?.name || '—'}</p><p className="text-[11px] text-slate-400">{u.department?.name || 'No department'}</p></td>
                        <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">{u.accessScope}</span></td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">GH₵ {(Number(u.approvalLimit) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${u.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />{u.isActive ? 'Active' : 'Suspended'}</span></td>
                        <td className="px-4 py-3"><button onClick={() => openEdit(u)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:underline"><Edit2 className="h-3 w-3" />Edit</button></td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">No staff accounts found.</td></tr>}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{filteredUsers.length} of {users.length} staff members</div>
              </div>
            )
          )}

          {/* Roles */}
          {userTab === 'roles' && (
            <div>
              <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-2 text-[11px] text-amber-700 font-medium">
                Demonstration role definitions. Live RBAC is managed through the permission engine connected to the database.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Role', 'Description', 'Users', 'Sample Permissions'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
                  <tbody>
                    {demoRoles.map((role, i) => (
                      <tr key={role.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 font-bold text-slate-900">{role.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{role.description}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#0B1336]">{role.userCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 3).map((p) => (
                              <span key={p.module} className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{p.module}: {p.level}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Log */}
          {userTab === 'audit' && (
            <div>
              <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-2 text-[11px] text-amber-700 font-medium">
                Demonstration audit log. Live audit events are written on every state-changing operation.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Timestamp', 'User', 'Action', 'Entity', 'IP Address', 'Result'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
                  <tbody>
                    {demoAuditLog.map((entry, i) => (
                      <tr key={entry.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{entry.at}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{entry.userName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{entry.action}</td>
                        <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{entry.entityType}</span>&nbsp;<span className="font-mono text-[10px] text-[#FF5B00]">{entry.entityId}</span></td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{entry.ip}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${entry.status === 'Success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : entry.status === 'Denied' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${entry.status === 'Success' ? 'bg-emerald-400' : entry.status === 'Denied' ? 'bg-amber-400' : 'bg-rose-400'}`} />{entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sessions */}
          {userTab === 'sessions' && (
            <div>
              <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-2 text-[11px] text-amber-700 font-medium">
                Demonstration session data. Live session management is handled by the JWT session store.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['User', 'Device / Browser', 'IP Address', 'Last Active', 'OTP', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
                  <tbody>
                    {demoSessions.map((sess, i) => (
                      <tr key={sess.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{sess.userName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{sess.device}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{sess.ip}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{sess.lastActive}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sess.otpVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{sess.otpVerified ? 'Verified' : 'Not verified'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${sess.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${sess.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />{sess.active ? 'Active' : 'Idle'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><button className="text-xs font-semibold text-rose-500 hover:underline">Revoke</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Create modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-[#0B1336]">Provision Staff Account</h3>
                <button onClick={() => setShowCreateModal(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4 p-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Full Name *</label><input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Kwame Mensah" className={`mt-1 ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Work Email *</label><input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="k.mensah@zemifix.local" className={`mt-1 ${inputCls}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Phone</label><input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+233 24 000 0000" className={`mt-1 ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Password *</label><input required type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Min 8 characters" className={`mt-1 ${inputCls}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">RBAC Role *</label><select value={createForm.roleId} onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })} className={`mt-1 ${inputCls}`}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                  <div><label className="font-semibold text-slate-700">Access Scope *</label><select value={createForm.accessScope} onChange={(e) => setCreateForm({ ...createForm, accessScope: e.target.value })} className={`mt-1 ${inputCls}`}><option value="Own">Own</option><option value="Department">Department</option><option value="Branch">Branch</option><option value="BranchAndBelow">Branch & Below</option><option value="Company">Company</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Branch *</label><select value={createForm.branchId} onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })} className={`mt-1 ${inputCls}`}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></div>
                  <div><label className="font-semibold text-slate-700">Department</label><select value={createForm.departmentId} onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                </div>
                <div><label className="font-semibold text-slate-700">Approval Limit (GH₵)</label><input type="number" min="0" step="100" value={createForm.approvalLimit} onChange={(e) => setCreateForm({ ...createForm, approvalLimit: Number(e.target.value) })} className={`mt-1 font-mono ${inputCls}`} /></div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50">{isSubmitting ? 'Provisioning…' : 'Provision Staff'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-[#0B1336]">Edit: {editingUser.email}</h3>
                <button onClick={() => setEditingUser(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4 p-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Full Name</label><input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={`mt-1 ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Phone</label><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={`mt-1 ${inputCls}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">RBAC Role</label><select value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} className={`mt-1 ${inputCls}`}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                  <div><label className="font-semibold text-slate-700">Access Scope</label><select value={editForm.accessScope} onChange={(e) => setEditForm({ ...editForm, accessScope: e.target.value })} className={`mt-1 ${inputCls}`}><option value="Own">Own</option><option value="Department">Department</option><option value="Branch">Branch</option><option value="BranchAndBelow">Branch & Below</option><option value="Company">Company</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Branch</label><select value={editForm.branchId} onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })} className={`mt-1 ${inputCls}`}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                  <div><label className="font-semibold text-slate-700">Department</label><select value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Approval Limit (GH₵)</label><input type="number" min="0" step="100" value={editForm.approvalLimit} onChange={(e) => setEditForm({ ...editForm, approvalLimit: Number(e.target.value) })} className={`mt-1 font-mono ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Account Status</label><select value={editForm.isActive ? 'true' : 'false'} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })} disabled={editingUser.email === 'admin@zemifix.local'} className={`mt-1 ${inputCls} disabled:opacity-50`}><option value="true">Active</option><option value="false">Suspended</option></select></div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50">{isSubmitting ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
