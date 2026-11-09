'use client';

import React, { useState } from 'react';
import {
  Settings, Building2, Globe, Hash, ClipboardList, Wrench,
  CalendarCheck2, Boxes, Truck, Receipt, ShieldCheck, Bell,
  Mail, Lock, Activity, Clock, Save, CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'company',     label: 'Company',           icon: Building2 },
  { id: 'regional',    label: 'Regional & Tax',     icon: Globe },
  { id: 'numbering',   label: 'Numbering',          icon: Hash },
  { id: 'work-orders', label: 'Work Orders',         icon: ClipboardList },
  { id: 'assets',      label: 'Assets',             icon: Wrench },
  { id: 'pm',          label: 'Preventive Maint.',  icon: CalendarCheck2 },
  { id: 'inventory',   label: 'Inventory',          icon: Boxes },
  { id: 'procurement', label: 'Procurement',        icon: Truck },
  { id: 'finance',     label: 'Finance',            icon: Receipt },
  { id: 'approvals',   label: 'Approvals',          icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'email-sms',   label: 'Email & SMS',        icon: Mail },
  { id: 'security',    label: 'Security',           icon: Lock },
  { id: 'mode',        label: 'Operating Mode',     icon: Activity },
  { id: 'audit',       label: 'Audit',              icon: Clock },
];

type RowType = 'text' | 'select' | 'toggle' | 'number' | 'email' | 'readonly';

interface SettingRow {
  key: string;
  label: string;
  description?: string;
  type: RowType;
  value: string | boolean;
  options?: string[];
  sensitive?: boolean;
}

const SETTINGS: Record<string, SettingRow[]> = {
  company: [
    { key: 'company_name', label: 'Company name', description: 'Operating name displayed across the application', type: 'text', value: 'ZemiFix Engineering Solutions Ltd.' },
    { key: 'legal_name', label: 'Legal entity name', description: 'Full registered legal name', type: 'text', value: 'ZemiFix Engineering Services Ghana Limited' },
    { key: 'tax_scheme', label: 'Tax scheme', type: 'select', value: 'Ghana — GRA Standard', options: ['Ghana — GRA Standard', 'Nigeria — FIRS VAT', 'Kenya — KRA VAT', 'Custom'] },
    { key: 'fiscal_year_start', label: 'Fiscal year start month', description: 'Month 1 = January', type: 'number', value: '1' },
  ],
  regional: [
    { key: 'base_currency', label: 'Base currency', type: 'select', value: 'GHS', options: ['GHS', 'NGN', 'KES', 'ZAR', 'USD', 'EUR', 'GBP'] },
    { key: 'timezone', label: 'Timezone', type: 'select', value: 'Africa/Accra', options: ['Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg', 'UTC'] },
    { key: 'date_format', label: 'Date format', type: 'select', value: 'YYYY-MM-DD', options: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'] },
    { key: 'locale', label: 'Locale', type: 'select', value: 'en-GH', options: ['en-GH', 'en-NG', 'en-KE', 'en-ZA', 'en-US'] },
    { key: 'vat_rate', label: 'VAT rate (%)', description: 'Standard VAT applied to invoice subtotals', type: 'number', value: '15' },
    { key: 'nhil_rate', label: 'NHIL rate (%)', type: 'number', value: '2.5' },
    { key: 'getfund_rate', label: 'GETFund levy (%)', type: 'number', value: '2.5' },
    { key: 'covid_levy', label: 'COVID-19 levy (%)', type: 'number', value: '1' },
  ],
  numbering: [
    { key: 'wo_prefix', label: 'Work order prefix', type: 'text', value: 'WO-' },
    { key: 'req_prefix', label: 'Request prefix', type: 'text', value: 'REQ-' },
    { key: 'inv_prefix', label: 'Invoice prefix', type: 'text', value: 'INV-' },
    { key: 'po_prefix', label: 'Purchase order prefix', type: 'text', value: 'PO-' },
    { key: 'pr_prefix', label: 'Requisition prefix', type: 'text', value: 'PR-' },
    { key: 'ast_prefix', label: 'Asset tag prefix', type: 'text', value: 'AST-' },
    { key: 'grn_prefix', label: 'GRN prefix', type: 'text', value: 'GRN-' },
    { key: 'pm_prefix', label: 'PM plan prefix', type: 'text', value: 'PM-' },
  ],
  'work-orders': [
    { key: 'wo_sla_urgent', label: 'SLA target — Urgent (hours)', type: 'number', value: '24' },
    { key: 'wo_sla_high', label: 'SLA target — High (hours)', type: 'number', value: '48' },
    { key: 'wo_sla_medium', label: 'SLA target — Medium (hours)', type: 'number', value: '120' },
    { key: 'wo_sla_low', label: 'SLA target — Low (hours)', type: 'number', value: '240' },
    { key: 'wo_require_approval', label: 'Require approval on all work orders', type: 'toggle', value: false },
    { key: 'wo_require_verification', label: 'Require verification on completion', type: 'toggle', value: true },
    { key: 'wo_auto_generate_pm', label: 'Auto-generate PM work orders', description: 'PM plans generate WOs automatically on due date', type: 'toggle', value: true },
  ],
  assets: [
    { key: 'ast_require_tag', label: 'Require unique asset tag', type: 'toggle', value: true },
    { key: 'ast_allow_untagged', label: 'Allow untagged assets', type: 'toggle', value: false },
    { key: 'ast_depreciation', label: 'Default depreciation method', type: 'select', value: 'Straight Line', options: ['Straight Line', 'Reducing Balance', 'Units of Production', 'None'] },
    { key: 'ast_useful_life', label: 'Default useful life (years)', type: 'number', value: '10' },
  ],
  pm: [
    { key: 'pm_auto_generate', label: 'Auto-generate PM work orders', type: 'toggle', value: true },
    { key: 'pm_advance_days', label: 'Generate WO advance (days)', description: 'Days before due date to generate the WO', type: 'number', value: '3' },
    { key: 'pm_compliance_threshold', label: 'Compliance threshold (%)', type: 'number', value: '90' },
    { key: 'pm_overdue_alert_days', label: 'Overdue alert threshold (days)', type: 'number', value: '2' },
  ],
  inventory: [
    { key: 'inv_costing', label: 'Inventory costing method', type: 'select', value: 'Weighted Average Cost (WAC)', options: ['Weighted Average Cost (WAC)', 'FIFO', 'Standard Cost'] },
    { key: 'inv_negative_stock', label: 'Allow negative stock', type: 'toggle', value: false },
    { key: 'inv_require_adj_approval', label: 'Require approval for adjustments', type: 'toggle', value: true },
    { key: 'inv_alert_method', label: 'Low stock alert method', type: 'select', value: 'Reorder Point', options: ['Reorder Point', 'Minimum Level', 'Both'] },
  ],
  procurement: [
    { key: 'proc_require_pr', label: 'Require purchase requisition', description: 'POs must originate from an approved PR', type: 'toggle', value: true },
    { key: 'proc_three_way', label: 'Enforce 3-way matching', description: 'Block payment unless PO, GRN and invoice match', type: 'toggle', value: true },
    { key: 'proc_po_threshold', label: 'PO approval threshold (GH₵)', type: 'number', value: '10000' },
    { key: 'proc_rfq_threshold', label: 'RFQ required above (GH₵)', type: 'number', value: '50000' },
  ],
  finance: [
    { key: 'fin_inv_prefix', label: 'Invoice number prefix', type: 'text', value: 'INV-' },
    { key: 'fin_payment_terms', label: 'Default payment terms (days)', type: 'number', value: '14' },
    { key: 'fin_auto_invoice', label: 'Auto-generate invoice on WO close', description: 'Contractor mode: invoices generated automatically', type: 'toggle', value: false },
    { key: 'fin_overdue_alert', label: 'Overdue invoice alert (days)', type: 'number', value: '3' },
  ],
  approvals: [
    { key: 'approval_dual_control', label: 'Enable dual-control (maker-checker)', description: 'All financial approvals require a second authoriser', type: 'toggle', value: true },
    { key: 'approval_wo_threshold', label: 'Work order approval threshold (GH₵)', type: 'number', value: '5000' },
    { key: 'approval_pr_threshold', label: 'PR approval threshold (GH₵)', type: 'number', value: '2000' },
    { key: 'approval_escalation_hours', label: 'Escalation after (hours)', type: 'number', value: '48' },
  ],
  notifications: [
    { key: 'notif_wo_assigned', label: 'Notify technician on WO assignment', type: 'toggle', value: true },
    { key: 'notif_wo_overdue', label: 'Notify supervisor on WO overdue', type: 'toggle', value: true },
    { key: 'notif_pm_due', label: 'Notify team on PM due', type: 'toggle', value: true },
    { key: 'notif_low_stock', label: 'Notify stores on low stock', type: 'toggle', value: true },
    { key: 'notif_pending_approval', label: 'Notify approver on pending items', type: 'toggle', value: true },
    { key: 'notif_invoice_overdue', label: 'Notify finance on overdue invoices', type: 'toggle', value: true },
  ],
  'email-sms': [
    { key: 'smtp_host', label: 'SMTP host', type: 'text', value: 'smtp.sendgrid.net' },
    { key: 'smtp_port', label: 'SMTP port', type: 'number', value: '587' },
    { key: 'smtp_from', label: 'From email address', type: 'email', value: 'noreply@zemifix.local' },
    { key: 'smtp_password', label: 'SMTP password / API key', description: 'Credential not displayed for security', type: 'readonly', value: '••••••••••••••', sensitive: true },
    { key: 'sms_provider', label: 'SMS provider', type: 'select', value: 'Twilio', options: ["Twilio", "Africa's Talking", 'Hubtel', 'None'] },
    { key: 'sms_sender_id', label: 'SMS sender ID', description: 'Alphanumeric, max 11 chars', type: 'text', value: 'ZEMIFIX' },
    { key: 'sms_api_key', label: 'SMS API key', description: 'Not displayed for security', type: 'readonly', value: '••••••••••••••', sensitive: true },
  ],
  security: [
    { key: 'sec_session_lifetime', label: 'Session lifetime (minutes)', type: 'number', value: '480' },
    { key: 'sec_require_otp', label: 'Require OTP on login', type: 'toggle', value: true },
    { key: 'sec_otp_expiry', label: 'OTP expiry (minutes)', type: 'number', value: '5' },
    { key: 'sec_max_attempts', label: 'Max failed login attempts', type: 'number', value: '5' },
    { key: 'sec_lockout_duration', label: 'Account lockout duration (minutes)', type: 'number', value: '15' },
    { key: 'sec_password_min_length', label: 'Minimum password length', type: 'number', value: '8' },
    { key: 'sec_password_complexity', label: 'Require password complexity', description: 'Enforce uppercase, number and special character', type: 'toggle', value: true },
  ],
  mode: [
    { key: 'mode_facility', label: 'Facility Mode active', description: 'Organisation maintains its own assets and facilities', type: 'toggle', value: true },
    { key: 'mode_contractor', label: 'Contractor Mode active', description: 'Organisation serves external customers under contracts', type: 'toggle', value: true },
    { key: 'mode_customer_isolation', label: 'Enforce customer data isolation', description: 'Strict separation between customer datasets in Contractor Mode', type: 'toggle', value: true },
    { key: 'mode_billing', label: 'Enable customer billing', description: 'Generate invoices for customer work orders', type: 'toggle', value: true },
  ],
  audit: [
    { key: 'audit_log_reads', label: 'Log all data read operations', description: 'High volume — recommended for compliance environments', type: 'toggle', value: false },
    { key: 'audit_log_writes', label: 'Log all state-changing operations', description: 'Recommended: create, update, delete and approval actions', type: 'toggle', value: true },
    { key: 'audit_log_auth', label: 'Log authentication events', description: 'Login, logout, OTP and failed attempts', type: 'toggle', value: true },
    { key: 'audit_retention_days', label: 'Audit log retention (days)', type: 'number', value: '365' },
  ],
};

export const SettingsView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('company');
  const [savedToast, setSavedToast] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    Object.values(SETTINGS).flat().forEach((s) => { init[s.key] = s.value; });
    return init;
  });

  const toggle = (key: string) => { setLocalSettings((p) => ({ ...p, [key]: !p[key] })); };
  const update = (key: string, val: string) => { setLocalSettings((p) => ({ ...p, [key]: val })); };

  const save = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const rows = SETTINGS[activeCategory] ?? [];
  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">System Settings</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Company, regional, module and security configuration for the ZemiFix deployment.</p>
        </div>
        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />Saved (demo)
            </span>
          )}
          <button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200] transition-colors">
            <Save className="h-3.5 w-3.5" />Save Changes
          </button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <strong>Demonstration mode:</strong>&nbsp;Changes are held in local state only. Persistent storage requires database integration. Sensitive credentials are never displayed.
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5">

        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <nav className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left text-xs font-medium last:border-0 transition-colors ${isActive ? 'bg-orange-50 text-[#FF5B00] font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#FF5B00]' : 'text-slate-400'}`} />
                  <span className="truncate">{cat.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5B00]" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Settings panel */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Panel header */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              {activeCat && <activeCat.icon className="h-4 w-4 text-[#FF5B00]" />}
              <h2 className="text-sm font-bold text-[#0B1336]">{activeCat?.label}</h2>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{rows.length} settings</span>
            </div>
          </div>

          {/* Settings rows */}
          <div className="divide-y divide-slate-100 px-5">
            {rows.map((row) => {
              const val = localSettings[row.key] ?? row.value;

              if (row.type === 'toggle') {
                return (
                  <div key={row.key} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{row.label}</p>
                      {row.description && <p className="mt-0.5 text-[11px] text-slate-500">{row.description}</p>}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!val}
                      aria-label={row.label}
                      onClick={() => toggle(row.key)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00] ${val ? 'bg-[#FF5B00]' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                );
              }

              if (row.type === 'readonly') {
                return (
                  <div key={row.key} className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-800">{row.label}</p>
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Sensitive — hidden</span>
                    </div>
                    {row.description && <p className="mb-2 text-[11px] text-slate-500">{row.description}</p>}
                    <input
                      className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-400"
                      value={String(val)}
                      readOnly
                      disabled
                    />
                  </div>
                );
              }

              if (row.type === 'select') {
                return (
                  <div key={row.key} className="py-4">
                    <p className="text-xs font-semibold text-slate-800">{row.label}</p>
                    {row.description && <p className="mt-0.5 mb-2 text-[11px] text-slate-500">{row.description}</p>}
                    <select
                      value={String(val)}
                      onChange={(e) => update(row.key, e.target.value)}
                      className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
                    >
                      {row.options?.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                );
              }

              return (
                <div key={row.key} className="py-4">
                  <p className="text-xs font-semibold text-slate-800">{row.label}</p>
                  {row.description && <p className="mt-0.5 mb-2 text-[11px] text-slate-500">{row.description}</p>}
                  <input
                    type={row.type === 'number' ? 'number' : row.type === 'email' ? 'email' : 'text'}
                    value={String(val)}
                    onChange={(e) => update(row.key, e.target.value)}
                    className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
