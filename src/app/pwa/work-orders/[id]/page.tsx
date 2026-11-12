'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, PauseCircle, PlayCircle, Clock, Boxes, Check, AlertTriangle } from 'lucide-react';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';
import { useOnlineStatus } from '@/src/lib/pwa/useOnlineStatus';
import { enqueueOfflineMutation } from '@/src/lib/pwa/db';
import { generateUuidV7 } from '@/src/lib/uuid';

export default function PwaWorkOrderWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isOnline = useOnlineStatus();
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [laborHours, setLaborHours] = useState<string>('2');
  const [laborDesc, setLaborDesc] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchWorkOrder = async () => {
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
    fetchWorkOrder();
  }, [id]);

  const handleStatusTransition = async (newStatus: string) => {
    setSubmitting(true);
    try {
      if (isOnline) {
        const res = await fetch(`/api/work-orders/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newStatus }),
        });
        if (res.ok) fetchWorkOrder();
      } else {
        // Queue status transition in client IndexedDB outbox
        await enqueueOfflineMutation({
          idempotencyKey: generateUuidV7(),
          actionType: 'WORK_ORDER_STATUS_SHIFT',
          entityType: 'work_order',
          entityId: id,
          payload: { workOrderId: id, newStatus },
          timestamp: Date.now(),
          status: 'QUEUED',
        });
        alert('Offline status shift queued in outbox for sync.');
        setWo({ ...wo, status: newStatus });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChecklistToggle = async (checklistItemId: string, currentVal: boolean | null) => {
    const newVal = currentVal === true ? false : true;
    try {
      if (isOnline) {
        await fetch(`/api/work-orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checklistItemId, passFail: newVal }),
        });
        fetchWorkOrder();
      } else {
        await enqueueOfflineMutation({
          idempotencyKey: generateUuidV7(),
          actionType: 'CHECKLIST_UPDATE',
          entityType: 'checklist_item',
          entityId: checklistItemId,
          payload: { checklistItemId, passFail: newVal },
          timestamp: Date.now(),
          status: 'QUEUED',
        });
        alert('Offline checklist update queued in outbox.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordLabor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isOnline) {
        const res = await fetch(`/api/work-orders/${id}/labor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hoursWorked: laborHours, description: laborDesc }),
        });
        if (res.ok) {
          setLaborDesc('');
          fetchWorkOrder();
        }
      } else {
        await enqueueOfflineMutation({
          idempotencyKey: generateUuidV7(),
          actionType: 'LABOR_LOG',
          entityType: 'work_order',
          entityId: id,
          payload: { workOrderId: id, hoursWorked: laborHours, description: laborDesc },
          timestamp: Date.now(),
          status: 'QUEUED',
        });
        alert('Offline labor log queued in outbox.');
        setLaborDesc('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading field workspace...</div>;
  }

  if (!wo) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm space-y-4">
        <div>Work order not found.</div>
        <Link href="/pwa" className="text-brand-orange hover:underline text-xs">
          Return to PWA Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-lg mx-auto space-y-5 pb-20">
      <Link href="/pwa" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Field Work Orders
      </Link>

      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-brand-orange">{wo.workOrderNumber}</span>
          <WorkOrderStatusBadge status={wo.status} size="sm" />
        </div>
        <h1 className="text-lg font-bold text-white">{wo.title}</h1>
        <p className="text-xs text-slate-400 leading-relaxed">{wo.description}</p>
      </div>

      {/* Field Actions */}
      <div className="flex items-center gap-2">
        {wo.status === 'OPEN' && (
          <button
            onClick={() => handleStatusTransition('IN_PROGRESS')}
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg"
          >
            <PlayCircle className="w-4 h-4" /> Start Work
          </button>
        )}

        {wo.status === 'IN_PROGRESS' && (
          <>
            <button
              onClick={() => handleStatusTransition('ON_HOLD')}
              disabled={submitting}
              className="flex-1 py-3 bg-amber-600/20 text-amber-400 border border-amber-500/20 font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
            >
              <PauseCircle className="w-4 h-4" /> Pause
            </button>
            <button
              onClick={() => handleStatusTransition('COMPLETED')}
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" /> Complete
            </button>
          </>
        )}
      </div>

      {/* Execution Checklists */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Field Safety & Inspection Checklists
        </h3>
        {wo.checklists?.length === 0 ? (
          <div className="text-xs text-slate-500 py-2">No mandatory checklist items.</div>
        ) : (
          <div className="space-y-2">
            {wo.checklists?.map((item: any) => (
              <button
                key={item.id}
                onClick={() => handleChecklistToggle(item.id, item.passFail)}
                className={`w-full text-left p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  item.passFail === true
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <span>{item.description}</span>
                <span className={`px-2 py-0.5 rounded font-mono ${item.passFail === true ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700 text-slate-400'}`}>
                  {item.passFail === true ? 'PASS' : 'PENDING'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rapid Labor Logger Form */}
      <form onSubmit={handleRecordLabor} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-brand-orange" />
          Log Labor Hours
        </h3>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Hours Worked</label>
          <input
            type="number"
            step="0.5"
            required
            value={laborHours}
            onChange={(e) => setLaborHours(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Work Performed Remarks</label>
          <input
            type="text"
            required
            value={laborDesc}
            onChange={(e) => setLaborDesc(e.target.value)}
            placeholder="e.g. Replaced worn belt & calibrated tension"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          {submitting ? 'Logging...' : 'Log Hours'}
        </button>
      </form>
    </div>
  );
}
