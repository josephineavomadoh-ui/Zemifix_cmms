'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Wrench, MapPin, User, Clock, Boxes, CheckCircle2, PauseCircle, PlayCircle, XCircle } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';
import { LaborRecordModal } from '@/src/components/work-orders/LaborRecordModal';
import { PartRequirementModal } from '@/src/components/work-orders/PartRequirementModal';

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
    return <div className="p-12 text-center text-slate-400 text-sm">Loading work order workspace...</div>;
  }

  if (!wo) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-4">
        <div>Work order not found or access restricted.</div>
        <Link href="/work-orders" className="text-brand-orange hover:underline text-xs">
          Return to Work Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link href="/work-orders" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Work Orders List
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>{wo.title}</span>
            <span className="text-sm font-mono font-medium text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded">
              {wo.workOrderNumber}
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {wo.status === 'OPEN' && (
            <button
              onClick={() => handleStatusTransition('IN_PROGRESS')}
              disabled={statusUpdating}
              className="px-3.5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" /> Start Work
            </button>
          )}

          {wo.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleStatusTransition('ON_HOLD', 'Waiting for parts / supervisor')}
                disabled={statusUpdating}
                className="px-3.5 py-2 text-sm font-medium bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" /> Pause Work
              </button>
              <button
                onClick={() => handleStatusTransition('COMPLETED')}
                disabled={statusUpdating}
                className="px-3.5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Complete Work Order
              </button>
            </>
          )}

          {wo.status === 'ON_HOLD' && (
            <button
              onClick={() => handleStatusTransition('IN_PROGRESS')}
              disabled={statusUpdating}
              className="px-3.5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" /> Resume Work
            </button>
          )}

          {wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED' && (
            <button
              onClick={() => {
                const reason = prompt('Cancellation reason:');
                if (reason) handleStatusTransition('CANCELLED', reason);
              }}
              disabled={statusUpdating}
              className="px-3 py-2 text-sm font-medium bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs">
        <div>
          <div className="text-slate-500 font-medium uppercase tracking-wider">Status</div>
          <div className="mt-1"><WorkOrderStatusBadge status={wo.status} /></div>
        </div>
        <div>
          <div className="text-slate-500 font-medium uppercase tracking-wider">Priority</div>
          <div className="mt-1"><WorkOrderPriorityBadge priority={wo.priority} /></div>
        </div>
        <div>
          <div className="text-slate-500 font-medium uppercase tracking-wider">Type</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{wo.type}</div>
        </div>
        <div>
          <div className="text-slate-500 font-medium uppercase tracking-wider">Assigned Tech</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{wo.assignedUser?.name ?? 'Unassigned'}</div>
        </div>
        <div>
          <div className="text-slate-500 font-medium uppercase tracking-wider">Total Cost</div>
          <div className="mt-1 text-sm font-mono font-bold text-emerald-400">GHS {wo.totalCost}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Overview & Execution
        </button>
        <button
          onClick={() => setActiveTab('labor')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'labor' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Labor Hours ({wo.labor?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('parts')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'parts' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Materials & Parts ({wo.parts?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-brand-orange text-brand-orange font-semibold' : 'border-transparent hover:text-slate-200'
          }`}
        >
          Status History
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Description & Work Scope</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{wo.description}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Location & Context</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-slate-500">Asset</dt>
                <dd className="font-medium text-slate-200">
                  {wo.asset ? `${wo.asset.name} (${wo.asset.assetTag})` : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="font-medium text-slate-200">{wo.location?.name ?? 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Branch</dt>
                <dd className="font-medium text-slate-200">{wo.branch?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Supervisor</dt>
                <dd className="font-medium text-slate-200">{wo.supervisorUser?.name ?? 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'labor' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-300">Labor Hours Logged</h3>
            <button
              onClick={() => setIsLaborModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Record Labor Hours
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {wo.labor?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No labor hours logged yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Work Date</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Cost Rate</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {wo.labor.map((lb: any) => (
                    <tr key={lb.id}>
                      <td className="p-3 font-medium text-white">{lb.technicianUser?.name}</td>
                      <td className="p-3 text-slate-400">{new Date(lb.workDate).toLocaleDateString()}</td>
                      <td className="p-3 font-mono text-slate-200">{lb.hoursWorked} hrs</td>
                      <td className="p-3 font-mono text-slate-400">GHS {lb.hourlyRate}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">GHS {lb.totalCost}</td>
                      <td className="p-3 text-slate-400">{lb.description ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-300">Parts & Material Requirements</h3>
            <button
              onClick={() => setIsPartModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5" />
              Add Material Requirement
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {wo.parts?.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No parts recorded.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Part Number</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Qty Planned</th>
                    <th className="p-3">Qty Consumed</th>
                    <th className="p-3">Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {wo.parts.map((pt: any) => (
                    <tr key={pt.id}>
                      <td className="p-3 font-mono font-medium text-brand-orange">{pt.partNumber}</td>
                      <td className="p-3 font-medium text-white">{pt.partName}</td>
                      <td className="p-3 font-mono text-slate-300">{pt.quantityPlanned} {pt.uom}</td>
                      <td className="p-3 font-mono text-emerald-400">{pt.quantityConsumed} {pt.uom}</td>
                      <td className="p-3 font-mono text-slate-300">GHS {pt.unitCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Status History Log</h3>
          <div className="space-y-3">
            {wo.statusHistory?.map((sh: any) => (
              <div key={sh.id} className="flex items-center gap-3 text-xs border-b border-slate-800/60 pb-2">
                <span className="text-slate-500 font-mono">{new Date(sh.changedAt).toLocaleString()}</span>
                <span className="text-slate-400">{sh.fromStatus} &rarr;</span>
                <span className="font-semibold text-white">{sh.toStatus}</span>
                <span className="text-slate-400">by {sh.changedByUser?.name}</span>
                <span className="text-slate-500 italic ml-auto">{sh.reason}</span>
              </div>
            ))}
          </div>
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
