'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { mockTrends } from '@/src/lib/mockData';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  User,
  Wrench,
  Percent,
  X,
} from 'lucide-react';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'30d' | 'quarter' | 'ytd'>('30d');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = (format: 'PDF' | 'CSV') => {
    setExportNotice(`Preparing ${format} export with cryptographic audit stamp... Download started.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const technicians = [
    { name: 'Kwesi Mensah', role: 'Senior HVAC Lead', ordersCompleted: 34, hoursLogged: 142.5, firstTimeFix: '94.2%' },
    { name: 'Samuel Osei', role: 'Electrical Specialist', ordersCompleted: 29, hoursLogged: 118.0, firstTimeFix: '91.5%' },
    { name: 'Emmanuel Ansah', role: 'Mechanical Tech', ordersCompleted: 26, hoursLogged: 104.5, firstTimeFix: '89.0%' },
    { name: 'David Boakye', role: 'Fabrication & Plant', ordersCompleted: 22, hoursLogged: 92.0, firstTimeFix: '92.4%' },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Domain 09: Operational Telemetry & Analytics</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Executive Reports & Performance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyze equipment reliability (MTBF / MTTR), preventive compliance, technician productivity, and budget variance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('CSV')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleExport('PDF')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1336] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Executive PDF</span>
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {exportNotice && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{exportNotice}</span>
            </div>
            <button onClick={() => setExportNotice(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {/* Period Selector Bar */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Reporting Horizon:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setPeriod('30d')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  period === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPeriod('quarter')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  period === 'quarter' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Q4 2026 (Oct - Dec)
              </button>
              <button
                onClick={() => setPeriod('ytd')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  period === 'ytd' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Full Year 2026 YTD
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Dataset normalized through Nov 8, 2026</span>
        </div>

        {/* Core Reliability KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">MTBF (Mean Time Between Failures)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#0B1336] tabular-nums font-mono">342 hrs</span>
              <span className="text-[11px] text-emerald-600 font-semibold">+14.2%</span>
            </div>
            <p className="text-[10px] text-slate-400">Continuous uptime between incidents</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">MTTR (Mean Time to Repair)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums font-mono">2.4 hrs</span>
              <span className="text-[11px] text-emerald-600 font-semibold">-18% faster</span>
            </div>
            <p className="text-[10px] text-slate-400">Diagnosis to verification signoff</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">PM Compliance Rate</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#FF5B00] tabular-nums font-mono">97.4%</span>
              <span className="text-[11px] text-emerald-600 font-semibold">Target: 95%</span>
            </div>
            <p className="text-[10px] text-slate-400">Scheduled PMs closed on time</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">First-Time Fix Rate</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600 tabular-nums font-mono">91.8%</span>
              <span className="text-[11px] text-slate-500">Zero recall</span>
            </div>
            <p className="text-[10px] text-slate-400">Resolved without re-opening</p>
          </div>
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Maintenance Mix & Spend */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#0B1336] uppercase tracking-wide">
                  Preventive vs Corrective Maintenance Volume
                </h3>
                <p className="text-[11px] text-slate-500">Shift toward proactive scheduled interventions</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-[#FF5B00]">
                  <span className="h-2 w-2 rounded-full bg-[#FF5B00]" />
                  Preventive
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Corrective
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {mockTrends.map((t) => (
                <div key={t.month} className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono text-[11px] text-slate-600">
                    <span className="font-bold">{t.month} 2026</span>
                    <span>
                      {t.preventive} PM / {t.corrective} CM · GH₵ {(t.spend / 1000).toFixed(0)}k spend
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(t.preventive / (t.preventive + t.corrective)) * 100}%` }}
                      className="bg-[#FF5B00] h-full"
                    />
                    <div
                      style={{ width: `${(t.corrective / (t.preventive + t.corrective)) * 100}%` }}
                      className="bg-slate-300 h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Category Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-[#0B1336] uppercase tracking-wide">
                Work Orders by Asset Category
              </h3>
              <p className="text-[11px] text-slate-500">Distribution of maintenance workload</p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>HVAC & Central Chillers</span>
                  <span className="font-mono font-bold">38% (54 orders)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="bg-[#0B1336] h-full w-[38%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Power Generation & Switchgear</span>
                  <span className="font-mono font-bold">26% (37 orders)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="bg-[#FF5B00] h-full w-[26%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Pumps & Water Treatment</span>
                  <span className="font-mono font-bold">18% (25 orders)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="bg-blue-600 h-full w-[18%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Passenger Elevators & Lifts</span>
                  <span className="font-mono font-bold">12% (17 orders)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="bg-amber-500 h-full w-[12%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Fire & Life Safety Systems</span>
                  <span className="font-mono font-bold">6% (9 orders)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-600 h-full w-[6%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technician Productivity Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#0B1336] uppercase tracking-wide">
                Technician Productivity & Labor Utilization
              </h3>
              <p className="text-[11px] text-slate-500">Verified hours, completions, and SLA adherence</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3">Specialization</th>
                  <th className="py-2.5 px-3 text-center">Orders Closed</th>
                  <th className="py-2.5 px-3 text-right">Logged Hours</th>
                  <th className="py-2.5 px-3 text-right">First-Time Fix</th>
                  <th className="py-2.5 px-3 text-right">SLA Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {technicians.map((t) => (
                  <tr key={t.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">{t.name}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{t.role}</td>
                    <td className="py-3 px-3 text-center text-slate-900">{t.ordersCompleted}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700">{t.hoursLogged} hrs</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700">{t.firstTimeFix}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-900">98.5%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
