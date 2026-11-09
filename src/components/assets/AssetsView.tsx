'use client';

import React, { useMemo, useState } from 'react';
import {
  Wrench, Plus, Download, Search, SlidersHorizontal,
  AlertTriangle, CheckCircle2, Settings, Gauge, FileText, TrendingDown,
} from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Tabs } from '@/src/components/ui/Tabs';
import { demoAssets } from '@/src/lib/demo/assets';
import { branches, formatGhs, assetCategories } from '@/src/lib/demo/common';
import type { AssetDetail, AssetStatus, AssetCriticality } from '@/src/lib/types';

const STATUS_DISPLAY: Record<AssetStatus, string> = {
  Operational: 'Operational', Degraded: 'Degraded', Down: 'Down',
  UnderMaintenance: 'Under Maintenance', Standby: 'Standby', Retired: 'Retired',
};

const STATUS_STYLE: Record<AssetStatus, string> = {
  Operational: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Degraded: 'bg-amber-50 text-amber-700 border-amber-100',
  Down: 'bg-rose-50 text-rose-700 border-rose-100',
  UnderMaintenance: 'bg-blue-50 text-blue-600 border-blue-100',
  Standby: 'bg-slate-100 text-slate-500 border-slate-200',
  Retired: 'bg-slate-100 text-slate-400 border-slate-200',
};

const CRIT_STYLE: Record<AssetCriticality, string> = {
  Low: 'bg-slate-100 text-slate-500',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700',
  Critical: 'bg-rose-50 text-rose-700 font-semibold',
};

const CAT_ICON_COLOR: Record<string, string> = {
  HVAC: '#3b82f6', Electrical: '#f59e0b', Mechanical: '#8b5cf6', Plumbing: '#14b8a6',
  'Fire & Safety': '#ef4444', Transport: '#10b981', 'IT & Communications': '#6366f1',
  'Building Fabric': '#78716c', Production: '#f97316', 'Medical Equipment': '#ec4899',
};

const DRAWER_TABS = ['overview', 'meters', 'maintenance', 'downtime', 'documents'] as const;
type DrawerTab = typeof DRAWER_TABS[number];

function KpiChip({ value, label, color = 'slate' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm`}>
      <span className="text-sm font-bold tabular-nums text-[#0B1336] leading-none">{value}</span>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </div>
  );
}

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<AssetDetail[]>(demoAssets);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [critFilter, setCritFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const selected = assets.find((a) => a.id === selectedId) ?? null;

  const kpis = useMemo(() => ({
    total: assets.length,
    operational: assets.filter((a) => a.status === 'Operational').length,
    down: assets.filter((a) => a.status === 'Down').length,
    maintenance: assets.filter((a) => a.status === 'UnderMaintenance').length,
    critical: assets.filter((a) => a.criticality === 'Critical').length,
    availability: ((assets.filter((a) => a.status === 'Operational').length / assets.length) * 100).toFixed(1),
  }), [assets]);

  const filtered = useMemo(() => assets.filter((a) => {
    const q = search.toLowerCase();
    return (
      (!q || a.name.toLowerCase().includes(q) || a.tag.toLowerCase().includes(q) || a.manufacturer.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || a.status === statusFilter) &&
      (critFilter === 'all' || a.criticality === critFilter) &&
      (catFilter === 'all' || a.category === catFilter) &&
      (branchFilter === 'all' || a.branchName === branchFilter)
    );
  }), [assets, search, statusFilter, critFilter, catFilter, branchFilter]);

  const handleCreate = (form: AssetForm) => {
    setAssets((prev) => [{
      id: `ast-${Date.now()}`, tag: form.tag, name: form.name,
      category: form.category as AssetDetail['category'], status: 'Operational',
      criticality: form.criticality as AssetCriticality, manufacturer: form.manufacturer,
      model: form.model, serialNumber: form.serialNumber, branchName: form.branch,
      location: form.location, department: form.department, custodian: form.custodian,
      childCount: 0, commissioningDate: form.commissioningDate, purchaseDate: form.purchaseDate,
      purchaseCost: Number(form.purchaseCost) || 0, currentValue: Number(form.purchaseCost) || 0,
      condition: 'New', lastServiceDate: '', nextServiceDate: '', totalRuntimeHours: 0,
      warranty: { vendor: '', startDate: '', endDate: '', isExpired: false, terms: '' },
      meterReadings: [], downtime: [], documents: [], maintenanceHistory: [],
    }, ...prev]);
    setCreateOpen(false);
  };

  const exportCsv = () => {
    const rows = filtered.map((a) => [a.tag, `"${a.name}"`, a.category, a.status, a.criticality, a.branchName, a.totalRuntimeHours]);
    const csv = ['Tag,Name,Category,Status,Criticality,Branch,Runtime'].concat(rows.map((r) => r.join(','))).join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); el.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`; el.click();
  };

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Assets & Equipment</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Asset Register</h1>
          <p className="mt-1 text-sm text-slate-500">Equipment registry with meter readings, warranty tracking, maintenance and downtime history.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]"><Plus className="h-4 w-4" />Register Asset</button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;Illustrative records — not connected to live APIs.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <KpiChip value={kpis.total.toLocaleString()} label="Registered" />
        <KpiChip value={kpis.operational} label="Operational" />
        <KpiChip value={kpis.maintenance} label="Under maintenance" />
        {kpis.down > 0 && <KpiChip value={kpis.down} label="Down" />}
        {kpis.critical > 0 && <KpiChip value={kpis.critical} label="Critical" />}
        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-[11px] font-semibold text-slate-500">
          <div className={`h-2 w-2 rounded-full ${Number(kpis.availability) >= 95 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Fleet availability&nbsp;<span className={`font-bold ${Number(kpis.availability) >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>{kpis.availability}%</span>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tag, name, manufacturer…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {[
                  { val: statusFilter, set: setStatusFilter, opts: [['all', 'All statuses'], ['Operational', 'Operational'], ['Down', 'Down'], ['UnderMaintenance', 'Maintenance'], ['Degraded', 'Degraded']] },
                  { val: critFilter, set: setCritFilter, opts: [['all', 'All criticalities'], ['Critical', 'Critical'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']] },
                  { val: catFilter, set: setCatFilter, opts: [['all', 'All categories'], ...assetCategories.map((c) => [c, c] as [string, string])] },
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
              <span className="text-[11px] text-slate-400">{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100"><Wrench className="h-6 w-6 text-slate-400" strokeWidth={1.5} /></div>
            <p className="mt-3 text-sm font-semibold text-slate-600">No assets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Asset', 'Category', 'Status', 'Criticality', 'Location', 'Custodian', 'Warranty', 'Runtime'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${i === 7 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} onClick={() => { setSelectedId(a.id); setDrawerTab('overview'); }} className={`group cursor-pointer border-b border-slate-50 transition-colors hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${CAT_ICON_COLOR[a.category] ?? '#64748b'}18` }}>
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CAT_ICON_COLOR[a.category] ?? '#64748b' }} />
                        </div>
                        <div>
                          <p className="font-mono text-[11px] font-bold text-[#0B1336]">{a.tag}</p>
                          <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-600 group-hover:text-slate-900">{a.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{a.category}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[a.status]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{STATUS_DISPLAY[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${CRIT_STYLE[a.criticality]}`}>{a.criticality}</span></td>
                    <td className="px-4 py-3">
                      <p className="max-w-[140px] truncate text-xs text-slate-600">{a.location}</p>
                      <p className="text-[10px] text-slate-400">{a.branchName}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.custodian}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${a.warranty.isExpired ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                        {a.warranty.isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{a.totalRuntimeHours.toLocaleString()}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
          <span className="text-[11px] text-slate-400">{filtered.length} of {assets.length} assets · demonstration dataset</span>
          <span className="text-[11px] text-slate-400">Click a row to view detail</span>
        </div>
      </div>

      {/* Drawer */}
      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected?.tag ?? ''} subtitle={selected?.name} width="xl">
        {selected && <AssetDetail asset={selected} tab={drawerTab} onTabChange={setDrawerTab} />}
      </Drawer>

      {/* Create */}
      <CreateAssetModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
};

/* ── Drawer ── */
function AssetDetail({ asset, tab, onTabChange }: { asset: AssetDetail; tab: DrawerTab; onTabChange: (t: DrawerTab) => void }) {
  return (
    <div className="space-y-4">
      {/* Warranty banner */}
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${asset.warranty.isExpired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Warranty: {asset.warranty.isExpired ? 'Expired' : 'Active'}
        {asset.warranty.endDate && <span className="font-normal opacity-75">— {asset.warranty.isExpired ? 'expired' : 'expires'} {asset.warranty.endDate}</span>}
      </div>

      {/* Status + criticality row */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs ${STATUS_STYLE[asset.status]}`}>
          <span className="h-2 w-2 rounded-full bg-current" /><span className="font-semibold">{STATUS_DISPLAY[asset.status]}</span>
        </div>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold ${CRIT_STYLE[asset.criticality]}`}>
          <span>Criticality: {asset.criticality}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1">
          {(['overview', 'meters', 'maintenance', 'downtime', 'documents'] as DrawerTab[]).map((t) => (
            <button key={t} onClick={() => onTabChange(t)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold capitalize transition-colors ${tab === t ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          {[
            ['Category', asset.category], ['Manufacturer', asset.manufacturer], ['Model', asset.model],
            ['Serial no.', asset.serialNumber], ['Location', asset.location], ['Branch', asset.branchName],
            ['Department', asset.department], ['Custodian', asset.custodian],
            ['Commissioned', asset.commissioningDate], ['Purchased', asset.purchaseDate],
            ['Purchase cost', formatGhs(asset.purchaseCost)], ['Current value', formatGhs(asset.currentValue)],
            ['Runtime', `${asset.totalRuntimeHours.toLocaleString()}h`], ['Condition', asset.condition],
            ['Last service', asset.lastServiceDate || '—'], ['Next service', asset.nextServiceDate || '—'],
          ].map(([l, v]) => (
            <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-0.5 text-xs text-slate-700">{v}</p></div>
          ))}
        </div>
      )}

      {tab === 'meters' && (
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Meter</th><th className="px-3 py-2 text-right">Reading</th><th className="px-3 py-2">By</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {asset.meterReadings.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No readings.</td></tr> :
              asset.meterReadings.map((r) => <tr key={r.id} className="hover:bg-slate-50"><td className="px-3 py-2.5">{r.date}</td><td className="px-3 py-2.5 text-slate-600">{r.meter}</td><td className="px-3 py-2.5 text-right font-mono font-semibold">{r.reading.toLocaleString()} {r.unit}</td><td className="px-3 py-2.5 text-slate-500">{r.recordedBy}</td></tr>)}
          </tbody>
        </table>
      )}

      {tab === 'maintenance' && (
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Work Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Cost</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {asset.maintenanceHistory.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No history.</td></tr> :
              asset.maintenanceHistory.map((m) => <tr key={m.id} className="hover:bg-slate-50"><td className="px-3 py-2.5 font-mono font-bold text-[#FF5B00]">{m.number}</td><td className="px-3 py-2.5 text-slate-600">{m.date}</td><td className="px-3 py-2.5"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{m.type}</span></td><td className="px-3 py-2.5 text-right font-mono font-semibold">{m.cost > 0 ? formatGhs(m.cost) : '—'}</td></tr>)}
          </tbody>
        </table>
      )}

      {tab === 'downtime' && (
        <div className="space-y-2">
          {asset.downtime.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No downtime events.</p> :
            asset.downtime.map((d) => (
              <div key={d.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs">
                <div className="flex items-center justify-between"><span className="font-semibold text-rose-700">{d.hours}h downtime</span><span className="font-mono text-[10px] text-[#FF5B00]">{d.workOrderNumber}</span></div>
                <p className="mt-1 text-rose-800">{d.reason}</p>
                <p className="mt-0.5 text-[10px] text-rose-600">{d.from} → {d.to}</p>
              </div>
            ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-1.5">
          {asset.documents.length === 0 ? <p className="py-8 text-center text-xs text-slate-400">No documents uploaded.</p> :
            asset.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-xs">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0"><p className="truncate font-medium text-slate-700">{doc.name}</p><p className="text-[10px] text-slate-400">{doc.category} · {doc.uploadedAt}</p></div>
              </div>
            ))}
          <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">Upload is a demonstration placeholder.</div>
        </div>
      )}
    </div>
  );
}

/* ── Create modal ── */
interface AssetForm { tag: string; name: string; category: string; criticality: string; manufacturer: string; model: string; serialNumber: string; branch: string; location: string; department: string; custodian: string; commissioningDate: string; purchaseDate: string; purchaseCost: string; }

function CreateAssetModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (f: AssetForm) => void }) {
  const blank: AssetForm = { tag: '', name: '', category: 'HVAC', criticality: 'Medium', manufacturer: '', model: '', serialNumber: '', branch: branches[0].name, location: '', department: 'Engineering & Maintenance', custodian: '', commissioningDate: '', purchaseDate: '', purchaseCost: '' };
  const [form, setForm] = useState<AssetForm>(blank);
  const u = (p: Partial<AssetForm>) => setForm((f) => ({ ...f, ...p }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.tag || !form.name) return; onCreate(form); setForm(blank); };

  return (
    <Modal open={open} onClose={onClose} title="Register New Asset" size="lg"
      footer={<><ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton><ModalButton type="submit" form="ast-form">Register Asset</ModalButton></>}
    >
      <form id="ast-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset tag" required hint="Unique ID e.g. AST-HVAC-015"><input className={inputClass} value={form.tag} onChange={(e) => u({ tag: e.target.value })} placeholder="AST-…" /></Field>
          <Field label="Asset name" required><input className={inputClass} value={form.name} onChange={(e) => u({ name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => u({ category: e.target.value })}>{assetCategories.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Criticality"><select className={inputClass} value={form.criticality} onChange={(e) => u({ criticality: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Manufacturer"><input className={inputClass} value={form.manufacturer} onChange={(e) => u({ manufacturer: e.target.value })} /></Field>
          <Field label="Model"><input className={inputClass} value={form.model} onChange={(e) => u({ model: e.target.value })} /></Field>
        </div>
        <Field label="Serial number"><input className={inputClass} value={form.serialNumber} onChange={(e) => u({ serialNumber: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Branch"><select className={inputClass} value={form.branch} onChange={(e) => u({ branch: e.target.value })}>{branches.map((b) => <option key={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Location" required><input className={inputClass} value={form.location} onChange={(e) => u({ location: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => u({ department: e.target.value })} /></Field>
          <Field label="Custodian"><input className={inputClass} value={form.custodian} onChange={(e) => u({ custodian: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Commissioned"><input type="date" className={inputClass} value={form.commissioningDate} onChange={(e) => u({ commissioningDate: e.target.value })} /></Field>
          <Field label="Purchased"><input type="date" className={inputClass} value={form.purchaseDate} onChange={(e) => u({ purchaseDate: e.target.value })} /></Field>
          <Field label="Cost (GH₵)"><input type="number" min="0" className={inputClass} value={form.purchaseCost} onChange={(e) => u({ purchaseCost: e.target.value })} /></Field>
        </div>
      </form>
    </Modal>
  );
}
