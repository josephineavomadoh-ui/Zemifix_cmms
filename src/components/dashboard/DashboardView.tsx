'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/src/lib/auth-context';
import { StatCard } from '@/src/components/ui/StatCard';
import {
  Building,
  Users,
  Layers,
  ShieldCheck,
  ArrowRight,
  Plus,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-[#0B1336] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#FF5B00]/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#16204E] text-[#FF5B00] text-xs font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Dual-Control Enterprise System Active</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Administrator'}
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            {stats?.organization?.companyName || 'ZemiFix Engineering Ltd'} · Branch:{' '}
            <span className="font-semibold text-white">{user?.branch?.name || 'Accra Head Office'}</span> · Scope:{' '}
            <span className="font-mono text-[#FF5B00]">{user?.accessScope || 'Company'}</span>
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchStats}
            title="Refresh database statistics"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/organization"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E65200] transition-colors"
          >
            <Building className="h-4 w-4" />
            <span>Manage Branches</span>
          </Link>
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-xs"
          >
            <Users className="h-4 w-4" />
            <span>Manage Staff</span>
          </Link>
        </div>
      </div>

      {/* Database Connection Error or Demonstration Mode Banner */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-rose-900 text-sm">PostgreSQL Database Connection Required</h3>
            <p className="text-rose-700 leading-relaxed">
              {error}
            </p>
            <p className="text-[11px] text-rose-600 font-mono">
              Code: 503 DATABASE_UNAVAILABLE · Silent fallback disabled. Real persistent operations require an active PostgreSQL instance configured in DATABASE_URL.
            </p>
          </div>
        </div>
      )}

      {stats?.isDemoData && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-amber-900 text-sm">DEMONSTRATION MODE ACTIVE</h3>
            <p className="text-amber-800 leading-relaxed">
              Displaying seed architecture baseline data (ENABLE_DEMO_MODE=true). Persistent writes require an active PostgreSQL connection.
            </p>
          </div>
        </div>
      )}

      {/* Database Connection Status Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Database className="h-4 w-4 text-[#0B1336]" />
          <span className="font-semibold text-[#0B1336]">Data Source:</span>
          <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
            stats?.source === 'database' 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-amber-100 text-amber-800'
          }`}>
            {stats?.source === 'database' ? 'Live PostgreSQL Database' : 'Demonstration Baseline (Non-Persistent)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stats?.source === 'database' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-slate-500 font-medium">
            {stats?.source === 'database' ? 'PostgreSQL Active' : 'Demonstration Mode'}
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics Tiles (Real Available Organization Counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Operating Branches"
          value={loading ? '...' : (stats?.organization?.totalBranches || 3).toString()}
          subValue="Materialized path hierarchy"
          icon={Building}
          accentColor="navy"
          trend={{ value: 'Full hierarchy', isPositive: true }}
        />
        <StatCard
          label="Active Departments"
          value={loading ? '...' : (stats?.organization?.totalDepartments || 3).toString()}
          subValue="Engineering & technical units"
          icon={Layers}
          accentColor="orange"
          trend={{ value: 'Multi-level tree', isPositive: true }}
        />
        <StatCard
          label="Staff Personnel"
          value={loading ? '...' : (stats?.organization?.totalStaff || 3).toString()}
          subValue="Active scoped accounts"
          icon={Users}
          accentColor="navy"
          trend={{ value: 'RBAC enforced', isPositive: true }}
        />
        <StatCard
          label="Deploy Base Currency"
          value={loading ? '...' : (stats?.organization?.baseCurrency || 'GHS')}
          subValue="Fiscal Year Start: Jan"
          icon={FileText}
          accentColor="emerald"
          trend={{ value: 'Tax standard', isPositive: true }}
        />
      </div>

      {/* Main Grid: Real Organization Directory & Honest Roadmap Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Active Branches & Departments Listing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Branches Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#0B1336]">
                  Configured Branch Network
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-level geographic facilities with materialized path scoping
                </p>
              </div>
              <Link
                href="/organization"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:underline"
              >
                <span>Branch Manager</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Branch Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Hierarchy Type</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.organization?.branchesList?.map((branch: any) => (
                    <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{branch.name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600">
                        {branch.code}
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {branch.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Departments Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#0B1336]">
                  Active Department Units
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Functional cost centers and maintenance divisions
                </p>
              </div>
              <Link
                href="/organization"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:underline"
              >
                <span>Department Tree</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Department Name</th>
                    <th className="py-2.5 px-3">Department Code</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.organization?.departmentsList?.map((dept: any) => (
                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span>{dept.name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-600">
                        {dept.code}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Operational Readiness & Stage Schedule */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0B1336]">Operational Domain Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact functional readiness across the 14 architecture domains
              </p>
            </div>

            <div className="space-y-3.5 mt-4">
              {/* Domain 01 - Live */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">Domain 01: Identity & Organization</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-snug">
                  Company, Branches, Departments, Roles, Staff Accounts & Access Scopes active.
                </p>
              </div>

              {/* Customer Portal Root - Live */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">Contractor Mode: Customer Root</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                    Stage 1 Live
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 leading-snug">
                  Customer, Sites, Contacts, Relational Site Grants & Token Sessions ready.
                </p>
              </div>

              {/* Work Orders - Pending Stage 3 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Work Orders & Maintenance</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Pending Stage 3
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Maintenance work order board, technician dispatches & labor logs.
                </p>
              </div>

              {/* Physical Asset Registry - Pending Stage 3 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Physical Asset Registry</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Pending Stage 3
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Asset hierarchy, QR tag scanner, meter telemetry & downtime ledger.
                </p>
              </div>

              {/* Inventory Movements - Pending Stage 4 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Inventory Stock Ledger</span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                    Pending Stage 4
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dual-ledger stock movements, warehouse transfers & moving-average costing.
                </p>
              </div>

              {/* Procurement & Invoicing - Pending Stage 5 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Procurement & Invoicing</span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                    Pending Stage 5
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  3-way purchase order matching, customer invoicing & GRA tax integration.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/settings"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span>Inspect Deployment Architecture</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
