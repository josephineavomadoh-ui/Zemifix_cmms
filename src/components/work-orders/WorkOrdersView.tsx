'use client';

import React, { useMemo, useState } from 'react';
import {
  ClipboardList, Plus, Download, AlertTriangle, CheckCircle2,
  Timer, ShieldCheck, Paperclip, Hammer, SlidersHorizontal,
  Search, ChevronDown, MoreHorizontal, TrendingUp, Clock,
  ArrowUpRight, Circle, Zap,
} from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { PriorityBadge } from '@/src/components/ui/PriorityBadge';
import { Tabs } from '@/src/components/ui/Tabs';
import { demoWorkOrders } from '@/src/lib/demo/workOrders';
import { formatGhs, branches, technicians, failureCodes } from '@/src/lib/demo/common';
import type { WorkOrderDetail, WorkOrderStatus, WorkOrderType } from '@/src/lib/types';

/* ─────────────────── constants ─────────────────── */

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  Draft: 'Draft', PendingApproval: 'Pending Approval', Open: 'Open',
  Assigned: 'Assigned', InProgress: 'In Progress', OnHold: 'On Hold',
  Completed: 'Completed', Verified: 'Verified', Closed: 'Closed', Cancelled: 'Cancelled',
};

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open / Assigned' },
  { id: 'progress', label: 'In Progress' },
  { id: 'hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'overdue', label: 'SLA Breached' },
];

/* ─────────────────── tiny helpers ─────────────────── */

function KpiChip({
  value, label, accent = 'slate',
}: {
  value: string | number; label: string; accent?: 'slate' | 'orange' | 'rose' | 'emerald' | 'amber';
}) {
  const bg: Record<string, string> = {
    slate: 'bg-slate-100 text-[#0B1336]',
    orange: 'bg-orange-50 text-[#D94D00]',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bg[accent]}`}>
      <span className="text-sm font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[11px] font-medium leading-tight opacity-75">{label}</span>
    </div>
  );
}

function TypePill({ type }: { type: string }) {
  const map: Record<string, string> = {
    Corrective: 'bg-rose-50 text-rose-600 border-rose-100',
    Preventive: 'bg-blue-50 text-blue-600 border-blue-100',
    Inspection: 'bg-purple-50 text-purple-600 border-purple-100',
    Project: 'bg-teal-50 text-teal-600 border-teal-100',
    Calibration: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${map[type] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {type}
    </span>
  );
}

function SlaBar({ elapsed, target, breached }: { elapsed: number; target: number; breached: boolean }) {
  const pct = Math.min(Math.round((elapsed / target) * 100), 100);
  const color = breached ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] tabular-nums font-medium ${breached ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
        {breached ? 'Breached' : `${elapsed}h`}
      </span>
    </div>
  );
}

/* ─────────────────── main view ─────────────────── */

export const WorkOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrderDetail[]>(demoWorkOrders);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [priority, setPriority] = useState('all');
  const [type, setType] = useState('all');
  const [branch, setBranch] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'tasks' | 'costing' | 'history'>('overview');
  const [showFilters, setShowFilters] = useState(false);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const kpis = useMemo(() => {
    const open = orders.filter((o) => ['Open', 'Assigned', 'Draft', 'PendingApproval'].includes(o.status)).length;
    const inProgress = orders.filter((o) => o.status === 'InProgress').length;
    const onHold = orders.filter((o) => o.status === 'OnHold').length;
    const overdue = orders.filter((o) => o.slaBreached).length;
    const completed = orders.filter((o) => ['Completed', 'Verified', 'Closed'].includes(o.status)).length;
    const sla = Math.round(((orders.length - overdue) / orders.length) * 100);
    return { open, inProgress, onHold, overdue, completed, sla };
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || o.title.toLowerCase().includes(q) || o.number.toLowerCase().includes(q) || o.assetName.toLowerCase().includes(q) || o.assignedToName.toLowerCase().includes(q);
      const matchesPriority = priority === 'all' || o.priority === priority;
      const matchesType = type === 'all' || o.type === type;
      const matchesBranch = branch === 'all' || o.branchName === branch;
      const matchesTab =
        tab === 'all' ||
        (tab === 'open' && ['Open', 'Assigned', 'Draft', 'PendingApproval'].includes(o.status)) ||
        (tab === 'progress' && o.status === 'InProgress') ||
        (tab === 'hold' && o.status === 'OnHold') ||
        (tab === 'completed' && ['Completed', 'Verified', 'Closed'].includes(o.status)) ||
        (tab === 'overdue' && o.slaBreached);
      return matchesSearch && matchesPriority && matchesType && matchesBranch && matchesTab;
    });
  }, [orders, search, priority, type, branch, tab]);

  const tabCounts = {
    all: orders.length,
    open: orders.filter((o) => ['Open', 'Assigned', 'Draft', 'PendingApproval'].includes(o.status)).length,
    progress: orders.filter((o) => o.status === 'InProgress').length,
    hold: orders.filter((o) => o.status === 'OnHold').length,
    completed: orders.filter((o) => ['Completed', 'Verified', 'Closed'].includes(o.status)).length,
    overdue: orders.filter((o) => o.slaBreached).length,
  };

  const advanceStatus = (id: string, to: WorkOrderStatus, actionLabel: string, note: string) => {
    setOrders((prev) => prev.map((o) => o.id === id ? {
      ...o, status: to,
      history: [...o.history, { id: `h-${Date.now()}`, at: new Date().toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }), by: 'Nana Yaw Addo', action: actionLabel, note }],
    } : o));
  };

  const toggleTask = (taskId: string) => {
    if (!selectedId) return;
    setOrders((prev) => prev.map((o) => o.id === selectedId ? { ...o, tasks: o.tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t) } : o));
  };

  const handleCreate = (form: CreateFormState) => {
    const nextNum = `WO-${String(285 + orders.length).padStart(5, '0')}`;
    const newOrder: WorkOrderDetail = {
      id: `wo-${Date.now()}`, number: nextNum, title: form.title, type: form.type, description: form.description,
      createdBy: 'Nana Yaw Addo', createdAt: new Date().toISOString(), dueDate: form.dueDate,
      assetName: form.assetName, assetTag: form.assetTag || '—', location: form.location, branchName: form.branch,
      priority: form.priority, status: 'Draft', assignedToName: form.assignee || 'Unassigned',
      estimatedHours: Number(form.estimatedHours) || 0, estimatedCost: 0, actualCost: 0, slaBreached: false,
      approvalState: 'Pending', failureCode: form.failureCode || undefined,
      slaTargetHours: form.priority === 'Urgent' ? 24 : 72, slaElapsedHours: 0,
      tasks: form.checklist.filter(Boolean).map((d, i) => ({ id: `t${i + 1}`, description: d, completed: false, mandatory: true })),
      labor: [], parts: [], attachments: [],
      history: [{ id: 'h1', at: new Date().toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' }), by: 'Nana Yaw Addo', action: 'Created', note: 'Created as draft' }],
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCreateOpen(false);
  };

  const exportCsv = () => {
    const headers = ['Number', 'Title', 'Type', 'Status', 'Priority', 'Asset', 'Branch', 'Assignee', 'Due', 'Est Cost', 'Actual Cost'];
    const rows = filtered.map((o) => [o.number, `"${o.title.replace(/"/g, '""')}"`, o.type, o.status, o.priority, `"${o.assetName}"`, o.branchName, o.assignedToName, o.dueDate, o.estimatedCost, o.actualCost]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `work-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-0 pb-8">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Work Order Management</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Work Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Corrective, preventive and inspection orders — full lifecycle with SLA and cost tracking.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200] transition-colors">
            <Plus className="h-4 w-4" />
            New Work Order
          </button>
        </div>
      </div>

      {/* ── Demo banner ── */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <strong>Demo data:</strong>&nbsp;Figures are illustrative and not connected to live APIs. Changes are not permanently saved.
      </div>

      {/* ── KPI strip ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        <KpiChip value={kpis.open} label="Open" accent="slate" />
        <KpiChip value={kpis.inProgress} label="In progress" accent="orange" />
        <KpiChip value={kpis.onHold} label="On hold" accent="amber" />
        <KpiChip value={kpis.completed} label="Completed" accent="emerald" />
        {kpis.overdue > 0 && <KpiChip value={kpis.overdue} label="SLA breached" accent="rose" />}
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 shadow-sm">
          <div className={`h-2 w-2 rounded-full ${kpis.sla >= 95 ? 'bg-emerald-400' : kpis.sla >= 80 ? 'bg-amber-400' : 'bg-rose-400'}`} />
          SLA compliance&nbsp;
          <span className={`font-bold ${kpis.sla >= 95 ? 'text-emerald-600' : kpis.sla >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>{kpis.sla}%</span>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, asset, assignee…"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
              />
            </div>

            {/* Inline filter selects (shown when expanded) */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: 'Priority', value: priority, onChange: setPriority, options: [['all', 'All priorities'], ['Urgent', 'Urgent'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']] },
                  { label: 'Type', value: type, onChange: setType, options: [['all', 'All types'], ['Corrective', 'Corrective'], ['Preventive', 'Preventive'], ['Inspection', 'Inspection'], ['Project', 'Project']] },
                  { label: 'Branch', value: branch, onChange: setBranch, options: [['all', 'All branches'], ...branches.map((b) => [b.name, b.name] as [string, string])] },
                ].map((f) => (
                  <select key={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none">
                    {f.options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 sm:ml-auto">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${showFilters ? 'border-[#FF5B00] bg-orange-50 text-[#FF5B00]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {(priority !== 'all' || type !== 'all' || branch !== 'all') && <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5B00] text-[9px] font-bold text-white">!</span>}
              </button>
              <span className="text-[11px] text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-4">
          <nav className="-mb-px flex gap-1">
            {STATUS_TABS.map((t) => {
              const count = tabCounts[t.id as keyof typeof tabCounts];
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${isActive ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-orange-100 text-[#E65200]' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <ClipboardList className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-600">No work orders found</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Order', 'Asset', 'Type', 'Priority', 'Status', 'Assigned', 'Due', 'SLA', 'Cost'].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${h === 'Cost' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => { setSelectedId(o.id); setDrawerTab('overview'); }}
                    className={`group cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    {/* Order number + title */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white ${o.slaBreached ? 'bg-rose-500' : o.status === 'InProgress' ? 'bg-[#FF5B00]' : o.status === 'Completed' || o.status === 'Verified' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          {o.number.slice(-2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-bold text-[#0B1336]">{o.number}</p>
                          <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-600 group-hover:text-slate-900">{o.title}</p>
                        </div>
                      </div>
                    </td>

                    {/* Asset */}
                    <td className="px-4 py-3">
                      <p className="max-w-[160px] truncate text-xs font-medium text-slate-700">{o.assetName}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{o.assetTag}</p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <TypePill type={o.type} />
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <PriorityBadge priority={o.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={STATUS_LABEL[o.status]} />
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B1336] text-[8px] font-bold text-white">
                          {o.assignedToName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <p className="max-w-[100px] truncate text-xs text-slate-600">{o.assignedToName}</p>
                      </div>
                    </td>

                    {/* Due */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">{o.dueDate}</span>
                    </td>

                    {/* SLA */}
                    <td className="px-4 py-3">
                      <SlaBar elapsed={o.slaElapsedHours} target={o.slaTargetHours} breached={o.slaBreached} />
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono text-xs font-semibold text-slate-700">{formatGhs(o.actualCost || o.estimatedCost)}</p>
                      {o.actualCost > 0 && o.estimatedCost > 0 && (
                        <p className="text-[10px] text-slate-400">est {formatGhs(o.estimatedCost)}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
          <span className="text-[11px] text-slate-400">
            {filtered.length} of {orders.length} work orders · demonstration dataset
          </span>
          <span className="text-[11px] text-slate-400">Click a row to open detail</span>
        </div>
      </div>

      {/* ── Detail drawer ── */}
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.number : ''}
        subtitle={selected?.title}
        width="xl"
        footer={selected ? <DetailActions order={selected} onAdvance={advanceStatus} /> : undefined}
      >
        {selected && (
          <WorkOrderDetailContent
            order={selected}
            tab={drawerTab}
            onTabChange={setDrawerTab}
            onToggleTask={toggleTask}
          />
        )}
      </Drawer>

      {/* ── Create modal ── */}
      <CreateWorkOrderModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
};

/* ─────────────────── drawer detail ─────────────────── */

function WorkOrderDetailContent({
  order, tab, onTabChange, onToggleTask,
}: {
  order: WorkOrderDetail;
  tab: 'overview' | 'tasks' | 'costing' | 'history';
  onTabChange: (t: 'overview' | 'tasks' | 'costing' | 'history') => void;
  onToggleTask: (id: string) => void;
}) {
  const laborCost = order.labor.reduce((s, l) => s + l.cost, 0);
  const partsCost = order.parts.reduce((s, p) => s + p.cost, 0);
  const totalCost = laborCost + partsCost;
  const slaPct = Math.min(Math.round((order.slaElapsedHours / order.slaTargetHours) * 100), 100);
  const completedTasks = order.tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      {/* Status + SLA strip */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#FF5B00]" />
          <span className="font-semibold text-slate-700">Approval:</span>
          <span className={`font-semibold ${order.approvalState === 'Approved' ? 'text-emerald-600' : order.approvalState === 'Rejected' ? 'text-rose-600' : 'text-amber-600'}`}>{order.approvalState}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-semibold text-slate-600">SLA:</span>
          <span className="text-slate-500">{order.slaElapsedHours}/{order.slaTargetHours}h</span>
          <div className="ml-auto h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${order.slaBreached ? 'bg-rose-500' : slaPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${slaPct}%` }} />
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks', count: order.tasks.length },
          { id: 'costing', label: 'Costs' },
          { id: 'history', label: 'History', count: order.history.length },
        ]}
        active={tab}
        onChange={onTabChange}
      />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Scope of work</p>
            <p className="text-xs leading-relaxed text-slate-600">{order.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            {[
              { l: 'Type', v: <TypePill type={order.type} /> },
              { l: 'Priority', v: <PriorityBadge priority={order.priority} /> },
              { l: 'Asset', v: <span className="font-medium text-slate-800">{order.assetName}</span> },
              { l: 'Tag', v: <span className="font-mono text-[11px] text-slate-600">{order.assetTag}</span> },
              { l: 'Location', v: order.location },
              { l: 'Branch', v: order.branchName },
              { l: 'Assigned to', v: order.assignedToName },
              { l: 'Due date', v: order.dueDate },
              { l: 'Est. hours', v: `${order.estimatedHours}h` },
              { l: 'Failure code', v: order.failureCode ? <span className="font-mono text-[11px]">{order.failureCode}</span> : '—' },
              { l: 'Downtime', v: order.downtimeHours ? `${order.downtimeHours}h` : '—' },
              { l: 'Created by', v: order.createdBy },
            ].map((m) => (
              <div key={m.l}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{m.l}</p>
                <p className="mt-0.5 text-xs text-slate-700">{m.v}</p>
              </div>
            ))}
          </div>

          {order.correctiveAction && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Corrective action recorded</p>
              <p className="mt-1 text-xs text-emerald-800">{order.correctiveAction}</p>
            </div>
          )}

          {order.attachments.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Attachments</p>
              <div className="space-y-1.5">
                {order.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="flex-1 font-medium text-slate-700">{a.name}</span>
                    <span className="text-[10px] text-slate-400">{a.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Checklist · {completedTasks}/{order.tasks.length} complete</span>
            <span className="text-[11px] text-slate-500">{Math.round((completedTasks / order.tasks.length) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completedTasks / order.tasks.length) * 100}%` }} />
          </div>
          <div className="space-y-1.5 pt-1">
            {order.tasks.map((t) => (
              <button key={t.id} onClick={() => onToggleTask(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition-all ${t.completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${t.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                  {t.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                </span>
                <span className={`flex-1 ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.description}</span>
                {t.mandatory && <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">Required</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'costing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Estimated', value: formatGhs(order.estimatedCost), cls: 'text-slate-700' },
              { label: 'Actual', value: formatGhs(totalCost), cls: 'text-[#E65200]' },
              { label: 'Variance', value: totalCost <= order.estimatedCost ? 'Under budget' : 'Over budget', cls: totalCost <= order.estimatedCost ? 'text-emerald-600' : 'text-rose-600' },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">{c.label}</p>
                <p className={`mt-1 text-sm font-bold font-mono ${c.cls}`}>{c.value}</p>
              </div>
            ))}
          </div>
          {/* Labor table */}
          {[
            { title: 'Labour', cols: ['Technician', 'Role', 'Hrs', 'Rate', 'Cost'], rows: order.labor.map((l) => [l.technicianName, l.role, l.hours, formatGhs(l.rate), formatGhs(l.cost)]), empty: 'No labour recorded.' },
            { title: 'Parts & Materials', cols: ['SKU', 'Description', 'Qty', 'Unit', 'Cost'], rows: order.parts.map((p) => [p.itemCode, p.description, p.quantity, formatGhs(p.unitCost), formatGhs(p.cost)]), empty: 'No parts issued.' },
          ].map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{section.title}</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase text-slate-500">
                    <tr>{section.cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {section.rows.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-3 text-center text-slate-400">{section.empty}</td></tr>
                    ) : section.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-0">
          {order.history.map((h, i) => (
            <div key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="h-2 w-2 rounded-full bg-[#FF5B00] shrink-0" />
                {i < order.history.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
              </div>
              <div className="min-w-0 pb-4 pt-0.5">
                <p className="text-xs font-semibold text-slate-800">{h.action}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{h.at} · {h.by}</p>
                {h.note && <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{h.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── drawer footer actions ─────────────────── */

function DetailActions({ order, onAdvance }: { order: WorkOrderDetail; onAdvance: (id: string, to: WorkOrderStatus, actionLabel: string, note: string) => void }) {
  const next: { label: string; to: WorkOrderStatus; action: string; note: string; primary?: boolean }[] = [];
  if (order.status === 'Draft') next.push({ label: 'Submit for approval', to: 'PendingApproval', action: 'Submitted', note: 'Submitted for approval' });
  if (order.status === 'PendingApproval') {
    next.push({ label: 'Approve', to: 'Open', action: 'Approved', note: 'Approved for execution', primary: true });
    next.push({ label: 'Reject', to: 'Cancelled', action: 'Rejected', note: 'Rejected' });
  }
  if (order.status === 'Open') next.push({ label: 'Assign & start', to: 'InProgress', action: 'Started', note: 'Work started', primary: true });
  if (order.status === 'Assigned') next.push({ label: 'Start work', to: 'InProgress', action: 'Started', note: 'Work started', primary: true });
  if (order.status === 'InProgress') {
    next.push({ label: 'Mark complete', to: 'Completed', action: 'Completed', note: 'Marked complete — pending verification', primary: true });
    next.push({ label: 'Put on hold', to: 'OnHold', action: 'On hold', note: 'Placed on hold' });
  }
  if (order.status === 'OnHold') next.push({ label: 'Resume', to: 'InProgress', action: 'Resumed', note: 'Work resumed', primary: true });
  if (order.status === 'Completed') next.push({ label: 'Verify & close', to: 'Verified', action: 'Verified', note: 'Verified and closed', primary: true });
  if (next.length === 0) return <span className="text-xs text-slate-400">No further actions available.</span>;
  return (
    <>
      {next.map((n) => (
        <ModalButton key={n.label} variant={n.primary ? 'primary' : 'secondary'} onClick={() => onAdvance(order.id, n.to, n.action, n.note)}>
          {n.label}
        </ModalButton>
      ))}
    </>
  );
}

/* ─────────────────── create modal ─────────────────── */

interface CreateFormState {
  type: WorkOrderType; title: string; assetName: string; assetTag: string;
  location: string; branch: string; priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignee: string; dueDate: string; estimatedHours: string;
  description: string; failureCode: string; checklist: string[];
}

function CreateWorkOrderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (form: CreateFormState) => void }) {
  const blank: CreateFormState = { type: 'Corrective', title: '', assetName: '', assetTag: '', location: '', branch: branches[0].name, priority: 'Medium', assignee: '', dueDate: '', estimatedHours: '2', description: '', failureCode: '', checklist: [''] };
  const [form, setForm] = useState<CreateFormState>(blank);
  const update = (patch: Partial<CreateFormState>) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.assetName) return;
    onCreate(form);
    setForm(blank);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Work Order" subtitle="New order is saved as a draft pending approval." size="lg"
      footer={<><ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton><ModalButton type="submit" form="wo-create-form">Create Draft</ModalButton></>}
    >
      <form id="wo-create-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Order type" required>
            <select className={inputClass} value={form.type} onChange={(e) => update({ type: e.target.value as WorkOrderType })}>
              <option>Corrective</option><option>Preventive</option><option>Inspection</option><option>Project</option><option>Calibration</option>
            </select>
          </Field>
          <Field label="Priority" required>
            <select className={inputClass} value={form.priority} onChange={(e) => update({ priority: e.target.value as CreateFormState['priority'] })}>
              <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
            </select>
          </Field>
        </div>
        <Field label="Title / job description" required>
          <input className={inputClass} value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="e.g. Main Chiller #2 gasket replacement" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset name" required>
            <input className={inputClass} value={form.assetName} onChange={(e) => update({ assetName: e.target.value })} placeholder="e.g. Trane Chiller 500TR" />
          </Field>
          <Field label="Asset tag">
            <input className={inputClass} value={form.assetTag} onChange={(e) => update({ assetTag: e.target.value })} placeholder="AST-HVAC-014" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <input className={inputClass} value={form.location} onChange={(e) => update({ location: e.target.value })} placeholder="e.g. Central Plant Room" />
          </Field>
          <Field label="Branch">
            <select className={inputClass} value={form.branch} onChange={(e) => update({ branch: e.target.value })}>
              {branches.map((b) => <option key={b.id}>{b.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assign to">
            <select className={inputClass} value={form.assignee} onChange={(e) => update({ assignee: e.target.value })}>
              <option value="">Unassigned</option>
              {technicians.map((t) => <option key={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Failure code">
            <select className={inputClass} value={form.failureCode} onChange={(e) => update({ failureCode: e.target.value })}>
              <option value="">— None —</option>
              {failureCodes.map((f) => <option key={f.code} value={f.code}>{f.code} · {f.description}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
          </Field>
          <Field label="Estimated hours">
            <input type="number" min="0" step="0.5" className={inputClass} value={form.estimatedHours} onChange={(e) => update({ estimatedHours: e.target.value })} />
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Describe the scope of work…" />
        </Field>
        <Field label="Task checklist" hint="Blank lines are ignored.">
          <div className="space-y-1.5">
            {form.checklist.map((task, i) => (
              <div key={i} className="flex gap-1.5">
                <input className={inputClass} value={task} onChange={(e) => update({ checklist: form.checklist.map((t, idx) => idx === i ? e.target.value : t) })} placeholder={`Task ${i + 1}`} />
                {form.checklist.length > 1 && (
                  <button type="button" className="shrink-0 rounded-lg border border-slate-200 px-2 text-slate-400 hover:bg-slate-50" onClick={() => update({ checklist: form.checklist.filter((_, idx) => idx !== i) })}>×</button>
                )}
              </div>
            ))}
            <button type="button" className="text-xs font-semibold text-[#FF5B00] hover:underline" onClick={() => update({ checklist: [...form.checklist, ''] })}>+ Add task</button>
          </div>
        </Field>
      </form>
    </Modal>
  );
}
