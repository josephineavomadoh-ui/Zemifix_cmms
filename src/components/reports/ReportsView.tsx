'use client';

import React, { useState } from 'react';
import { BarChart3, Download, Filter, FileBarChart, ArrowRight, Calendar } from 'lucide-react';
import { demoPMPlans } from '@/src/lib/demo/preventive';
import { mockTrends, mockWorkOrders } from '@/src/lib/mockData';
import { formatGhs } from '@/src/lib/demo/common';

const REPORT_CATALOGUE = [
  { category: 'Work Order Performance', reports: [
    { id: 'wo-summary', name: 'Work Order Summary', desc: 'Volume, status and cycle time' },
    { id: 'wo-sla', name: 'SLA Compliance', desc: '% on-time vs breached by branch' },
    { id: 'wo-backlog', name: 'Backlog Ageing', desc: 'Open orders by age and priority' },
    { id: 'wo-cycle', name: 'Average Cycle Time', desc: 'Mean hours open-to-close' },
  ]},
  { category: 'Preventive Maintenance', reports: [
    { id: 'pm-compliance', name: 'PM Compliance', desc: 'Completed vs scheduled by plan' },
    { id: 'pm-overdue', name: 'Overdue Plans', desc: 'Missed and overdue schedules' },
    { id: 'pm-forecast', name: 'PM Forecast', desc: 'Upcoming maintenance next 30/60/90 days' },
  ]},
  { category: 'Asset & Reliability', reports: [
    { id: 'ast-availability', name: 'Asset Availability', desc: 'Fleet % operational by category' },
    { id: 'ast-downtime', name: 'Asset Downtime', desc: 'Hours and cost impact' },
    { id: 'ast-mttr', name: 'MTTR & MTBF', desc: 'Mean time to repair and between failures' },
  ]},
  { category: 'Technician Productivity', reports: [
    { id: 'tech-util', name: 'Technician Utilization', desc: 'Hours worked vs available capacity' },
    { id: 'tech-productivity', name: 'Productivity Report', desc: 'WOs completed and avg cycle time' },
  ]},
  { category: 'Financial', reports: [
    { id: 'fin-spend', name: 'Maintenance Spend', desc: 'Labour / parts / contractor split' },
    { id: 'fin-budget', name: 'Budget Utilization', desc: 'Actual vs budget by branch' },
    { id: 'fin-wo-cost', name: 'Cost per Work Order', desc: 'Average and total by type' },
  ]},
  { category: 'Inventory', reports: [
    { id: 'inv-valuation', name: 'Inventory Valuation', desc: 'WAC value by category and warehouse' },
    { id: 'inv-movement', name: 'Stock Movement', desc: 'Receipts, issues and adjustments' },
    { id: 'inv-turnover', name: 'Stock Turnover', desc: 'Fast movers vs slow movers' },
  ]},
  { category: 'Procurement & Suppliers', reports: [
    { id: 'proc-spend', name: 'Supplier Spend', desc: 'Spend by supplier and category' },
    { id: 'proc-performance', name: 'Supplier Performance', desc: 'On-time delivery and quality' },
  ]},
  { category: 'SLA & Branch', reports: [
    { id: 'sla-summary', name: 'SLA Summary', desc: 'Overall and by priority tier' },
    { id: 'branch-perf', name: 'Branch Performance', desc: 'WOs, PM compliance and spend by branch' },
  ]},
];

const woStatusData = [
  { label: 'In Progress', value: 21, color: '#FF5B00' },
  { label: 'Open', value: 14, color: '#0B1336' },
  { label: 'On Hold', value: 7, color: '#f59e0b' },
  { label: 'Completed', value: 129, color: '#10b981' },
];

const techData = [
  { name: 'Kwesi Mensah', pct: 88 }, { name: 'Samuel Osei', pct: 74 },
  { name: 'Emmanuel Ansah', pct: 61 }, { name: 'Daniel Adjei', pct: 55 },
  { name: 'Akosua Boateng', pct: 48 },
];

const spendTrend = mockTrends.map((m) => ({ label: m.month, value: m.spend }));
const maxSpend = Math.max(...spendTrend.map((d) => d.value), 1);

const mttrData = [
  { priority: 'Urgent', mttr: 18, mtbf: 312 }, { priority: 'High', mttr: 42, mtbf: 720 },
  { priority: 'Medium', mttr: 96, mtbf: 1440 }, { priority: 'Low', mttr: 168, mtbf: 4320 },
];

export const ReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('2026-11-01');
  const [dateTo, setDateTo] = useState('2026-11-08');
  const [branchFilter, setBranchFilter] = useState('All branches');
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const avgCompliance = Math.round(demoPMPlans.reduce((s, p) => s + p.compliancePercent, 0) / demoPMPlans.length);
  const donutTotal = woStatusData.reduce((s, d) => s + d.value, 0);

  // Simple SVG donut
  const radius = 28, circ = 2 * Math.PI * radius;
  let offset = 0;
  const donutSegments = woStatusData.map((d) => {
    const frac = d.value / donutTotal;
    const seg = <circle key={d.label} cx="36" cy="36" r={radius} fill="none" stroke={d.color} strokeWidth="10" strokeDasharray={`${frac * circ} ${circ - frac * circ}`} strokeDashoffset={-offset} />;
    offset += frac * circ;
    return seg;
  });

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Reports & Analytics</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Performance dashboards, operational analytics and exportable reports across all CMMS modules.</p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Export Report</button>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;All charts use illustrative data. Actual report generation requires backend API integration.
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#FF5B00] focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="font-semibold text-slate-600">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-[#FF5B00] focus:outline-none" />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none">
          <option>All branches</option><option>Accra Head Office</option><option>Tema Industrial Region</option><option>Kumasi Regional Hub</option>
        </select>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#E65200]"><Filter className="h-3.5 w-3.5" />Apply</button>
        <span className="text-[11px] text-amber-600 font-semibold">Demo: filters do not change chart data</span>
      </div>

      {/* Featured charts grid */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Work order status donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Work orders</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">Status Distribution</h3>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
              <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">{donutSegments}</svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-bold text-[#0B1336]">{donutTotal}</span>
                <span className="text-[8px] font-semibold uppercase text-slate-400">Total</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {woStatusData.map((d) => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.label}</span>
                  <span className="ml-auto font-bold text-slate-700">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLA gauge */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA performance</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">SLA Compliance</h3>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
              <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                <circle cx="20" cy="20" r="15" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle cx="20" cy="20" r="15" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${0.964 * 94.25} ${94.25}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-[#0B1336]">96.4%</span>
                <span className="text-[8px] font-semibold uppercase text-slate-400">SLA</span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-emerald-50 p-2"><p className="text-[10px] text-emerald-600 font-semibold uppercase">Compliant</p><p className="text-base font-bold text-emerald-700">96.4%</p></div>
              <div className="rounded-lg bg-rose-50 p-2"><p className="text-[10px] text-rose-500 font-semibold uppercase">Breached</p><p className="text-base font-bold text-rose-600">3.6%</p></div>
            </div>
          </div>
        </div>

        {/* PM compliance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Preventive maintenance</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">PM Compliance</h3>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0" style={{ width: 60, height: 60 }}>
              <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                <circle cx="20" cy="20" r="15" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle cx="20" cy="20" r="15" fill="none" stroke="#FF5B00" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(avgCompliance / 100) * 94.25} ${94.25}`} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold text-[#0B1336]">{avgCompliance}%</span></div>
            </div>
            <div className="flex-1 space-y-1.5">
              {demoPMPlans.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-10 font-mono text-[10px] text-slate-400">{p.code}</span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${p.compliancePercent >= 90 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${p.compliancePercent}%` }} /></div>
                  <span className="w-8 text-right text-[10px] font-mono font-semibold text-slate-500">{p.compliancePercent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spend trend + MTTR */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Maintenance spend</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">Monthly Expenditure (GH₵)</h3>
          <div className="flex h-28 items-end gap-2 border-b border-slate-100 pb-1">
            {spendTrend.map((d) => (
              <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] tabular-nums text-slate-400">{(d.value / 1000).toFixed(0)}k</span>
                <div className="w-full max-w-8 rounded-t bg-[#0B1336] transition-colors hover:bg-[#FF5B00]" style={{ height: `${Math.max((d.value / maxSpend) * 80, 4)}%` }} />
                <span className="text-[9px] font-medium text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reliability</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">MTTR & MTBF by Priority</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Priority</th><th className="px-3 py-2 text-right">MTTR (h)</th><th className="px-3 py-2 text-right">MTBF (h)</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {mttrData.map((r) => (
                  <tr key={r.priority} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{r.priority}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">{r.mttr}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-500">{r.mtbf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Calculated from work order open/close timestamps and asset downtime logs when connected to live data.</p>
        </div>
      </div>

      {/* Technician utilization */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Workforce</p>
        <h3 className="mb-4 text-sm font-bold text-[#0B1336]">Technician Utilization</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {techData.map((t) => (
            <div key={t.name} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1336] text-[10px] font-bold text-white">{t.name.split(' ').map((n) => n[0]).join('')}</div>
                <p className="text-[11px] font-semibold text-slate-700 truncate">{t.name.split(' ')[0]}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${t.pct >= 80 ? 'bg-[#FF5B00]' : 'bg-[#0B1336]'}`} style={{ width: `${t.pct}%` }} /></div>
              <p className="mt-1 text-right text-[10px] font-mono font-bold text-slate-600">{t.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Report catalogue */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Report library</p>
        <h3 className="mb-4 text-sm font-bold text-[#0B1336]">Available Reports</h3>
        <div className="space-y-5">
          {REPORT_CATALOGUE.map((cat) => (
            <div key={cat.category}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{cat.category}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {cat.reports.map((r) => (
                  <button key={r.id} onClick={() => setActiveReport(activeReport === r.id ? null : r.id)} className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${activeReport === r.id ? 'border-[#FF5B00] bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <FileBarChart className={`h-4 w-4 ${activeReport === r.id ? 'text-[#FF5B00]' : 'text-slate-400'}`} />
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">{r.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{r.desc}</p>
                    {activeReport === r.id && (
                      <div className="mt-2 border-t border-orange-200 pt-2 flex items-center justify-between text-[10px]">
                        <span className="text-amber-600 font-semibold">Demo preview</span>
                        <button className="inline-flex items-center gap-1 text-[#FF5B00] font-semibold hover:underline"><Download className="h-3 w-3" />Export</button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
