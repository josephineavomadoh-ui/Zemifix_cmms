'use client';

import React, { useMemo, useState } from 'react';
import {
  MessageSquareWarning, Plus, Search, SlidersHorizontal,
  CheckCircle2, XCircle, Clock, ArrowRightLeft, Send,
  Paperclip, MapPin, Phone, User, ShieldCheck,
} from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { PriorityBadge } from '@/src/components/ui/PriorityBadge';
import { demoRequests, requestCategories } from '@/src/lib/demo/requests';
import { branches } from '@/src/lib/demo/common';
import type { MaintenanceRequest, RequestStatus } from '@/src/lib/types';

const STATUS_LABEL: Record<RequestStatus, string> = {
  Submitted: 'Submitted', UnderReview: 'Under Review', Approved: 'Approved',
  Rejected: 'Rejected', Converted: 'Converted', Cancelled: 'Cancelled',
};

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'converted', label: 'Converted' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_DOT: Record<RequestStatus, string> = {
  Submitted: 'bg-blue-400', UnderReview: 'bg-amber-400', Approved: 'bg-emerald-400',
  Rejected: 'bg-rose-400', Converted: 'bg-[#FF5B00]', Cancelled: 'bg-slate-300',
};

const CAT_COLOR: Record<string, string> = {
  HVAC: 'bg-blue-50 text-blue-600 border-blue-100',
  Electrical: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  Plumbing: 'bg-teal-50 text-teal-600 border-teal-100',
  Safety: 'bg-rose-50 text-rose-600 border-rose-100',
  Breakdown: 'bg-orange-50 text-orange-600 border-orange-100',
  Janitorial: 'bg-slate-100 text-slate-600 border-slate-200',
  Facility: 'bg-purple-50 text-purple-600 border-purple-100',
};

function KpiChip({ value, label, dot }: { value: number; label: string; dot?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
      {dot && <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />}
      <span className="text-sm font-bold tabular-nums text-[#0B1336] leading-none">{value}</span>
      <span className="text-[11px] font-medium text-slate-500 leading-tight">{label}</span>
    </div>
  );
}

export const RequestsView: React.FC = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(demoRequests);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [category, setCategory] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const kpis = useMemo(() => ({
    submitted: requests.filter((r) => r.status === 'Submitted').length,
    review: requests.filter((r) => r.status === 'UnderReview').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    converted: requests.filter((r) => r.status === 'Converted').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  }), [requests]);

  const filtered = useMemo(() => requests.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.title.toLowerCase().includes(q) || r.number.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q)) &&
      (category === 'all' || r.category === category) &&
      (branchFilter === 'all' || r.branchName === branchFilter) &&
      (tab === 'all' || (tab === 'submitted' && r.status === 'Submitted') || (tab === 'review' && r.status === 'UnderReview') || (tab === 'approved' && r.status === 'Approved') || (tab === 'converted' && r.status === 'Converted') || (tab === 'rejected' && r.status === 'Rejected'))
    );
  }), [requests, search, category, branchFilter, tab]);

  const tabCounts = { all: requests.length, submitted: kpis.submitted, review: kpis.review, approved: kpis.approved, converted: kpis.converted, rejected: kpis.rejected };

  const setStatus = (id: string, status: RequestStatus, action: string, note: string, extra?: Partial<MaintenanceRequest>) => {
    setRequests((prev) => prev.map((r) => r.id === id ? {
      ...r, status, reviewedBy: r.reviewedBy ?? 'Kofi Owusu',
      reviewedAt: new Date().toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }),
      history: [...r.history, { id: `h-${Date.now()}`, at: new Date().toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }), by: 'Kofi Owusu', action, note }],
      ...extra,
    } : r));
  };

  const handleCreate = (form: ReqFormState) => {
    const num = `REQ-${String(513 + requests.length).padStart(5, '0')}`;
    setRequests((prev) => [{
      id: `rq-${Date.now()}`, number: num, title: form.title, description: form.description,
      requesterName: form.requesterName, requesterContact: form.requesterContact, requesterDepartment: form.department,
      branchName: form.branch, location: form.location, assetName: form.assetName || undefined, assetTag: form.assetTag || undefined,
      category: form.category, priority: form.priority as MaintenanceRequest['priority'], status: 'Submitted',
      submittedAt: new Date().toISOString(), attachments: [],
      history: [{ id: 'h1', at: new Date().toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }), by: form.requesterName, action: 'Submitted', note: 'Via intake form' }],
    }, ...prev]);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Maintenance Requests</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Intake, triage and triage-to-work-order conversion pipeline.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200] transition-colors">
          <Plus className="h-4 w-4" />New Request
        </button>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <strong>Demo data:</strong>&nbsp;Illustrative records — changes are not permanently saved.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2">
        <KpiChip value={kpis.submitted} label="Submitted" dot="bg-blue-400" />
        <KpiChip value={kpis.review} label="Under review" dot="bg-amber-400" />
        <KpiChip value={kpis.approved} label="Approved" dot="bg-emerald-400" />
        <KpiChip value={kpis.converted} label="Converted to WO" dot="bg-[#FF5B00]" />
        {kpis.rejected > 0 && <KpiChip value={kpis.rejected} label="Rejected" dot="bg-rose-400" />}
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number, title, requester…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {[
                  { val: category, set: setCategory, opts: [['all', 'All categories'], ...requestCategories.map((c) => [c, c] as [string, string])] },
                  { val: branchFilter, set: setBranchFilter, opts: [['all', 'All branches'], ...branches.map((b) => [b.name, b.name] as [string, string])] },
                ].map((f, i) => (
                  <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none">
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 sm:ml-auto">
              <button onClick={() => setShowFilters((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${showFilters ? 'border-[#FF5B00] bg-orange-50 text-[#FF5B00]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />Filters
              </button>
              <span className="text-[11px] text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-4">
          <nav className="-mb-px flex gap-1">
            {TABS.map((t) => {
              const count = tabCounts[t.id as keyof typeof tabCounts];
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${isActive ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {t.label}
                  {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-orange-100 text-[#E65200]' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"><MessageSquareWarning className="h-6 w-6 text-slate-400" strokeWidth={1.5} /></div>
            <p className="mt-3 text-sm font-semibold text-slate-600">No requests found</p>
            <p className="mt-1 text-xs text-slate-400">Adjust your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Request', 'Category', 'Requester', 'Location', 'Priority', 'Status', 'Linked WO'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} onClick={() => setSelectedId(r.id)} className={`group cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[r.status]}`} />
                        <div>
                          <p className="font-mono text-[11px] font-bold text-[#0B1336]">{r.number}</p>
                          <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-600 group-hover:text-slate-900">{r.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${CAT_COLOR[r.category] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{r.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{r.requesterName}</p>
                      <p className="text-[10px] text-slate-400">{r.requesterDepartment}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <p className="truncate text-xs text-slate-500">{r.location}</p>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={STATUS_LABEL[r.status]} /></td>
                    <td className="px-4 py-3">
                      {r.convertedWorkOrderNumber
                        ? <span className="font-mono text-[11px] font-semibold text-[#FF5B00]">{r.convertedWorkOrderNumber}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
          <span className="text-[11px] text-slate-400">{filtered.length} of {requests.length} requests · demonstration dataset</span>
          <span className="text-[11px] text-slate-400">Click a row to review</span>
        </div>
      </div>

      {/* Drawer */}
      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.number ?? ''} subtitle={selected?.title} width="lg"
        footer={selected ? <RequestActions request={selected} onSetStatus={setStatus} /> : undefined}
      >
        {selected && <RequestDetail request={selected} />}
      </Drawer>

      {/* Create */}
      <CreateRequestModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
};

/* ── Drawer detail ── */
function RequestDetail({ request }: { request: MaintenanceRequest }) {
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${request.status === 'Approved' || request.status === 'Converted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : request.status === 'Rejected' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {STATUS_LABEL[request.status]}
        {request.reviewedBy && <span className="font-normal opacity-75">· reviewed by {request.reviewedBy}</span>}
        {request.convertedWorkOrderNumber && (
          <span className="ml-auto font-mono text-[11px] text-[#FF5B00]">→ {request.convertedWorkOrderNumber}</span>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Problem description</p>
        <p className="text-xs leading-relaxed text-slate-600">{request.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        {[
          { icon: User, l: 'Requester', v: request.requesterName },
          { icon: Phone, l: 'Contact', v: request.requesterContact },
          { icon: User, l: 'Department', v: request.requesterDepartment },
          { icon: MapPin, l: 'Location', v: request.location },
          { icon: MapPin, l: 'Asset', v: request.assetName ? `${request.assetName} (${request.assetTag})` : '—' },
          { icon: User, l: 'Branch', v: request.branchName },
        ].map((m) => (
          <div key={m.l}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.l}</p>
            <p className="mt-0.5 text-xs text-slate-700">{m.v}</p>
          </div>
        ))}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Priority</p>
          <div className="mt-0.5"><PriorityBadge priority={request.priority} /></div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Category</p>
          <span className={`mt-0.5 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${CAT_COLOR[request.category] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{request.category}</span>
        </div>
      </div>

      {request.reviewNote && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="text-[10px] font-bold uppercase text-slate-400">Review note</p>
          <p className="mt-1 text-slate-600">{request.reviewNote}</p>
        </div>
      )}

      {request.attachments.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Attachments</p>
          {request.attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 text-slate-400" /><span className="font-medium text-slate-700">{a.name}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">History</p>
        <div className="space-y-0">
          {request.history.map((h, i) => (
            <div key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1"><span className="h-2 w-2 rounded-full bg-[#FF5B00] shrink-0" />{i < request.history.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}</div>
              <div className="min-w-0 pb-4 pt-0.5">
                <p className="text-xs font-semibold text-slate-800">{h.action}</p>
                <p className="text-[11px] text-slate-500">{h.at} · {h.by}</p>
                {h.note && <p className="mt-0.5 text-[11px] text-slate-600">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RequestActions({ request, onSetStatus }: { request: MaintenanceRequest; onSetStatus: (id: string, status: RequestStatus, action: string, note: string, extra?: Partial<MaintenanceRequest>) => void }) {
  const woNum = `WO-${String(285 + Math.floor(Math.random() * 50)).padStart(5, '0')}`;
  const actions: { label: string; status: RequestStatus; action: string; note: string; primary?: boolean; extra?: Partial<MaintenanceRequest> }[] = [];
  if (request.status === 'Submitted') actions.push({ label: 'Start triage', status: 'UnderReview', action: 'Triage started', note: 'Routed for review', primary: true });
  if (['Submitted', 'UnderReview'].includes(request.status)) {
    actions.push({ label: 'Approve', status: 'Approved', action: 'Approved', note: 'Approved for WO creation', primary: request.status === 'UnderReview' });
    actions.push({ label: 'Reject', status: 'Rejected', action: 'Rejected', note: 'Request rejected' });
  }
  if (request.status === 'Approved') actions.push({ label: 'Convert to work order', status: 'Converted', action: 'Converted', note: `Converted to ${woNum}`, primary: true, extra: { convertedWorkOrderNumber: woNum } });
  if (actions.length === 0) return <span className="text-xs text-slate-400">No further actions.</span>;
  return <>{actions.map((a) => <ModalButton key={a.label} variant={a.primary ? 'primary' : 'secondary'} onClick={() => onSetStatus(request.id, a.status, a.action, a.note, a.extra)}>{a.label}</ModalButton>)}</>;
}

interface ReqFormState { title: string; description: string; requesterName: string; requesterContact: string; department: string; branch: string; location: string; assetName: string; assetTag: string; category: string; priority: string; }

function CreateRequestModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (f: ReqFormState) => void }) {
  const blank: ReqFormState = { title: '', description: '', requesterName: '', requesterContact: '', department: 'Operations', branch: branches[0].name, location: '', assetName: '', assetTag: '', category: 'Breakdown', priority: 'Medium' };
  const [form, setForm] = useState<ReqFormState>(blank);
  const u = (p: Partial<ReqFormState>) => setForm((f) => ({ ...f, ...p }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.title || !form.requesterName || !form.location) return; onCreate(form); setForm(blank); };

  return (
    <Modal open={open} onClose={onClose} title="Submit Maintenance Request" subtitle="Submitted requests go into the triage queue." size="lg"
      footer={<><ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton><ModalButton type="submit" form="rq-form">Submit Request</ModalButton></>}
    >
      <form id="rq-form" onSubmit={submit} className="space-y-4">
        <Field label="Summary" required><input className={inputClass} value={form.title} onChange={(e) => u({ title: e.target.value })} placeholder="e.g. Water drip from ceiling panel" /></Field>
        <Field label="Description" required><textarea rows={3} className={inputClass} value={form.description} onChange={(e) => u({ description: e.target.value })} placeholder="Describe the issue…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your name" required><input className={inputClass} value={form.requesterName} onChange={(e) => u({ requesterName: e.target.value })} /></Field>
          <Field label="Contact"><input className={inputClass} value={form.requesterContact} onChange={(e) => u({ requesterContact: e.target.value })} placeholder="+233…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => u({ department: e.target.value })} /></Field>
          <Field label="Branch"><select className={inputClass} value={form.branch} onChange={(e) => u({ branch: e.target.value })}>{branches.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field>
        </div>
        <Field label="Location" required><input className={inputClass} value={form.location} onChange={(e) => u({ location: e.target.value })} placeholder="Building / Floor / Room" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => u({ category: e.target.value })}>{requestCategories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => u({ priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></Field>
        </div>
      </form>
    </Modal>
  );
}


