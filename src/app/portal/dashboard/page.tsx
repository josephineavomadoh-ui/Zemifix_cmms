'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardList,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Logo } from '@/src/components/brand/Logo';
import { NotificationHub } from '@/src/components/notifications/NotificationHub';

interface PortalWorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  status: string;
  priority: string;
  site?: { name?: string } | null;
}

interface PortalDashboardData {
  workOrdersCount: number;
  quotesCount: number;
  pendingQuotesCount: number;
  recentWorkOrders: PortalWorkOrder[];
}

export default function CustomerPortalDashboardPage() {
  const [stats, setStats] = useState<PortalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/portal/dashboard');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Unable to load portal data (HTTP ${response.status}).`);
      }
      setStats(data as PortalDashboardData);
      setError(null);
    } catch (loadError) {
      setStats(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load portal data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/portal/dashboard" aria-label="ZemiFix customer portal">
            <Logo variant="light" width={142} height={55} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">Customer portal</span>
            <NotificationHub realm="portal" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4 text-[#FF5B00]" />
              Customer workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#080E29]">Service overview</h1>
            <p className="mt-1 text-sm text-slate-500">Track work orders and review quotes for your authorized sites.</p>
          </div>
          <Link
            href="/portal/work-orders"
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#FF5B00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#F95700]"
          >
            <ClipboardList className="h-4 w-4" />
            View work orders
          </Link>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <ShieldCheck className="h-4 w-4 shrink-0 text-rose-600" />
            <p className="min-w-0 flex-1 text-xs">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          </div>
        )}

        <section aria-label="Portal summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading && !stats ? (
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
            ))
          ) : stats ? (
            [
              { label: 'Active work orders', value: stats.workOrdersCount, icon: ClipboardList },
              { label: 'Customer quotes', value: stats.quotesCount, icon: FileText },
              { label: 'Quotes awaiting decision', value: stats.pendingQuotesCount, icon: ShieldCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-50 text-[#D94D00]">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-[#080E29]">{value}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              Portal metrics are unavailable until the dashboard request succeeds.
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-[#080E29]">Recent work orders</h2>
              <p className="mt-1 text-xs text-slate-500">Latest work across your authorized customer sites.</p>
            </div>
            <Link href="/portal/work-orders" className="inline-flex items-center gap-1 text-xs font-semibold text-[#D94D00] hover:text-[#C94400]">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500">Loading work orders…</div>
          ) : error ? (
            <div className="p-10 text-center text-xs text-slate-500">Work orders are unavailable because the portal request failed.</div>
          ) : !stats?.recentWorkOrders.length ? (
            <div className="p-10 text-center">
              <ClipboardList className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-700">No work orders found</p>
              <p className="mt-1 text-[11px] text-slate-500">Work orders for your sites will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Work order</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentWorkOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href="/portal/work-orders" className="font-semibold text-[#0B1336] hover:text-[#D94D00]">{order.workOrderNumber}</Link>
                        <p className="mt-1 max-w-xs truncate text-[11px] text-slate-500">{order.title}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{order.site?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{order.priority.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                          {order.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
