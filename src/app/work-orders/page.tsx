'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, ClipboardList, MapPin, Wrench, User, Calendar } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/work-orders');
      const data = await res.json();
      if (res.ok) {
        setWorkOrders(data.workOrders ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch work orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, typeFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-brand-orange" />
            Work Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Comprehensive corrective, preventive, and emergency maintenance lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Maintenance Requests
          </Link>
          <Link
            href="/work-orders/new"
            className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/10"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            <option value="">All Work Order Types</option>
            <option value="CORRECTIVE">Corrective Maintenance</option>
            <option value="PREVENTIVE">Preventive Maintenance</option>
            <option value="EMERGENCY">Emergency Breakdown</option>
            <option value="INSPECTION">Inspection / Safety</option>
            <option value="GENERAL">General Support</option>
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div>No work orders found.</div>
            <div className="text-xs text-slate-500">Create a work order or convert a maintenance request.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="py-3.5 px-4">WO Number</th>
                  <th className="py-3.5 px-4">Title / Type</th>
                  <th className="py-3.5 px-4">Asset / Location</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {workOrders
                  .filter((wo) => (!statusFilter || wo.status === statusFilter) && (!typeFilter || wo.type === typeFilter))
                  .map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-brand-orange">
                        <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                          {wo.workOrderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{wo.title}</div>
                        <div className="text-xs text-slate-400">{wo.type}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {wo.asset ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{wo.asset.name}</span>
                          </div>
                        ) : wo.location ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{wo.location.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Facility Wide</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {wo.assignedUser ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{wo.assignedUser.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <WorkOrderStatusBadge status={wo.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors"
                        >
                          Workspace
                        </Link>
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
