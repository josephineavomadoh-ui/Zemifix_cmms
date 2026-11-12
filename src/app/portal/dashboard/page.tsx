'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, FileText, ShoppingCart, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { NotificationHub } from '@/src/components/notifications/NotificationHub';

export default function CustomerPortalDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/portal/dashboard')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-orange" />
            Customer Self-Service Portal Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time field maintenance progress, active service level agreements, and pending commercial quotes.
          </p>
        </div>
        <NotificationHub realm="portal" dark />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Work Orders</div>
          <div className="text-3xl font-bold text-white">{stats?.workOrdersCount ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Commercial Quotes</div>
          <div className="text-3xl font-bold text-white">{stats?.quotesCount ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quotes Awaiting Decision</div>
          <div className="text-3xl font-bold text-amber-400">{stats?.pendingQuotesCount ?? 0}</div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white">Recent Customer Work Orders</h2>
          <Link href="/portal/work-orders" className="text-xs font-medium text-brand-orange hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading portal dashboard...</div>
        ) : stats?.recentWorkOrders?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No work orders recorded for your sites.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Work Order #</th>
                  <th className="p-3.5">Site</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(stats?.recentWorkOrders ?? []).map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{wo.workOrderNumber}</td>
                    <td className="p-3.5 font-medium text-white">{wo.site?.name}</td>
                    <td className="p-3.5 text-slate-300">{wo.title}</td>
                    <td className="p-3.5 font-mono text-amber-400">{wo.priority}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                        {wo.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
