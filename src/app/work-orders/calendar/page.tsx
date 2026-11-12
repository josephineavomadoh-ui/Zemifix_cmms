'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Wrench } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';

export default function WorkOrderSchedulePage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/work-orders')
      .then((res) => res.json())
      .then((data) => setWorkOrders(data.workOrders ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link href="/work-orders" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Work Orders List
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-brand-orange" /> Work Order Schedule & Technician Workload
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workload Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Technician Workload Summary</h3>
          {loading ? (
            <div className="text-xs text-slate-500 py-4">Loading workload metrics...</div>
          ) : (
            <div className="space-y-3">
              {Array.from(
                new Set(workOrders.map((w) => w.assignedUser?.name).filter(Boolean))
              ).map((techName) => {
                const techOrders = workOrders.filter((w) => w.assignedUser?.name === techName);
                const activeOrders = techOrders.filter((w) => w.status === 'ASSIGNED' || w.status === 'IN_PROGRESS');

                return (
                  <div key={techName as string} className="bg-slate-800/50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-800">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-brand-orange" />
                      <span className="font-medium text-white">{techName as string}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">
                        {activeOrders.length} active
                      </span>
                      <span className="text-slate-500">({techOrders.length} total)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule Timeline */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Upcoming & Scheduled Maintenance</h3>
          {loading ? (
            <div className="text-xs text-slate-500 py-8 text-center">Loading schedule timeline...</div>
          ) : workOrders.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">No scheduled work orders.</div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <div key={wo.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-orange">{wo.workOrderNumber}</span>
                      <WorkOrderStatusBadge status={wo.status} size="sm" />
                      <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                    </div>
                    <div className="font-medium text-sm text-white">{wo.title}</div>
                    <div className="text-slate-400 flex items-center gap-3">
                      {wo.asset && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-500" /> {wo.asset.name}
                        </span>
                      )}
                      {wo.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" /> {wo.assignedUser.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors inline-block"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
