'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, User, Wrench } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work Orders"
        eyebrowIcon={CalendarIcon}
        title="Work Order Schedule & Technician Workload"
        description="View scheduled work orders and technician assignments at a glance."
        breadcrumbs={[
          { label: 'Work Orders', href: '/work-orders' },
          { label: 'Calendar' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workload Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Technician Workload</h3>
          {loading ? (
            <LoadingSkeleton rows={4} columns={2} />
          ) : (
            <div className="space-y-2">
              {Array.from(
                new Set(workOrders.map((w) => w.assignedUser?.name).filter(Boolean))
              ).map((techName) => {
                const techOrders = workOrders.filter((w) => w.assignedUser?.name === techName);
                const activeOrders = techOrders.filter((w) => w.status === 'ASSIGNED' || w.status === 'IN_PROGRESS');

                return (
                  <div
                    key={techName as string}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#FF5B00]" />
                      <span className="font-medium text-slate-700">{techName as string}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                        {activeOrders.length} active
                      </span>
                      <span className="text-slate-400">({techOrders.length} total)</span>
                    </div>
                  </div>
                );
              })}
              {workOrders.filter((w) => w.assignedUser).length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">No technicians assigned yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Schedule Timeline */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming & Scheduled Maintenance</h3>
          {loading ? (
            <LoadingSkeleton rows={6} columns={3} />
          ) : workOrders.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="No scheduled work orders" description="Create work orders to populate the schedule." />
          ) : (
            <div className="space-y-3">
              {workOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#FF5B00] text-xs">{wo.workOrderNumber}</span>
                      <WorkOrderStatusBadge status={wo.status} size="sm" />
                      <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                    </div>
                    <div className="font-medium text-sm text-slate-800">{wo.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {wo.asset && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" /> {wo.asset.name}
                        </span>
                      )}
                      {wo.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {wo.assignedUser.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/work-orders/${wo.id}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    Inspect
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
