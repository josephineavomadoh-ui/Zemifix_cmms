'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { mockCompany } from '@/src/lib/mockData';
import {
  Settings,
  Building,
  Hash,
  ShieldCheck,
  Bell,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Database,
  Globe,
  DollarSign,
  X,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'sequences' | 'dualControl' | 'notifications' | 'security'>('general');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // General Settings State
  const [companyName, setCompanyName] = useState(mockCompany.name);
  const [brandName, setBrandName] = useState(mockCompany.brandName);
  const [facilityMode, setFacilityMode] = useState(true);
  const [contractorMode, setContractorMode] = useState(true);
  const [currency, setCurrency] = useState(mockCompany.baseCurrency);
  const [timezone, setTimezone] = useState(mockCompany.timezone);

  // Sequence Prefixes
  const [prefixes, setPrefixes] = useState({
    wo: 'WO-',
    req: 'REQ-',
    ast: 'AST-',
    po: 'PO-',
    inv: 'INV-',
    pm: 'PM-PLN-',
  });

  // Dual Control Settings
  const [dualControlPOThreshold, setDualControlPOThreshold] = useState('10000');
  const [dualControlWOThreshold, setDualControlWOThreshold] = useState('5000');
  const [requireStockWriteoffApproval, setRequireStockWriteoffApproval] = useState(true);

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsUrgentAlerts, setSmsUrgentAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  // Security
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [enforce2FA, setEnforce2FA] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice('System configuration preferences saved successfully.');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Settings className="h-3.5 w-3.5" />
              <span>Domain 12: System Administration & Governance</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              System Settings & Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure enterprise operating profiles, document number sequences, dual-control limits, and security policies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {savedNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{savedNotice}</span>
            </div>
            <button onClick={() => setSavedNotice(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>General & Operating Modes</span>
            </button>

            <button
              onClick={() => setActiveTab('sequences')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'sequences'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Hash className="h-4 w-4" />
              <span>Document Sequences</span>
            </button>

            <button
              onClick={() => setActiveTab('dualControl')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dualControl'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Dual-Control Approval Limits</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Notifications & Alerts</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'security'
                  ? 'border-[#FF5B00] text-[#0B1336]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Security & Policies</span>
            </button>
          </nav>
        </div>

        {/* Tab 1: General & Operating Modes */}
        {activeTab === 'general' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#0B1336]">Enterprise Operating Profile</h3>
              <p className="text-slate-500 text-xs mt-0.5">Define corporate legal identity and active CMMS deployment models.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700">Company Legal Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Brand Display Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                >
                  <option value="GHS">GHS - Ghana Cedi (GH₵)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Operating Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="Africa/Accra">Africa/Accra (GMT +00:00)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT +01:00)</option>
                  <option value="UTC">UTC Universal</option>
                </select>
              </div>
            </div>

            {/* Operating Modes Toggle Cards */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900">Active Deployment Modes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <span className="font-bold text-slate-900 block">Facility Owner / In-House Mode</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Enables internal maintenance dispatch, work order checklists, department chargebacks, and corporate asset stewardship.
                    </p>
                  </div>
                  <button onClick={() => setFacilityMode(!facilityMode)}>
                    {facilityMode ? (
                      <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-300" />
                    )}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-start justify-between">
                  <div className="space-y-1 pr-4">
                    <span className="font-bold text-slate-900 block">Contractor / Commercial Billing Mode</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Enables client contracts, customer quotes, billable labor rates, and Ghana GRA tax-compliant customer invoicing.
                    </p>
                  </div>
                  <button onClick={() => setContractorMode(!contractorMode)}>
                    {contractorMode ? (
                      <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Document Sequences */}
        {activeTab === 'sequences' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#0B1336]">Document Numbering Sequences</h3>
              <p className="text-slate-500 text-xs mt-0.5">Customize serial prefixes used to generate enterprise identifiers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Work Order Prefix</label>
                <input
                  type="text"
                  value={prefixes.wo}
                  onChange={(e) => setPrefixes({ ...prefixes, wo: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: WO-00285</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Maintenance Request Prefix</label>
                <input
                  type="text"
                  value={prefixes.req}
                  onChange={(e) => setPrefixes({ ...prefixes, req: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: REQ-00513</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Asset Tag Prefix</label>
                <input
                  type="text"
                  value={prefixes.ast}
                  onChange={(e) => setPrefixes({ ...prefixes, ast: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: AST-HVAC-015</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Purchase Order Prefix</label>
                <input
                  type="text"
                  value={prefixes.po}
                  onChange={(e) => setPrefixes({ ...prefixes, po: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: PO-2026-0090</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Tax Invoice Prefix</label>
                <input
                  type="text"
                  value={prefixes.inv}
                  onChange={(e) => setPrefixes({ ...prefixes, inv: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: INV-2026-0046</span>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-sans">Preventive Plan Prefix</label>
                <input
                  type="text"
                  value={prefixes.pm}
                  onChange={(e) => setPrefixes({ ...prefixes, pm: e.target.value })}
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-[#0B1336]"
                />
                <span className="text-[10px] text-slate-400 font-sans">Example: PM-PLN-006</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Dual-Control Approval Limits */}
        {activeTab === 'dualControl' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#0B1336]">Dual-Control Maker-Checker Governance</h3>
              <p className="text-slate-500 text-xs mt-0.5">Enforce fraud prevention and segregation of duties for high-value financial events.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                <label className="font-bold text-slate-900 block">Purchase Order Dual-Control Ceiling (GH₵)</label>
                <p className="text-[11px] text-slate-500">
                  Any purchase requisition above this limit cannot be issued by a technician alone; requires second-signatory approval.
                </p>
                <input
                  type="number"
                  value={dualControlPOThreshold}
                  onChange={(e) => setDualControlPOThreshold(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                <label className="font-bold text-slate-900 block">Work Order Cost Estimation Threshold (GH₵)</label>
                <p className="text-[11px] text-slate-500">
                  Corrective work orders exceeding this estimated total require Branch Manager authorization before starting.
                </p>
                <input
                  type="number"
                  value={dualControlWOThreshold}
                  onChange={(e) => setDualControlWOThreshold(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Require Approval on Inventory Write-Offs</span>
                <p className="text-[11px] text-slate-500">Manual cycle count downward adjustments exceeding GH₵ 2,000 require manager signoff.</p>
              </div>
              <button onClick={() => setRequireStockWriteoffApproval(!requireStockWriteoffApproval)}>
                {requireStockWriteoffApproval ? (
                  <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Notifications & Alerts */}
        {activeTab === 'notifications' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#0B1336]">Automated Alerts & Dispatch Channels</h3>
              <p className="text-slate-500 text-xs mt-0.5">Control operational event broadcasting and SLA breach triggers.</p>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Technician Email Dispatch & SLA Warnings</span>
                  <p className="text-[11px] text-slate-500">Dispatches notification when a work order is assigned or reaches 75% of SLA threshold.</p>
                </div>
                <button onClick={() => setEmailAlerts(!emailAlerts)}>
                  {emailAlerts ? (
                    <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Emergency SMS Broadcast to On-Call Leads</span>
                  <p className="text-[11px] text-slate-500">Sends urgent SMS to branch duty engineer when an Emergency maintenance fault is filed.</p>
                </div>
                <button onClick={() => setSmsUrgentAlerts(!smsUrgentAlerts)}>
                  {smsUrgentAlerts ? (
                    <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Low Stock Automatic Reorder Advisories</span>
                  <p className="text-[11px] text-slate-500">Alerts warehouse procurement team whenever inventory falls below minimum buffer level.</p>
                </div>
                <button onClick={() => setLowStockAlerts(!lowStockAlerts)}>
                  {lowStockAlerts ? (
                    <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-300" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security & Policies */}
        {activeTab === 'security' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6 text-xs">
            <div>
              <h3 className="text-sm font-bold text-[#0B1336]">Security, Sessions & Compliance</h3>
              <p className="text-slate-500 text-xs mt-0.5">Configure authentication constraints and cryptographic audit logs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                <label className="font-bold text-slate-900 block">Session Idle Timeout</label>
                <p className="text-[11px] text-slate-500">Automatically logs out inactive browser sessions to safeguard workstation terminals.</p>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Recommended)</option>
                  <option value="60">60 Minutes</option>
                </select>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                <label className="font-bold text-slate-900 block">Demonstration Isolation Status</label>
                <p className="text-[11px] text-slate-500">Current AI Studio environment security posture.</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-1 text-[11px] border border-emerald-200">
                    Demonstration Baseline Active
                  </span>
                  <span className="text-slate-500 text-[10px]">Staff APIs Protected</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Enforce Multi-Factor (MFA) on Dual-Control Approvals</span>
                <p className="text-[11px] text-slate-500">Requires secondary SMS or authenticator OTP confirmation for high-value orders.</p>
              </div>
              <button onClick={() => setEnforce2FA(!enforce2FA)}>
                {enforce2FA ? (
                  <ToggleRight className="h-6 w-6 text-[#FF5B00]" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
