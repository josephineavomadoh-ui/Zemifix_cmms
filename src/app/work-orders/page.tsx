'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, ClipboardList, MapPin, Wrench, User, Calendar } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';

export default function WorkOrdersListPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/work-orders');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Unable to load work orders (HTTP ${res.status}).`);
      }
      setWorkOrders(data.workOrders ?? []);
      setError(null);
    } catch (err) {
      setWorkOrders([]);
      setError(err instanceof Error ? err.message : 'Unable to load work orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkOrders();
  }, [fetchWorkOrders]);

  const filteredWorkOrders = workOrders.filter((wo) => {
    const query = search.trim().toLowerCase();
    const matchesText =
      !query ||
      [wo.workOrderNumber, wo.title, wo.asset?.name, wo.location?.name, wo.assignedUser?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    return matchesText && (!statusFilter || wo.status === statusFilter) && (!typeFilter || wo.type === typeFilter);
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#080E29]">
            <ClipboardList className="h-6 w-6 text-[#FF5B00]" />
            Work Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Comprehensive corrective, preventive, and emergency maintenance lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Maintenance Requests
          </Link>
          <Link
            href="/work-orders/new"
            className="flex items-center gap-2 rounded-md bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#F95700]"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search work orders"
            aria-label="Search work orders"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#FF5B00] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-[#FF5B00] focus:outline-none"
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
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-[#FF5B00] focus:outline-none"
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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading work orders…</div>
        ) : error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm font-semibold text-rose-700">Work orders could not be loaded</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button type="button" onClick={() => void fetchWorkOrders()} className="mt-3 text-xs font-semibold text-[#D94D00] hover:underline">Try again</button>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="space-y-2 p-12 text-center text-sm text-slate-500">
            <div>{search || statusFilter || typeFilter ? 'No work orders match these filters.' : 'No work orders found.'}</div>
            <div className="text-xs text-slate-500">Create a work order or convert a maintenance request.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">WO Number</th>
                  <th className="px-4 py-3.5">Title / Type</th>
                  <th className="px-4 py-3.5">Asset / Location</th>
                  <th className="px-4 py-3.5">Assigned To</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredWorkOrders.map((wo) => (
                    <tr key={wo.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-mono font-medium text-[#D94D00]">
                        <Link href={`/work-orders/${wo.id}`} className="hover:underline">
                          {wo.workOrderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{wo.title}</div>
                        <div className="text-xs text-slate-500">{wo.type}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {wo.asset ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{wo.asset.name}</span>
                          </div>
                        ) : wo.location ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{wo.location.name}</span>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">Facility Wide</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {wo.assignedUser ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{wo.assignedUser.name}</span>
                          </div>
                        ) : (
                          <span className="italic text-slate-500">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <WorkOrderStatusBadge status={wo.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#080E29]"
                        >
                          Workspace
                        </Link>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
              Showing {filteredWorkOrders.length} of {workOrders.length} work orders
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
