'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { NotificationHub } from '@/src/components/notifications/NotificationHub';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function CustomerPortalWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/portal/work-orders')
      .then((res) => res.json())
      .then((data) => setWorkOrders(data.workOrders ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Portal topbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#080E29] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Portal Dashboard
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#FF5B00]" />
            <h1 className="text-base font-semibold text-[#080E29]">Work Order Live Tracking</h1>
          </div>
        </div>
        <NotificationHub realm="portal" dark={false} />
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <LoadingSkeleton rows={6} columns={6} />
          ) : workOrders.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No active work orders"
              description="There are no work orders currently associated with your sites."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>WO Number</th>
                    <th className={thClass}>Site / Facility</th>
                    <th className={thClass}>Title & Description</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Comments</th>
                    <th className={thClass}>Attachments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{wo.workOrderNumber}</td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{wo.site?.name}</td>
                      <td className={tdClass}>
                        <div className="font-semibold text-slate-800">{wo.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{wo.description}</div>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className={`${tdClass} font-mono text-slate-600`}>{wo.comments?.length ?? 0} comments</td>
                      <td className={`${tdClass} font-mono text-slate-600`}>{wo.attachments?.length ?? 0} files</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
