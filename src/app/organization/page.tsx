'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import {
  Building,
  Layers,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Phone,
  User,
  Shield,
  ChevronRight,
  X,
} from 'lucide-react';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'company'>('branches');
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  // Modal state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New branch form
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    type: 'Branch',
    parentId: '',
    address: '',
    phone: '',
    managerUserId: '',
    alternateApproverId: '',
    invoicePrefix: '',
  });

  // New department form
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    parentId: '',
    headUserId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, dRes, cRes, uRes] = await Promise.all([
        fetch('/api/organization/branches').then((r) => r.json()),
        fetch('/api/organization/departments').then((r) => r.json()),
        fetch('/api/organization/company').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);

      if (bRes.error || bRes.message) {
        setError(bRes.message || bRes.error);
      } else {
        if (bRes.data) setBranches(bRes.data);
        if (bRes.isDemoData) setIsDemoData(true);
      }

      if (dRes.data) setDepartments(dRes.data);
      if (cRes.data) setCompany(cRes.data);
      if (uRes.data) setUsers(uRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: branchForm.name,
        code: branchForm.code.toUpperCase(),
        type: branchForm.type,
        address: branchForm.address || null,
        phone: branchForm.phone || null,
        invoicePrefix: branchForm.invoicePrefix || null,
      };
      if (branchForm.parentId) payload.parentId = branchForm.parentId;
      if (branchForm.managerUserId) payload.managerUserId = branchForm.managerUserId;
      if (branchForm.alternateApproverId) payload.alternateApproverId = branchForm.alternateApproverId;

      const res = await fetch('/api/organization/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create branch');

      setSuccessMsg(`Branch "${payload.name}" successfully created with path ${data.data.path}`);
      setShowBranchModal(false);
      setBranchForm({
        name: '',
        code: '',
        type: 'Branch',
        parentId: '',
        address: '',
        phone: '',
        managerUserId: '',
        alternateApproverId: '',
        invoicePrefix: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error creating branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: deptForm.name,
        code: deptForm.code.toUpperCase(),
      };
      if (deptForm.parentId) payload.parentId = deptForm.parentId;
      if (deptForm.headUserId) payload.headUserId = deptForm.headUserId;

      const res = await fetch('/api/organization/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create department');

      setSuccessMsg(`Department "${payload.name}" successfully created with path ${data.data.path}`);
      setShowDeptModal(false);
      setDeptForm({
        name: '',
        code: '',
        parentId: '',
        headUserId: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error creating department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Building className="h-3.5 w-3.5" />
              <span>Domain 01: Organization Management</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Organization & Branch Tree
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage enterprise singleton entity, multi-tier branch hierarchy, and operational departments.
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
            {activeTab === 'branches' && (
              <button
                onClick={() => setShowBranchModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Branch</span>
              </button>
            )}
            {activeTab === 'departments' && (
              <button
                onClick={() => setShowDeptModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </button>
            )}
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
                  Persistent branch/department writes are halted until PostgreSQL is reachable.
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
              <strong className="font-bold">Demonstration Baseline:</strong> Displaying static branch tree. Persistent modifications require an active PostgreSQL connection.
            </span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('branches')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'branches'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Branch Network ({branches.length})
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'departments'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Department Units ({departments.length})
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'company'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Enterprise Deployment Settings
            </button>
          </nav>
        </div>

        {/* Tab 1: Branches */}
        {activeTab === 'branches' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Branch Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Materialized Path</th>
                    <th className="py-3 px-4">Manager / Approver</th>
                    <th className="py-3 px-4">Address & Phone</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#FF5B00]" />
                          <span>{b.name}</span>
                        </div>
                        {b.parent && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Under: {b.parent.name} ({b.parent.code})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336]">
                        {b.code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {b.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {b.path || `/${b.code}/`}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {b.managerUser?.name || 'Unassigned'}
                        </div>
                        {b.alternateApprover && (
                          <div className="text-[10px] text-slate-400">
                            Alt: {b.alternateApprover.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        <div className="truncate">{b.address || '—'}</div>
                        <div className="text-[10px] text-slate-400">{b.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Departments */}
        {activeTab === 'departments' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Materialized Path</th>
                    <th className="py-3 px-4">Department Head</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[#0B1336]" />
                          <span>{d.name}</span>
                        </div>
                        {d.parent && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Parent: {d.parent.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336]">
                        {d.code}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {d.path || `/${d.code}/`}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {d.headUser?.name || 'Unassigned Head'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Company Profile */}
        {activeTab === 'company' && company && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-[#0B1336]">
                Singleton Company Deployment Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative multi-tenant isolation baseline configured for single enterprise deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">Operating Name</span>
                <p className="font-bold text-slate-900 text-sm">{company.name}</p>
                <p className="text-slate-500 text-[11px]">{company.legalName}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">Base Currency & Timezone</span>
                <p className="font-bold text-[#0B1336] text-sm">
                  {company.baseCurrency} ({company.locale})
                </p>
                <p className="text-slate-500 text-[11px]">{company.timezone}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">Tax Scheme & Fiscal Year</span>
                <p className="font-semibold text-slate-900">{company.taxScheme}</p>
                <p className="text-slate-500 text-[11px]">Fiscal Year Start: Month {company.fiscalYearStart}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">Active Operating Modes</span>
                <div className="flex gap-2 mt-1">
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Facility Mode
                  </span>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    Contractor Mode
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-1 col-span-1 md:col-span-2">
                <span className="text-slate-400 text-[11px] font-semibold uppercase">Document Numbering Prefixes</span>
                <div className="flex flex-wrap gap-3 mt-1 font-mono text-[11px]">
                  <span className="rounded bg-slate-200/70 px-2 py-0.5">Work Order: WO-</span>
                  <span className="rounded bg-slate-200/70 px-2 py-0.5">Invoice: INV-</span>
                  <span className="rounded bg-slate-200/70 px-2 py-0.5">Quote: QT-</span>
                  <span className="rounded bg-slate-200/70 px-2 py-0.5">Asset: AST-</span>
                  <span className="rounded bg-slate-200/70 px-2 py-0.5">Request: REQ-</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Branch */}
        {showBranchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336]">Create New Organizational Branch</h3>
                <button onClick={() => setShowBranchModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Branch Name *</label>
                    <input
                      required
                      type="text"
                      value={branchForm.name}
                      onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                      placeholder="e.g. Kumasi Industrial Depot"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Branch Code *</label>
                    <input
                      required
                      type="text"
                      value={branchForm.code}
                      onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                      placeholder="e.g. BRN-KMS"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Hierarchy Level</label>
                    <select
                      value={branchForm.type}
                      onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Region">Region</option>
                      <option value="Branch">Branch</option>
                      <option value="Outlet">Outlet</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Parent Branch</label>
                    <select
                      value={branchForm.parentId}
                      onChange={(e) => setBranchForm({ ...branchForm, parentId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="">None (Top Level)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Physical Address</label>
                  <input
                    type="text"
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    placeholder="Plot / Commercial Street / City"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Contact Phone</label>
                    <input
                      type="text"
                      value={branchForm.phone}
                      onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                      placeholder="+233 30 000 0000"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Invoice Prefix</label>
                    <input
                      type="text"
                      value={branchForm.invoicePrefix}
                      onChange={(e) => setBranchForm({ ...branchForm, invoicePrefix: e.target.value })}
                      placeholder="e.g. KMS-"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Department */}
        {showDeptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336]">Create New Department</h3>
                <button onClick={() => setShowDeptModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateDept} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Department Name *</label>
                  <input
                    required
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Health, Safety & Environment"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Department Code *</label>
                  <input
                    required
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="e.g. DEPT-HSE"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Parent Department</label>
                  <select
                    value={deptForm.parentId}
                    onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  >
                    <option value="">None (Top Level Department)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeptModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Department'}
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
