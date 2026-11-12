'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { NotificationHub } from '@/src/components/notifications/NotificationHub';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/portal/dashboard" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-brand-orange" /> Work Order Live Tracking
          </h1>
        </div>
        <NotificationHub realm="portal" dark />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading field work orders...</div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No active work orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">WO Number</th>
                  <th className="p-3.5">Site / Facility</th>
                  <th className="p-3.5">Title & Description</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Customer Comments</th>
                  <th className="p-3.5">Customer Attachments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{wo.workOrderNumber}</td>
                    <td className="p-3.5 font-medium text-white">{wo.site?.name}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{wo.title}</div>
                      <div className="text-slate-400">{wo.description}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{wo.comments?.length ?? 0} comments</td>
                    <td className="p-3.5 font-mono text-slate-300">{wo.attachments?.length ?? 0} files</td>
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
