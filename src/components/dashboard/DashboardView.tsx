'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Database,
  FileBarChart,
  Gauge,
  HardHat,
  Layers3,
  PackageSearch,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/src/lib/auth-context';
import {
  mockDashboardMetrics,
  mockRecentActivities,
  mockTrends,
  mockUpcomingPM,
  mockWorkOrders,
} from '@/src/lib/mockData';
import type { DashboardStatistics } from '@/src/lib/services/dashboardService';

const demoOperations = {
  overdueWorkOrders: 3,
  assetAvailability: 94.8,
  operationalAssets: 1354,
  assetsUnderMaintenance: 52,
  unavailableAssets: 22,
  criticalAssets: 6,
  lowStockItems: 8,
  outOfStockItems: 2,
  awaitingReplenishment: 4,
  completedPreventive: 18,
};

const demoInventoryAlerts = [
  { item: 'HVAC air filter, MERV 13', code: 'FLT-HVAC-013', available: '2 / 8', level: 'Low stock' },
  { item: 'Pump mechanical seal kit', code: 'KIT-PMP-008', available: '0 / 3', level: 'Out of stock' },
  { item: 'Generator oil filter', code: 'FLT-GEN-004', available: '1 / 6', level: 'Replenishment due' },
];

const formatGhs = (amount: number) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(amount);

function SectionHeading({
  eyebrow,
  title,
  detail,
  href,
  linkLabel,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {eyebrow}
          </p>
        )}
        <h2 className="text-base font-bold tracking-tight text-[#0B1336]">{title}</h2>
        {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:text-[#D94D00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B00]"
        >
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-600">{item.label}</span>
            <span className="tabular-nums font-semibold text-[#0B1336]">{item.value}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${item.label}: ${item.value}`}
          >
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value ? 3 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineStat({
  label,
  value,
  tone = 'navy',
}: {
  label: string;
  value: string | number;
  tone?: 'navy' | 'orange' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    navy: 'bg-slate-50 text-[#0B1336]',
    orange: 'bg-orange-50 text-[#D94D00]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className={`rounded-lg px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium leading-snug opacity-80">{label}</p>
    </div>
  );
}

function MetricLink({
  href,
  label,
  value,
  detail,
  status,
  icon,
  accentColor,
}: {
  href: string;
  label: string;
  value: string | number;
  detail: string;
  status: string;
  icon: LucideIcon;
  accentColor: 'orange' | 'navy' | 'emerald' | 'amber' | 'rose';
}) {
  const accent = {
    orange: {
      iconBg: 'bg-orange-50',
      iconText: 'text-[#E65200]',
      bar: 'bg-[#FF5B00]',
      dot: 'bg-[#FF5B00]',
      valueTone: 'text-[#0B1336]',
    },
    navy: {
      iconBg: 'bg-slate-100',
      iconText: 'text-[#0B1336]',
      bar: 'bg-[#0B1336]',
      dot: 'bg-[#0B1336]',
      valueTone: 'text-[#0B1336]',
    },
    emerald: {
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-700',
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-500',
      valueTone: 'text-emerald-700',
    },
    amber: {
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-700',
      bar: 'bg-amber-500',
      dot: 'bg-amber-500',
      valueTone: 'text-[#0B1336]',
    },
    rose: {
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-600',
      bar: 'bg-rose-500',
      dot: 'bg-rose-500',
      valueTone: 'text-rose-600',
    },
  }[accentColor];
  const Icon = icon;

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. ${detail}`}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B00]"
    >
      {/* Left accent bar */}
      <span className={`absolute bottom-0 left-0 top-0 w-0.5 ${accent.bar}`} />

      <div className="flex flex-col gap-3 px-4 py-3.5">
        {/* Icon + label */}
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[10px] font-bold uppercase leading-snug tracking-[0.1em] text-slate-400 pr-1">
            {label}
          </p>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.iconBg} ${accent.iconText}`}>
            <Icon className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden="true" />
          </span>
        </div>

        {/* Value */}
        <p className={`text-2xl font-bold leading-none tracking-tight tabular-nums ${accent.valueTone}`}>
          {value}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-400">{status}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-slate-200 transition-colors group-hover:text-[#FF5B00]" aria-hidden="true" />
        </div>
      </div>
    </Link>
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
      if (!response.ok) {
        throw new Error(`Organization data could not be loaded (HTTP ${response.status}).`);
      }
      const data = (await response.json()) as DashboardStatistics;
      setStats(data);
      setError(null);
    } catch (fetchError) {
      setStats(null);
      setError(fetchError instanceof Error ? fetchError.message : 'Organization data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const workOrderStatuses = [
    { label: 'Open', value: mockDashboardMetrics.openOrdersCount, color: 'bg-[#FF5B00]' },
    { label: 'In progress', value: mockDashboardMetrics.inProgressOrdersCount, color: 'bg-[#0B1336]' },
    { label: 'On hold', value: mockDashboardMetrics.onHoldOrdersCount, color: 'bg-amber-500' },
  ];

  const priorityBreakdown = useMemo(() => {
    const priorities = ['Urgent', 'High', 'Medium', 'Low'] as const;
    return priorities.map((priority) => ({
      label: priority,
      value: mockWorkOrders.filter((order) => order.priority === priority).length,
      color:
        priority === 'Urgent'
          ? 'bg-rose-600'
          : priority === 'High'
            ? 'bg-orange-500'
            : priority === 'Medium'
              ? 'bg-amber-400'
              : 'bg-slate-400',
    }));
  }, []);

  const dateLabel = new Intl.DateTimeFormat('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Administrator';
  const sortedPm = [...mockUpcomingPM].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
  const maxSpend = Math.max(...mockTrends.map((month) => month.spend));
  const sampledWorkOrderCost = mockWorkOrders.reduce((sum, order) => sum + order.actualCost, 0);

  return (
    <div className="min-w-0 space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl bg-[#0B1336] p-5 text-white shadow-sm sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-40 w-40 rounded-full border border-white/10" />
        <div className="relative z-10 flex min-w-0 flex-col items-start gap-5">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
              <Activity className="h-3.5 w-3.5 text-[#FF5B00]" />
              Operations overview
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {stats?.organization.companyName || 'ZemiFix CMMS'} · A clear view of today&apos;s maintenance priorities.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-[#FF5B00]" />
                {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-[#FF5B00]" />
                Branch: <strong className="font-semibold text-white">{selectedBranch}</strong>
              </span>
              {user?.accessScope && (
                <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                  {user.accessScope}
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2">
            {[
              { label: 'Create work order', href: '/work-orders', icon: Plus, primary: true },
              { label: 'Maintenance request', href: '/requests', icon: ClipboardList },
              { label: 'Register asset', href: '/assets', icon: Wrench },
              { label: 'View reports', href: '/reports', icon: FileBarChart },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    action.primary
                      ? 'bg-[#FF5B00] text-white hover:bg-[#E65200]'
                      : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-label="Demonstration data notice"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-amber-950">Operational figures are demonstration data</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
            Work orders, asset health, inventory, preventive maintenance, activities, and expenditure below are illustrative and are not live operational records. The branch scope is shown for context; demo figures are not branch-filtered.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchStats()}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{loading ? 'Refreshing' : 'Refresh organization data'}</span>
          <span className="sm:hidden" aria-label="Refresh organization data">{loading ? 'Loading' : 'Refresh'}</span>
        </button>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Organization overview unavailable</p>
            <p className="mt-1 text-xs text-rose-800">{error} Operational panels remain clearly labeled demo data.</p>
          </div>
        </div>
      )}

      <section aria-labelledby="kpi-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Maintenance snapshot · demo</p>
            <h2 id="kpi-heading" className="mt-1 text-base font-bold text-[#0B1336]">Operational KPIs</h2>
          </div>
          <span className="text-[11px] text-slate-500">Illustrative values · not connected to operational APIs</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-4">
          <MetricLink href="/work-orders" label="Open work orders" value={mockDashboardMetrics.openOrdersCount} status="Active queue" detail="Demo baseline" icon={ClipboardList} accentColor="navy" />
          <MetricLink href="/work-orders" label="Overdue work orders" value={demoOperations.overdueWorkOrders} status="Needs attention" detail="Requires attention" icon={Clock3} accentColor="rose" />
          <MetricLink href="/requests" label="Pending maintenance requests" value={mockDashboardMetrics.pendingRequests} status="Awaiting triage" detail="Awaiting triage" icon={AlertCircle} accentColor="amber" />
          <MetricLink href="/preventive" label="Preventive maintenance due" value={mockDashboardMetrics.overduePM} status="Past due" detail="Past due in demo baseline" icon={CalendarClock} accentColor="orange" />
          <MetricLink href="/assets" label="Asset availability" value={`${demoOperations.assetAvailability}%`} status="Fleet health" detail={`${demoOperations.operationalAssets.toLocaleString()} of ${mockDashboardMetrics.totalAssets.toLocaleString()} operational`} icon={Gauge} accentColor="emerald" />
          <MetricLink href="/assets" label="Critical assets" value={demoOperations.criticalAssets} status="Priority assets" detail="Flagged for attention" icon={ShieldAlert} accentColor="rose" />
          <MetricLink href="/inventory" label="Low stock items" value={demoOperations.lowStockItems} status="Restock review" detail={`${demoOperations.outOfStockItems} out of stock`} icon={PackageSearch} accentColor="amber" />
          <MetricLink href="/finance" label="Maintenance expenditure" value={formatGhs(mockDashboardMetrics.monthlyExpenditure)} status="Month to date" detail="Demo total · this month" icon={CircleDollarSign} accentColor="orange" />
        </div>
      </section>

      <section aria-labelledby="work-overview-heading">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Execution and priorities</p>
          <h2 id="work-overview-heading" className="mt-1 text-base font-bold text-[#0B1336]">Work order overview</h2>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel>
            <SectionHeading title="Work orders by status" detail="Active order breakdown · demo baseline" href="/work-orders" linkLabel="Work orders" />
            <HorizontalBars items={workOrderStatuses} />
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              {mockDashboardMetrics.activeWorkOrders} active work orders in the illustrative snapshot.
            </p>
          </Panel>

          <Panel>
            <SectionHeading title="Work orders by priority" detail={`${mockWorkOrders.length} sample records`} href="/work-orders" linkLabel="View queue" />
            <HorizontalBars items={priorityBreakdown} />
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-600" />Urgent</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />High</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Medium</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Low</span>
            </div>
          </Panel>

          <Panel>
            <SectionHeading title="Open vs completed" detail="Current open queue and completed this month" href="/reports" linkLabel="Reports" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-800">Open</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[#0B1336]">{mockDashboardMetrics.openOrdersCount}</p>
                <p className="mt-1 text-[10px] text-slate-500">Orders in queue</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Completed</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[#0B1336]">{mockDashboardMetrics.completedThisMonth}</p>
                <p className="mt-1 text-[10px] text-slate-500">This month</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600">Overdue work orders</span>
                <span className="font-bold tabular-nums text-rose-700">{demoOperations.overdueWorkOrders}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                <div className="h-1.5 rounded-full bg-rose-500" style={{ width: '18%' }} />
              </div>
            </div>
          </Panel>
        </div>
      </section>

      <section aria-label="Maintenance and asset health" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeading
            eyebrow="Planned maintenance · demo"
            title="Preventive maintenance"
            detail={`${mockUpcomingPM.length} sample schedules · ${mockDashboardMetrics.overduePM} due in baseline`}
            href="/preventive"
            linkLabel="Maintenance plans"
          />
          <div className="mb-4 grid grid-cols-3 gap-2">
            <InlineStat label="Upcoming schedules" value={mockUpcomingPM.length} />
            <InlineStat label="Overdue" value={mockUpcomingPM.filter((item) => item.isOverdue).length} tone="rose" />
            <InlineStat label="Completed this month" value={demoOperations.completedPreventive} tone="emerald" />
          </div>
          <div className="divide-y divide-slate-100">
            {sortedPm.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3 first:pt-1 last:pb-0">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-[#0B1336]'}`}>
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-slate-800">{item.planName}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-500">{item.assetName} · {item.assetTag}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{item.assignedTeam} · {item.estimatedHours} hrs</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                  {item.isOverdue ? 'Overdue' : item.dueDate}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
            <span className="font-semibold text-[#0B1336]">Next scheduled: </span>
            <span className="text-slate-600">
              {sortedPm.find((item) => !item.isOverdue)?.planName || 'No upcoming maintenance in the sample'}
            </span>
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Equipment registry · demo"
            title="Asset health"
            detail={`${mockDashboardMetrics.totalAssets.toLocaleString()} registered assets in sample baseline`}
            href="/assets"
            linkLabel="Asset register"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InlineStat label="Registered assets" value={mockDashboardMetrics.totalAssets.toLocaleString()} />
            <InlineStat label="Operational" value={demoOperations.operationalAssets.toLocaleString()} tone="emerald" />
            <InlineStat label="Under maintenance" value={demoOperations.assetsUnderMaintenance} tone="amber" />
            <InlineStat label="Unavailable" value={demoOperations.unavailableAssets} tone="rose" />
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[6px] border-emerald-100 bg-white text-center">
              <div>
                <p className="text-sm font-bold text-[#0B1336]">{demoOperations.assetAvailability}%</p>
                <p className="text-[8px] font-semibold uppercase text-slate-400">Available</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0B1336]">Fleet availability</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Illustrative availability across the sample equipment register. Actual asset condition and availability are not connected.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="text-slate-600">Critical assets requiring attention</span>
                <span className="ml-auto font-bold tabular-nums text-rose-700">{demoOperations.criticalAssets}</span>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section aria-label="Inventory and maintenance expenditure" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <SectionHeading
            eyebrow="Stores and replenishment · demo"
            title="Inventory alerts"
            detail={`${demoOperations.lowStockItems} low-stock items · ${demoOperations.outOfStockItems} out of stock`}
            href="/inventory"
            linkLabel="Inventory & stock"
          />
          <div className="mb-4 grid grid-cols-3 gap-2">
            <InlineStat label="Low stock" value={demoOperations.lowStockItems} tone="amber" />
            <InlineStat label="Out of stock" value={demoOperations.outOfStockItems} tone="rose" />
            <InlineStat label="Awaiting replenishment" value={demoOperations.awaitingReplenishment} tone="orange" />
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-100">
            {demoInventoryAlerts.map((item) => (
              <div key={item.code} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Boxes className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{item.item}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-600">{item.available}</p>
                  <p className={`mt-0.5 text-[10px] font-semibold ${item.level === 'Out of stock' ? 'text-rose-700' : 'text-amber-700'}`}>{item.level}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Recent stock movements</p>
            <p className="mt-1 text-xs text-slate-500">No movement feed is connected to the demonstration dataset.</p>
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            eyebrow="Cost control · demo"
            title="Maintenance expenditure"
            detail="Monthly spend trend · GHS"
            href="/finance"
            linkLabel="Finance & billing"
          />
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-[#0B1336] p-4 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">This month</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{formatGhs(mockDashboardMetrics.monthlyExpenditure)}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-100">
              <ArrowUpRight className="h-3 w-3 text-[#FF5B00]" />
              Monthly demo total
            </span>
          </div>
          <div className="mt-5">
            <div className="flex h-36 items-end gap-2 border-b border-slate-200 px-1">
              {mockTrends.map((month) => (
                <div key={month.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-center text-[9px] tabular-nums text-slate-500">
                    {(month.spend / 1000).toFixed(0)}k
                  </span>
                  <div
                    className="w-full max-w-10 rounded-t bg-[#FF5B00] transition-colors hover:bg-[#E65200]"
                    style={{ height: `${Math.max((month.spend / maxSpend) * 78, 4)}%` }}
                    role="img"
                    aria-label={`${month.month}: ${formatGhs(month.spend)}`}
                  />
                  <span className="text-[10px] font-medium text-slate-500">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 p-3">
              <p className="text-[10px] font-medium text-slate-500">Sample work order costs</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-[#0B1336]">{formatGhs(sampledWorkOrderCost)}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{mockWorkOrders.length} sample records</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 p-3">
              <p className="text-[10px] font-medium text-slate-500">Preventive vs corrective</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Not classified in the demo data</p>
            </div>
          </div>
        </Panel>
      </section>

      <section aria-label="Recent maintenance activity" className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <SectionHeading
            eyebrow="Recent events · demo"
            title="Activity and audit trail"
            detail="Recent sample records with actor, reference, and time"
            href="/reports"
            linkLabel="View reports"
          />
          <div className="divide-y divide-slate-100">
            {mockRecentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#0B1336]">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-xs font-semibold text-slate-800">{activity.action}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-600">{activity.entityNumber}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{activity.summary}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {activity.userName} · {activity.userRole} · {activity.entityType}
                  </p>
                </div>
                <span className="shrink-0 pt-0.5 text-[10px] text-slate-400">{activity.at}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <SectionHeading
            eyebrow="Team performance · live organization counts"
            title="Organization overview"
            detail={stats?.organization.companyName || 'Company directory and access scope'}
            href="/organization"
            linkLabel="Organization"
          />
          <div className="grid grid-cols-3 gap-2">
            <InlineStat label="Branches" value={loading ? '—' : stats?.organization.totalBranches ?? '—'} />
            <InlineStat label="Departments" value={loading ? '—' : stats?.organization.totalDepartments ?? '—'} />
            <InlineStat label="Staff" value={loading ? '—' : stats?.organization.totalStaff ?? '—'} />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-700">Branches</h3>
                <span className="text-[10px] text-slate-400">{stats?.organization.baseCurrency || 'GHS'} base currency</span>
              </div>
              {loading ? (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">Loading branch directory…</p>
              ) : stats?.organization.branchesList.length ? (
                <div className="space-y-1.5">
                  {stats.organization.branchesList.slice(0, 4).map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{branch.name}</span>
                      <span className="shrink-0 font-mono text-[9px] text-slate-400">{branch.code}</span>
                    </div>
                  ))}
                  {stats.organization.branchesList.length > 4 && (
                    <p className="text-right text-[10px] text-slate-500">+{stats.organization.branchesList.length - 4} more branches</p>
                  )}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  {error ? 'Branch directory is unavailable.' : 'No branches have been configured.'}
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 flex items-center gap-2">
                <Layers3 className="h-3.5 w-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-700">Departments</h3>
              </div>
              {loading ? (
                <p className="text-xs text-slate-500">Loading department directory…</p>
              ) : stats?.organization.departmentsList.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {stats.organization.departmentsList.slice(0, 5).map((department) => (
                    <span key={department.id} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600" title={department.name}>
                      {department.code}
                    </span>
                  ))}
                  {stats.organization.departmentsList.length > 5 && (
                    <span className="px-1 py-1 text-[10px] text-slate-400">+{stats.organization.departmentsList.length - 5}</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">{error ? 'Department directory is unavailable.' : 'No departments have been configured.'}</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px]">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Database className="h-3.5 w-3.5" />
              Organization source
            </span>
            <span className={`rounded-full px-2 py-1 font-semibold ${stats?.source === 'database' ? 'bg-emerald-50 text-emerald-700' : stats ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
              {loading ? 'Loading' : stats?.source === 'database' ? 'Live database' : stats ? 'Demo organization' : 'Unavailable'}
            </span>
          </div>
        </Panel>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5" />
          ZemiFix CMMS · Maintenance operations
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" />Live organization directory</span>
          <span className="inline-flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-amber-600" />Operational demo snapshot</span>
          <Link href="/reports" className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-[#FF5B00]">
            Reports <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
