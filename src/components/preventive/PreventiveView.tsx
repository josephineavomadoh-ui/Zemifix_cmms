'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarCheck2, Plus, Search, SlidersHorizontal,
  AlertTriangle, CheckCircle2, Clock, Activity,
} from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { demoPMPlans } from '@/src/lib/demo/preventive';
import { branches } from '@/src/lib/demo/common';
import type { PMPlan, PMPlanStatus, PMTriggerType } from '@/src/lib/types';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Due Soon' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
];

const TRIGGER_STYLE: Record<string, string> = {
  Time: 'bg-blue-50 text-blue-600 border-blue-100',
  Meter: 'bg-purple-50 text-purple-600 border-purple-100',
  Condition: 'bg-teal-50 text-teal-600 border-teal-100',
  Seasonal: 'bg-amber-50 text-amber-600 border-amber-100',
};

const DRAWER_TABS = ['overview', 'checklist', 'resources', 'history'] as const;
type DrawerTab = typeof DRAWER_TABS[number];

function KpiChip({ value, label, accent = 'neutral' }: { value: string | number; label: string; accent?: 'neutral' | 'orange' | 'rose' | 'emerald' | 'amber' }) {
  const bg = { neutral: 'bg-slate-100 text-[#0B1336]', orange: 'bg-orange-50 text-[#D94D00]', rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' };
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm`}>
      <span className="text-sm font-bold tabular-nums text-[#0B1336] leading-none">{value}</span>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </div>
  );
}

export const PreventiveView: React.FC = () => {
  const [plans, setPlans] = useState<PMPlan[]>(demoPMPlans);
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [tab, setTab] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const selected = plans.find((p) => p.id === selectedId) ?? null;
  const weekMs = 7 * 24 * 3600 * 1000;

  const kpis = useMemo(() => {
    const now = Date.now();
    const overdue = plans.filter((p) => p.isOverdue).length;
    const dueSoon = plans.filter((p) => !p.isOverdue && new Date(p.nextDue).getTime() - now <= weekMs).length;
    const active = plans.filter((p) => p.status === 'Active').length;
    const avgCompliance = Math.round(plans.reduce((s, p) => s + p.compliancePercent, 0) / plans.length);
    return { total: plans.length, overdue, dueSoon, active, avgCompliance };
  }, [plans]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return plans.filter((p) => {
      const q = search.toLowerCase();
      const dueMs = new Date(p.nextDue).getTime();
      return (
        (!q || p.name.toLowerCase().includes(q) || p.assetName.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) &&
        (triggerFilter === 'all' || p.triggerType === triggerFilter) &&
        (branchFilter === 'all' || p.branchName === branchFilter) &&
        (tab === 'all' || (tab === 'overdue' && p.isOverdue) || (tab === 'due' && !p.isOverdue && dueMs - now <= weekMs) || (tab === 'active' && p.status === 'Active') || (tab === 'paused' && p.status === 'Paused'))
      );
    });
  }, [plans, search, triggerFilter, branchFilter, tab]);

  const tabCounts = {
    all: plans.length, overdue: kpis.overdue, due: kpis.dueSoon,
    active: kpis.active, paused: plans.filter((p) => p.status === 'Paused').length,
  };

  const handleCreate = (form: PMForm) => {
    setPlans((prev) => [{
      id: `pm-${Date.now()}`, code: `PM-${String(prev.length + 50).padStart(4, '0')}`,
      name: form.name, assetName: form.assetName, assetTag: form.assetTag,
      branchName: form.branch, triggerType: form.triggerType as PMTriggerType,
      frequency: form.frequency, status: 'Active', assignedTeam: form.team,
      estimatedHours: Number(form.estimatedHours) || 2, nextDue: form.nextDue,
      isOverdue: false, compliancePercent: 100,
      checklist: form.checklistItems.filter(Boolean).map((d, i) => ({ id: `c${i + 1}`, description: d, passCriteria: 'Pass / Fail', mandatory: true })),
      requiredParts: [], requiredLabor: [], history: [],
    }, ...prev]);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Preventive Maintenance</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">PM Plans</h1>
          <p className="mt-1 text-sm text-slate-500">Scheduled maintenance plans — time-based, meter-based, compliance tracking and checklists.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]">
          <Plus className="h-4 w-4" />New PM Plan
        </button>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;Illustrative plans — changes are not permanently saved.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <KpiChip value={kpis.total} label="Total plans" />
        {kpis.overdue > 0 && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" /><span className="text-sm font-bold text-rose-700 tabular-nums">{kpis.overdue}</span><span className="text-[11px] font-medium text-rose-600">Overdue</span></div>}
        {kpis.dueSoon > 0 && <KpiChip value={kpis.dueSoon} label="Due this week" />}
        <KpiChip value={kpis.active} label="Active plans" />
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-[11px] font-semibold text-slate-500">
          <div className={`h-2 w-2 rounded-full ${kpis.avgCompliance >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          PM compliance&nbsp;<span className={`font-bold ${kpis.avgCompliance >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{kpis.avgCompliance}%</span>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plan, asset, code…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {[
                  { val: triggerFilter, set: setTriggerFilter, opts: [['all', 'All triggers'], ['Time', 'Time'], ['Meter', 'Meter'], ['Condition', 'Condition'], ['Seasonal', 'Seasonal']] },
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
              <span className="text-[11px] text-slate-400">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
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
                  {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${t.id === 'overdue' && count > 0 ? 'bg-rose-100 text-rose-600' : isActive ? 'bg-orange-100 text-[#E65200]' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"><CalendarCheck2 className="h-6 w-6 text-slate-400" strokeWidth={1.5} /></div>
            <p className="mt-3 text-sm font-semibold text-slate-600">No plans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Plan', 'Asset', 'Trigger', 'Frequency', 'Next Due', 'Compliance', 'Team', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} onClick={() => { setSelectedId(p.id); setDrawerTab('overview'); }} className={`group cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${p.isOverdue ? 'border-l-2 border-l-rose-400' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] font-bold text-[#0B1336]">{p.code}</p>
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-600 group-hover:text-slate-900">{p.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[140px] truncate text-xs font-medium text-slate-700">{p.assetName}</p>
                      <p className="font-mono text-[10px] text-slate-400">{p.assetTag}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${TRIGGER_STYLE[p.triggerType] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>{p.triggerType}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.frequency}</td>
                    <td className="px-4 py-3">
                      {p.isOverdue
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />Overdue</span>
                        : <span className="text-xs text-slate-600">{p.nextDue}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${p.compliancePercent >= 90 ? 'bg-emerald-400' : p.compliancePercent >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${p.compliancePercent}%` }} />
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-600">{p.compliancePercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[120px]"><p className="truncate text-xs text-slate-500">{p.assignedTeam}</p></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
          <span className="text-[11px] text-slate-400">{filtered.length} of {plans.length} plans · demonstration dataset</span>
          <span className="text-[11px] text-slate-400">Click a row to view PM plan detail</span>
        </div>
      </div>

      {/* Drawer */}
      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.code ?? ''} subtitle={selected?.name} width="xl">
        {selected && <PMDetail plan={selected} tab={drawerTab} onTabChange={setDrawerTab} />}
      </Drawer>

      {/* Create */}
      <CreatePMModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
};

/* ── Drawer ── */
function PMDetail({ plan, tab, onTabChange }: { plan: PMPlan; tab: DrawerTab; onTabChange: (t: DrawerTab) => void }) {
  return (
    <div className="space-y-4">
      {plan.isOverdue && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4" />This PM plan is overdue — generate a work order immediately.
        </div>
      )}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1">
          {DRAWER_TABS.map((t) => (
            <button key={t} onClick={() => onTabChange(t)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${tab === t ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          {[
            ['Code', plan.code], ['Trigger', plan.triggerType], ['Frequency', plan.frequency],
            ['Status', plan.status], ['Asset', plan.assetName], ['Asset tag', plan.assetTag],
            ['Branch', plan.branchName], ['Team', plan.assignedTeam],
            ['Est. hours', `${plan.estimatedHours}h`], ['Last completed', plan.lastCompleted ?? '—'],
            ['Next due', plan.isOverdue ? '⚠ Overdue — ' + plan.nextDue : plan.nextDue],
            ['Compliance', `${plan.compliancePercent}%`],
          ].map(([l, v]) => (
            <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-0.5 text-xs text-slate-700">{v}</p></div>
          ))}
        </div>
      )}

      {tab === 'checklist' && (
        <div className="space-y-2">
          {plan.checklist.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <p className="font-semibold text-slate-800">{item.description}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Pass criteria: {item.passCriteria}</p>
              {item.mandatory && <span className="mt-1 inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">Required</span>}
            </div>
          ))}
          {plan.checklist.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No checklist items.</p>}
        </div>
      )}

      {tab === 'resources' && (
        <div className="space-y-4">
          {[
            { title: 'Required Parts', cols: ['SKU', 'Description', 'Qty'], rows: plan.requiredParts.map((p) => [p.code, p.name, p.quantity.toString()]) },
            { title: 'Required Labour', cols: ['Role', 'Hours'], rows: plan.requiredLabor.map((l) => [l.role, `${l.hours}h`]) },
          ].map((s) => (
            <div key={s.title}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.title}</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{s.cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.rows.length === 0 ? <tr><td colSpan={s.cols.length} className="px-3 py-3 text-center text-slate-400">None specified.</td></tr> : s.rows.map((row, i) => <tr key={i} className="hover:bg-slate-50">{row.map((cell, j) => <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Work Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Completed by</th><th className="px-3 py-2 text-right">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {plan.history.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No history.</td></tr> :
                plan.history.map((h) => <tr key={h.id} className="hover:bg-slate-50"><td className="px-3 py-2.5 font-mono font-bold text-[#FF5B00]">{h.number}</td><td className="px-3 py-2.5 text-slate-600">{h.date}</td><td className="px-3 py-2.5 text-slate-600">{h.completedBy}</td><td className="px-3 py-2.5 text-right"><StatusBadge status={h.status} size="sm" /></td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Create modal ── */
interface PMForm { name: string; assetName: string; assetTag: string; branch: string; triggerType: string; frequency: string; estimatedHours: string; nextDue: string; team: string; checklistItems: string[]; }

function CreatePMModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (f: PMForm) => void }) {
  const blank: PMForm = { name: '', assetName: '', assetTag: '', branch: branches[0].name, triggerType: 'Time', frequency: 'Every Month', estimatedHours: '2', nextDue: '', team: '', checklistItems: [''] };
  const [form, setForm] = useState<PMForm>(blank);
  const u = (p: Partial<PMForm>) => setForm((f) => ({ ...f, ...p }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.name || !form.assetName) return; onCreate(form); setForm(blank); };

  return (
    <Modal open={open} onClose={onClose} title="Create PM Plan" subtitle="Plan will be set to Active immediately." size="lg"
      footer={<><ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton><ModalButton type="submit" form="pm-form">Create Plan</ModalButton></>}
    >
      <form id="pm-form" onSubmit={submit} className="space-y-4">
        <Field label="Plan name" required><input className={inputClass} value={form.name} onChange={(e) => u({ name: e.target.value })} placeholder="e.g. Quarterly Chiller Inspection" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset name" required><input className={inputClass} value={form.assetName} onChange={(e) => u({ assetName: e.target.value })} /></Field>
          <Field label="Asset tag"><input className={inputClass} value={form.assetTag} onChange={(e) => u({ assetTag: e.target.value })} placeholder="AST-…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trigger type"><select className={inputClass} value={form.triggerType} onChange={(e) => u({ triggerType: e.target.value })}><option>Time</option><option>Meter</option><option>Condition</option><option>Seasonal</option></select></Field>
          <Field label="Frequency" required><input className={inputClass} value={form.frequency} onChange={(e) => u({ frequency: e.target.value })} placeholder="e.g. Every 3 Months" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch"><select className={inputClass} value={form.branch} onChange={(e) => u({ branch: e.target.value })}>{branches.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Assigned team"><input className={inputClass} value={form.team} onChange={(e) => u({ team: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Next due date" required><input type="date" className={inputClass} value={form.nextDue} onChange={(e) => u({ nextDue: e.target.value })} /></Field>
          <Field label="Est. hours"><input type="number" min="0" step="0.5" className={inputClass} value={form.estimatedHours} onChange={(e) => u({ estimatedHours: e.target.value })} /></Field>
        </div>
        <Field label="Checklist tasks">
          <div className="space-y-1.5">
            {form.checklistItems.map((item, i) => (
              <div key={i} className="flex gap-1.5">
                <input className={inputClass} value={item} onChange={(e) => u({ checklistItems: form.checklistItems.map((c, idx) => idx === i ? e.target.value : c) })} placeholder={`Task ${i + 1}`} />
                {form.checklistItems.length > 1 && <button type="button" className="rounded-lg border border-slate-200 px-2 text-slate-400 hover:bg-slate-50" onClick={() => u({ checklistItems: form.checklistItems.filter((_, idx) => idx !== i) })}>×</button>}
              </div>
            ))}
            <button type="button" className="text-xs font-semibold text-[#FF5B00] hover:underline" onClick={() => u({ checklistItems: [...form.checklistItems, ''] })}>+ Add task</button>
          </div>
        </Field>
      </form>
    </Modal>
  );
}
