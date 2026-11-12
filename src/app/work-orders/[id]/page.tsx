'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ClipboardList, Clock, Boxes,
  CheckCircle2, PauseCircle, PlayCircle, XCircle, AlertCircle,
} from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';
import { LaborRecordModal } from '@/src/components/work-orders/LaborRecordModal';
import { PartRequirementModal } from '@/src/components/work-orders/PartRequirementModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';

export default function WorkOrderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'labor' | 'parts' | 'history'>('overview');

  const [isLaborModalOpen, setIsLaborModalOpen] = useState<boolean>(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);

  const fetchWorkOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/work-orders/${id}`);
      const data = await res.json();
      if (res.ok) setWo(data.workOrder);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrderDetail();
  }, [id]);

  const handleStatusTransition = async (newStatus: string, reason?: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/work-orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, reason }),
      });

      if (res.ok) {
        fetchWorkOrderDetail();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16">
        <EmptyState
          icon={ClipboardList}
          title="Work order not found"
          description="This work order may have been removed or you may not have access."
          action={
            <Link
              href="/work-orders"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#F95700]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Work Orders
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview & Execution' },
    { key: 'labor',    label: `Labor Hours (${wo.labor?.length ?? 0})` },
    { key: 'parts',    label: `Materials & Parts (${wo.parts?.length ?? 0})` },
    { key: 'history',  label: 'Status History' },
  ] as const;

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Work Orders"
        eyebrowIcon={ClipboardList}
        title={wo.title}
        breadcrumbs={[
          { label: 'Work Orders', href: '/work-orders' },
          { label: wo.workOrderNumber },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {wo.status === 'OPEN' && (
              <button
                onClick={() => handleStatusTransition('IN_PROGRESS')}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" /> Start Work
              </button>
            )}

            {wo.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => handleStatusTransition('ON_HOLD', 'Waiting for parts / supervisor')}
                  disabled={statusUpdating}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  <PauseCircle className="h-4 w-4" /> Pause Work
                </button>
                <button
                  onClick={() => handleStatusTransition('COMPLETED')}
                  disabled={statusUpdating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Complete
                </button>
              </>
            )}

            {wo.status === 'ON_HOLD' && (
              <button
                onClick={() => handleStatusTransition('IN_PROGRESS')}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" /> Resume Work
              </button>
            )}

            {wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  const reason = prompt('Cancellation reason:');
                  if (reason) handleStatusTransition('CANCELLED', reason);
                }}
                disabled={statusUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        }
      />

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-1.5"><WorkOrderStatusBadge status={wo.status} /></div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Priority</p>
          <div className="mt-1.5"><WorkOrderPriorityBadge priority={wo.priority} /></div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700">{wo.type}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assigned Tech</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700">{wo.assignedUser?.name ?? 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Cost</p>
          <p className="mt-1.5 text-sm font-mono font-bold text-emerald-700">GHS {wo.totalCost}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Work order tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-[#FF5B00] text-[#FF5B00]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description & Work Scope</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{wo.description}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location & Context</h3>
            <dl className="space-y-3">
              {[
                { label: 'Asset', value: wo.asset ? `${wo.asset.name} (${wo.asset.assetTag})` : 'N/A' },
                { label: 'Location', value: wo.location?.name ?? 'N/A' },
                { label: 'Branch', value: wo.branch?.name },
                { label: 'Supervisor', value: wo.supervisorUser?.name ?? 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-400 font-medium">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'labor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Labor Hours Logged</h3>
            <button
              onClick={() => setIsLaborModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              Record Labor Hours
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {wo.labor?.length === 0 ? (
              <EmptyState icon={Clock} title="No labor hours logged yet" description="Record the hours technicians have worked on this work order." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className={thClass}>Technician</th>
                      <th className={thClass}>Work Date</th>
                      <th className={thClass}>Hours</th>
                      <th className={thClass}>Cost Rate</th>
                      <th className={thClass}>Subtotal</th>
                      <th className={thClass}>Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wo.labor.map((lb: any) => (
                      <tr key={lb.id} className="hover:bg-slate-50 transition-colors">
                        <td className={`${tdClass} font-medium text-slate-800`}>{lb.technicianUser?.name}</td>
                        <td className={`${tdClass} text-slate-500`}>{new Date(lb.workDate).toLocaleDateString()}</td>
                        <td className={`${tdClass} font-mono text-slate-700`}>{lb.hoursWorked} hrs</td>
                        <td className={`${tdClass} font-mono text-slate-500`}>GHS {lb.hourlyRate}</td>
                        <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {lb.totalCost}</td>
                        <td className={`${tdClass} text-slate-500`}>{lb.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Parts & Material Requirements</h3>
            <button
              onClick={() => setIsPartModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
            >
              <Boxes className="h-3.5 w-3.5" />
              Add Material Requirement
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {wo.parts?.length === 0 ? (
              <EmptyState icon={Boxes} title="No parts recorded" description="Add the parts and materials required to complete this work order." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className={thClass}>Part Number</th>
                      <th className={thClass}>Name</th>
                      <th className={thClass}>Qty Planned</th>
                      <th className={thClass}>Qty Consumed</th>
                      <th className={thClass}>Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wo.parts.map((pt: any) => (
                      <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                        <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{pt.partNumber}</td>
                        <td className={`${tdClass} font-medium text-slate-800`}>{pt.partName}</td>
                        <td className={`${tdClass} font-mono text-slate-700`}>{pt.quantityPlanned} {pt.uom}</td>
                        <td className={`${tdClass} font-mono text-emerald-700 font-semibold`}>{pt.quantityConsumed} {pt.uom}</td>
                        <td className={`${tdClass} font-mono text-slate-700`}>GHS {pt.unitCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Status History Log</h3>
          {!wo.statusHistory?.length ? (
            <EmptyState icon={AlertCircle} title="No status transitions recorded yet" />
          ) : (
            <div className="space-y-2">
              {wo.statusHistory.map((sh: any) => (
                <div key={sh.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs">
                  <span className="font-mono text-slate-400">{new Date(sh.changedAt).toLocaleString()}</span>
                  <span className="text-slate-400">{sh.fromStatus}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-semibold text-slate-700">{sh.toStatus}</span>
                  <span className="text-slate-500">by {sh.changedByUser?.name}</span>
                  {sh.reason && <span className="ml-auto italic text-slate-400">{sh.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LaborRecordModal
        workOrderId={wo.id}
        workOrderNumber={wo.workOrderNumber}
        isOpen={isLaborModalOpen}
        onClose={() => setIsLaborModalOpen(false)}
        onSubmitSuccess={fetchWorkOrderDetail}
      />

      <PartRequirementModal
        workOrderId={wo.id}
        workOrderNumber={wo.workOrderNumber}
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        onSubmitSuccess={fetchWorkOrderDetail}
      />
    </div>
  );
}
