'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import {
  Building, Layers, Plus, RefreshCw, CheckCircle2, AlertCircle, X,
  ChevronRight, MapPin, Phone, User, Shield,
} from 'lucide-react';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'company' | 'mode'>('branches');
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [branchForm, setBranchForm] = useState({ name: '', code: '', type: 'Branch', parentId: '', address: '', phone: '', managerUserId: '', alternateApproverId: '', invoicePrefix: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', parentId: '', headUserId: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, dRes, cRes, uRes] = await Promise.all([
        fetch('/api/organization/branches').then((r) => r.json()),
        fetch('/api/organization/departments').then((r) => r.json()),
        fetch('/api/organization/company').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);
      if (bRes.error || bRes.message) { setError(bRes.message || bRes.error); }
      else {
        if (bRes.data) setBranches(bRes.data);
        if (bRes.isDemoData) setIsDemoData(true);
      }
      if (dRes.data) setDepartments(dRes.data);
      if (cRes.data) setCompany(cRes.data);
      if (uRes.data) setUsers(uRes.data);
    } catch (err: any) { setError(err?.message || 'Failed to load organization data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError(null);
    try {
      const payload: any = { name: branchForm.name, code: branchForm.code.toUpperCase(), type: branchForm.type, address: branchForm.address || null, phone: branchForm.phone || null, invoicePrefix: branchForm.invoicePrefix || null };
      if (branchForm.parentId) payload.parentId = branchForm.parentId;
      if (branchForm.managerUserId) payload.managerUserId = branchForm.managerUserId;
      if (branchForm.alternateApproverId) payload.alternateApproverId = branchForm.alternateApproverId;
      const res = await fetch('/api/organization/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');
      setSuccessMsg(`Branch "${payload.name}" created with path ${data.data.path}`);
      setShowBranchModal(false);
      setBranchForm({ name: '', code: '', type: 'Branch', parentId: '', address: '', phone: '', managerUserId: '', alternateApproverId: '', invoicePrefix: '' });
      loadData();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true); setError(null);
    try {
      const payload: any = { name: deptForm.name, code: deptForm.code.toUpperCase() };
      if (deptForm.parentId) payload.parentId = deptForm.parentId;
      if (deptForm.headUserId) payload.headUserId = deptForm.headUserId;
      const res = await fetch('/api/organization/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create department');
      setSuccessMsg(`Department "${payload.name}" created with path ${data.data.path}`);
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', parentId: '', headUserId: '' });
      loadData();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]';

  return (
    <Shell>
      <div className="space-y-0 pb-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Organization Management</p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Organization</h1>
            <p className="mt-1 text-sm text-slate-500">Company profile, branch hierarchy, department structure and operating mode configuration.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
            </button>
            {activeTab === 'branches' && (
              <button onClick={() => setShowBranchModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]">
                <Plus className="h-4 w-4" />Add Branch
              </button>
            )}
            {activeTab === 'departments' && (
              <button onClick={() => setShowDeptModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]">
                <Plus className="h-4 w-4" />Add Department
              </button>
            )}
          </div>
        </div>

        {/* Success / Error / Demo banners */}
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
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <strong>Demonstration baseline:</strong>&nbsp;Displaying static data. Persistent writes require an active PostgreSQL connection.
          </div>
        )}

        {/* Main card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Tabs */}
          <div className="border-b border-slate-100 px-4">
            <nav className="-mb-px flex gap-1">
              {[
                { id: 'branches', label: `Branches`, count: branches.length },
                { id: 'departments', label: 'Departments', count: departments.length },
                { id: 'company', label: 'Company Profile' },
                { id: 'mode', label: 'Operating Modes' },
              ].map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${isActive ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    {t.label}
                    {typeof t.count === 'number' && t.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-orange-100 text-[#E65200]' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Branches */}
          {activeTab === 'branches' && (
            loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading branch data…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Branch', 'Code', 'Level', 'Materialized Path', 'Manager', 'Contact', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
                  <tbody>
                    {branches.map((b, i) => (
                      <tr key={b.id} className={`border-b border-slate-50 hover:bg-orange-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B1336]"><Building className="h-3.5 w-3.5 text-white" /></div>
                            <div><p className="font-semibold text-slate-900">{b.name}</p>{b.parent && <p className="text-[10px] text-slate-400">Under: {b.parent.name}</p>}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-[#0B1336]">{b.code}</td>
                        <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{b.type}</span></td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{b.path || `/${b.code}/`}</td>
                        <td className="px-4 py-3"><p className="font-medium text-slate-800">{b.managerUser?.name || 'Unassigned'}</p>{b.alternateApprover && <p className="text-[10px] text-slate-400">Alt: {b.alternateApprover.name}</p>}</td>
                        <td className="px-4 py-3 text-xs text-slate-500"><p className="truncate max-w-[140px]">{b.address || '—'}</p><p className="text-[10px] text-slate-400">{b.phone || '—'}</p></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${b.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />{b.isActive ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                    {branches.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">No branches loaded.</td></tr>}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{branches.length} branches · materialized path hierarchy</div>
              </div>
            )
          )}

          {/* Departments */}
          {activeTab === 'departments' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Department', 'Code', 'Materialized Path', 'Department Head', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
                <tbody>
                  {departments.map((d, i) => (
                    <tr key={d.id} className={`border-b border-slate-50 hover:bg-orange-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-700"><Layers className="h-3.5 w-3.5 text-white" /></div>
                          <div><p className="font-semibold text-slate-900">{d.name}</p>{d.parent && <p className="text-[10px] text-slate-400">Parent: {d.parent.name}</p>}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#0B1336]">{d.code}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{d.path || `/${d.code}/`}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">{d.headUser?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${d.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}><span className={`h-1.5 w-1.5 rounded-full ${d.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />{d.isActive ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                  {departments.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">No departments loaded.</td></tr>}
                </tbody>
              </table>
              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{departments.length} departments</div>
            </div>
          )}

          {/* Company Profile */}
          {activeTab === 'company' && company && (
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3 rounded-xl bg-[#0B1336] p-4 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5B00]"><Building className="h-5 w-5" /></div>
                <div><p className="font-bold">{company.name}</p><p className="text-[11px] text-slate-300">{company.legalName}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Operating name', value: company.name },
                  { label: 'Base currency & locale', value: `${company.baseCurrency} · ${company.locale}` },
                  { label: 'Timezone', value: company.timezone },
                  { label: 'Tax scheme', value: company.taxScheme },
                  { label: 'Fiscal year start', value: `Month ${company.fiscalYearStart}` },
                  { label: 'Active modes', value: <div className="flex gap-1 mt-0.5"><span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Facility</span><span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">Contractor</span></div> },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{m.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Document numbering prefixes</p>
                <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                  {[['Work Order', 'WO-'], ['Invoice', 'INV-'], ['Quote', 'QT-'], ['Asset', 'AST-'], ['Request', 'REQ-'], ['PO', 'PO-']].map(([n, p]) => (
                    <div key={n} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5"><span className="text-slate-400">{n}: </span><span className="font-bold text-[#0B1336]">{p}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Operating Modes */}
          {activeTab === 'mode' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { code: 'FM', color: 'emerald', title: 'Facility Mode', subtitle: 'Internal maintenance operations', features: ['Internal asset register', 'Branch & department hierarchy', 'Internal work order management', 'Internal inventory & procurement', 'PM schedules for owned assets'] },
                  { code: 'CM', color: 'blue', title: 'Contractor Mode', subtitle: 'External customer service delivery', features: ['Customer register & service contracts', 'Customer facility management', 'Customer-scoped work orders', 'Service billing and invoicing', 'Customer data isolation enforced'] },
                ].map((mode) => (
                  <div key={mode.code} className={`rounded-xl border p-5 ${mode.color === 'emerald' ? 'border-emerald-200 bg-emerald-50/60' : 'border-blue-200 bg-blue-50/60'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white ${mode.color === 'emerald' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{mode.code}</div>
                      <div>
                        <p className={`font-bold ${mode.color === 'emerald' ? 'text-emerald-900' : 'text-blue-900'}`}>{mode.title}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${mode.color === 'emerald' ? 'text-emerald-700' : 'text-blue-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${mode.color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`} />Active</span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${mode.color === 'emerald' ? 'text-emerald-700' : 'text-blue-700'}`}>{mode.subtitle}</p>
                    <ul className="space-y-1">
                      {mode.features.map((f) => (
                        <li key={f} className={`flex items-center gap-1.5 text-[11px] ${mode.color === 'emerald' ? 'text-emerald-800' : 'text-blue-800'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${mode.color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <p className="font-bold text-amber-900">Changing operating modes requires administrator authorization and is audit-logged.</p>
                <p className="mt-1 opacity-80">Configure operating modes in <span className="font-semibold">System Settings → Operating Mode</span>.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                    <tr><th className="px-4 py-2.5">Entity</th><th className="px-4 py-2.5">Count</th><th className="px-4 py-2.5">Hierarchy</th><th className="px-4 py-2.5">Purpose</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[['Branches', branches.length, 'Materialized path', 'Geographic and operational scoping'], ['Departments', departments.length, 'Materialized path', 'Functional unit grouping'], ['Customers', 3, 'Flat register', 'Contractor mode: customer data isolation']].map(([entity, count, hierarchy, purpose]) => (
                      <tr key={entity as string} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{entity}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#0B1336]">{count}</td>
                        <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{hierarchy}</span></td>
                        <td className="px-4 py-3 text-slate-500">{purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Branch modal */}
        {showBranchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-[#0B1336]">Create Organizational Branch</h3>
                <button onClick={() => setShowBranchModal(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreateBranch} className="space-y-4 p-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Branch Name *</label><input required value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="e.g. Kumasi Industrial Depot" className={`mt-1 ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Branch Code *</label><input required value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} placeholder="e.g. BRN-KMS" className={`mt-1 font-mono ${inputCls}`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Hierarchy Level</label><select value={branchForm.type} onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })} className={`mt-1 ${inputCls}`}><option>Region</option><option>Branch</option><option>Outlet</option></select></div>
                  <div><label className="font-semibold text-slate-700">Parent Branch</label><select value={branchForm.parentId} onChange={(e) => setBranchForm({ ...branchForm, parentId: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">None (Top Level)</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></div>
                </div>
                <div><label className="font-semibold text-slate-700">Physical Address</label><input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} placeholder="Street / City" className={`mt-1 ${inputCls}`} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="font-semibold text-slate-700">Phone</label><input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="+233 30 000 0000" className={`mt-1 ${inputCls}`} /></div>
                  <div><label className="font-semibold text-slate-700">Invoice Prefix</label><input value={branchForm.invoicePrefix} onChange={(e) => setBranchForm({ ...branchForm, invoicePrefix: e.target.value })} placeholder="e.g. KMS-" className={`mt-1 font-mono ${inputCls}`} /></div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setShowBranchModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50">{isSubmitting ? 'Creating…' : 'Create Branch'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dept modal */}
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-[#0B1336]">Create Department</h3>
                <button onClick={() => setShowDeptModal(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreateDept} className="space-y-4 p-5 text-xs">
                <div><label className="font-semibold text-slate-700">Department Name *</label><input required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Health, Safety & Environment" className={`mt-1 ${inputCls}`} /></div>
                <div><label className="font-semibold text-slate-700">Department Code *</label><input required value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. DEPT-HSE" className={`mt-1 font-mono ${inputCls}`} /></div>
                <div><label className="font-semibold text-slate-700">Parent Department</label><select value={deptForm.parentId} onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })} className={`mt-1 ${inputCls}`}><option value="">None (Top Level)</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}</select></div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setShowDeptModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50">{isSubmitting ? 'Creating…' : 'Create Department'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
