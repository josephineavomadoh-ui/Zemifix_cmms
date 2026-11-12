'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  Gauge,
  Handshake,
  PackageSearch,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/src/lib/auth-context';
import type { DashboardStatistics } from '@/src/lib/services/dashboardService';

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  detail,
  href,
  linkLabel,
}: {
  title: string;
  detail?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-[#080E29]">{title}</h2>
        {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#E65200] hover:text-[#C94400]">
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-semibold tabular-nums text-[#080E29]">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${item.value ? Math.max((item.value / max) * 100, 2) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricLink({
  href,
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: 'navy' | 'orange' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    navy: 'bg-slate-100 text-[#0B1336]',
    orange: 'bg-orange-50 text-[#D94D00]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <Link
      href={href}
      className="group min-w-0 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B00]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium leading-snug text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-tight tabular-nums text-[#080E29]">{value}</p>
      <p className="mt-2 truncate border-t border-slate-100 pt-2 text-[10px] text-slate-500">{detail}</p>
    </Link>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone = normalized === 'COMPLETED'
    ? 'bg-emerald-50 text-emerald-700'
    : normalized === 'ON_HOLD'
      ? 'bg-amber-50 text-amber-800'
      : normalized === 'OPEN'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium ${tone}`}>
      {value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase())}
    </span>
  );
}

export const DashboardView: React.FC = () => {
  const { user, selectedBranch } = useAuth();
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Dashboard data could not be loaded (HTTP ${response.status}).`);
      }
      setStats(data as DashboardStatistics);
      setError(null);
    } catch (fetchError) {
      setStats(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const activeWorkOrders = stats
    ? stats.workOrders.open + stats.workOrders.assigned + stats.workOrders.inProgress + stats.workOrders.onHold
    : 0;
  const currency = stats?.organization.baseCurrency || 'GHS';
  const statusItems = stats
    ? [
        { label: 'Open', value: stats.workOrders.open, color: 'bg-[#FF5B00]' },
        { label: 'Assigned', value: stats.workOrders.assigned, color: 'bg-[#0B1336]' },
        { label: 'In progress', value: stats.workOrders.inProgress, color: 'bg-blue-500' },
        { label: 'On hold', value: stats.workOrders.onHold, color: 'bg-amber-500' },
      ]
    : [];

  return (
    <div className="min-w-0 space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-lg bg-[#080E29] px-5 py-5 text-white sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium text-slate-300">
              <Activity className="h-4 w-4 text-[#FF5B00]" />
              Operations overview
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {firstName}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {stats?.organization.companyName || 'Your maintenance operations at a glance.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-[#FF5B00]" />
                {today}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-[#FF5B00]" />
                {selectedBranch}
              </span>
              {user?.accessScope && <span>{user.accessScope}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/work-orders/new" className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#FF5B00] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#F95700]">
              <Plus className="h-4 w-4" />
              Create work order
            </Link>
            <Link href="/requests" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              <ClipboardList className="h-4 w-4" />
              Service requests
            </Link>
            <Link href="/reports" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              <FileBarChart className="h-4 w-4" />
              Reports
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Dashboard data unavailable</p>
            <p className="mt-1 text-xs text-rose-800">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchStats()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      <section aria-label="Operational metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !stats ? (
          Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
          ))
        ) : stats ? (
          <>
            <MetricLink href="/work-orders" label="Active work orders" value={activeWorkOrders} detail={`${stats.workOrders.total} total records`} icon={ClipboardList} tone="navy" />
            <MetricLink href="/work-orders" label="Overdue work orders" value={stats.workOrders.overdue} detail="Past planned completion" icon={AlertCircle} tone={stats.workOrders.overdue ? 'rose' : 'emerald'} />
            <MetricLink href="/requests" label="Pending service requests" value={stats.workOrders.pendingRequests} detail="Awaiting review" icon={Activity} tone={stats.workOrders.pendingRequests ? 'amber' : 'navy'} />
            <MetricLink href="/assets" label="Asset availability" value={`${stats.assets.availabilityPercentage}%`} detail={`${stats.assets.operational} operational of ${stats.assets.total}`} icon={Gauge} tone="emerald" />
            <MetricLink href="/inventory" label="Low-stock parts" value={stats.inventory.lowStockCount} detail={`${stats.inventory.totalPartCount} active parts`} icon={PackageSearch} tone={stats.inventory.lowStockCount ? 'amber' : 'navy'} />
            <MetricLink href="/sla/breaches" label="SLA breaches" value={stats.slaAndContracts.slaBreachCount} detail="Recorded breach events" icon={ShieldAlert} tone={stats.slaAndContracts.slaBreachCount ? 'rose' : 'emerald'} />
            <MetricLink href="/finance/invoices" label="Outstanding receivables" value={formatCurrency(stats.finance.outstandingReceivables, currency)} detail="Open invoice balances" icon={CircleDollarSign} tone="orange" />
            <MetricLink href="/contracts" label="Active contracts" value={stats.slaAndContracts.activeContracts} detail="Currently active" icon={Handshake} tone="navy" />
          </>
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Operational metrics could not be displayed.</p>
            <p className="mt-1 text-xs text-slate-500">Retry the request to load the latest data from the dashboard service.</p>
          </div>
        )}
      </section>

      {stats && (
        <>
          <section aria-label="Work order operations" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-5">
            <Panel className="xl:col-span-2">
              <SectionHeading title="Work order status" detail={`${activeWorkOrders} active work orders`} href="/work-orders" linkLabel="Open work orders" />
              {activeWorkOrders > 0 ? (
                <HorizontalBars items={statusItems} />
              ) : (
                <div className="rounded-md bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No active work orders in the current data scope.
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[11px] text-slate-500">Completed</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[#080E29]">{stats.workOrders.completed}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">On hold</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[#080E29]">{stats.workOrders.onHold}</p>
                </div>
              </div>
            </Panel>

            <Panel className="xl:col-span-3">
              <SectionHeading title="Recent work orders" detail="Latest records in your access scope" href="/work-orders" linkLabel="View queue" />
              {stats.recentWorkOrders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="pb-2 pr-3">Work order</th>
                        <th className="pb-2 pr-3">Asset / location</th>
                        <th className="pb-2 pr-3">Priority</th>
                        <th className="pb-2 pr-3">Status</th>
                        <th className="pb-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentWorkOrders.map((order) => (
                        <tr key={order.id} className="text-xs">
                          <td className="py-3 pr-3">
                            <Link href={`/work-orders/${order.id}`} className="font-semibold text-[#0B1336] hover:text-[#D94D00]">
                              {order.workOrderNumber}
                            </Link>
                            <p className="mt-1 max-w-48 truncate text-[11px] text-slate-500">{order.title}</p>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">
                            <p className="max-w-40 truncate">{order.assetName || '—'}</p>
                            <p className="mt-1 max-w-40 truncate text-[10px] text-slate-400">{order.locationName || '—'}</p>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">{order.priority.replaceAll('_', ' ')}</td>
                          <td className="py-3 pr-3"><StatusBadge value={order.status} /></td>
                          <td className="whitespace-nowrap py-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 p-8 text-center">
                  <ClipboardList className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-700">No recent work orders</p>
                  <p className="mt-1 text-[11px] text-slate-500">New work orders will appear here when they are created.</p>
                </div>
              )}
            </Panel>
          </section>

          <section aria-label="Assets, inventory and organization" className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel>
              <SectionHeading title="Asset condition" href="/assets" linkLabel="View assets" />
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[5px] border-emerald-100 bg-white text-sm font-semibold text-[#080E29]">
                  {stats.assets.availabilityPercentage}%
                </div>
                <div className="min-w-0 space-y-1.5 text-xs">
                  <p className="flex items-center justify-between gap-5 text-slate-600"><span>Total assets</span><strong className="text-[#080E29]">{stats.assets.total}</strong></p>
                  <p className="flex items-center justify-between gap-5 text-slate-600"><span>In maintenance</span><strong className="text-amber-700">{stats.assets.inMaintenance}</strong></p>
                  <p className="flex items-center justify-between gap-5 text-slate-600"><span>Down</span><strong className="text-rose-700">{stats.assets.down}</strong></p>
                </div>
              </div>
              {stats.assets.total === 0 && <p className="mt-4 text-xs text-slate-500">No assets are registered in the current data scope.</p>}
            </Panel>

            <Panel>
              <SectionHeading title="Inventory and procurement" href="/inventory" linkLabel="View inventory" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-600"><Boxes className="h-4 w-4 text-slate-400" />Active parts</span>
                  <strong className="text-[#080E29]">{stats.inventory.totalPartCount}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-600"><PackageSearch className="h-4 w-4 text-slate-400" />Low stock</span>
                  <strong className={stats.inventory.lowStockCount ? 'text-amber-700' : 'text-[#080E29]'}>{stats.inventory.lowStockCount}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-600"><ClipboardList className="h-4 w-4 text-slate-400" />Pending requisitions</span>
                  <strong className="text-[#080E29]">{stats.procurement.pendingRequisitions}</strong>
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Organization" href="/organization" linkLabel="View organization" />
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-slate-50 p-3">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-lg font-semibold tabular-nums text-[#080E29]">{stats.organization.totalBranches}</p>
                  <p className="text-[10px] text-slate-500">Branches</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <Users className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-lg font-semibold tabular-nums text-[#080E29]">{stats.organization.totalStaff}</p>
                  <p className="text-[10px] text-slate-500">Staff</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <Wrench className="h-4 w-4 text-slate-500" />
                  <p className="mt-2 text-lg font-semibold tabular-nums text-[#080E29]">{stats.organization.totalDepartments}</p>
                  <p className="text-[10px] text-slate-500">Departments</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-100 p-3 text-[11px] leading-relaxed text-slate-500">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Counts reflect active records returned by the organization service.
              </div>
            </Panel>
          </section>

          <section aria-label="Operational modules" className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <Panel>
              <SectionHeading title="Preventive maintenance" href="/preventive" linkLabel="Open maintenance plans" />
              <div className="flex items-start gap-3 rounded-md bg-slate-50 p-4">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1336]" />
                <p className="text-xs leading-relaxed text-slate-600">
                  Preventive maintenance schedules are managed in the maintenance module. The dashboard metrics endpoint does not provide schedule totals.
                </p>
              </div>
            </Panel>
            <Panel>
              <SectionHeading title="Financial position" href="/finance" linkLabel="Open finance" />
              <div className="space-y-3 text-xs">
                <p className="flex items-center justify-between gap-3 text-slate-600">
                  <span>Invoiced</span>
                  <strong className="text-[#080E29]">{formatCurrency(stats.finance.totalInvoicedAmount, currency)}</strong>
                </p>
                <p className="flex items-center justify-between gap-3 text-slate-600">
                  <span>Paid</span>
                  <strong className="text-emerald-700">{formatCurrency(stats.finance.paidAmount, currency)}</strong>
                </p>
                <p className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-slate-600">
                  <span>Outstanding</span>
                  <strong className="text-[#080E29]">{formatCurrency(stats.finance.outstandingReceivables, currency)}</strong>
                </p>
              </div>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
};
