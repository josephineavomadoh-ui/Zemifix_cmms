'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wrench, Wifi, WifiOff, RefreshCw, QrCode, CheckCircle2, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { useOnlineStatus } from '@/src/lib/pwa/useOnlineStatus';
import { cacheWorkOrdersLocally, getCachedWorkOrdersLocally, getQueuedOutboxMutations } from '@/src/lib/pwa/db';
import { flushOfflineSyncQueue } from '@/src/lib/pwa/offlineSyncManager';
import { WorkOrderStatusBadge } from '@/src/components/work-orders/WorkOrderStatusBadge';
import { WorkOrderPriorityBadge } from '@/src/components/work-orders/WorkOrderPriorityBadge';

export default function TechnicianPwaPage() {
  const isOnline = useOnlineStatus();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const res = await fetch('/api/work-orders');
        const data = await res.json();
        if (res.ok) {
          setWorkOrders(data.workOrders ?? []);
          // Cache assigned work orders locally in IndexedDB
          await cacheWorkOrdersLocally(data.workOrders ?? []);
        }
      } else {
        // Load from local IndexedDB cache when offline
        const cached = await getCachedWorkOrdersLocally();
        setWorkOrders(cached);
      }

      // Check pending outbox mutations
      const queued = await getQueuedOutboxMutations();
      setOutboxCount(queued.length);
    } catch (err) {
      console.error('Failed to load PWA data', err);
      const cached = await getCachedWorkOrdersLocally();
      setWorkOrders(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOnline]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await flushOfflineSyncQueue();
      if (result.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Mobile Top App Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-6 h-6 text-brand-orange" />
          <span className="font-bold text-lg text-white">Technician PWA</span>
        </div>

        {/* Network & Sync Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>

          <button
            onClick={handleManualSync}
            disabled={syncing || !isOnline}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors disabled:opacity-40"
            title="Sync Outbox Queue"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-brand-orange' : ''}`} />
          </button>
        </div>
      </div>

      {/* Outbox Pending Notification Banner */}
      {outboxCount > 0 && (
        <div className="bg-brand-orange/10 border-b border-brand-orange/20 p-3 px-4 flex items-center justify-between text-xs text-brand-orange font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{outboxCount} offline action(s) queued in outbox.</span>
          </div>
          {isOnline && (
            <button onClick={handleManualSync} className="underline font-semibold">
              Sync Now
            </button>
          )}
        </div>
      )}

      {/* Main Field Workspace Content */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Rapid Camera Barcode / QR Scanner Trigger */}
        <button
          onClick={() => setScannerOpen(true)}
          className="w-full py-3 px-4 bg-slate-900 border border-slate-800 hover:border-brand-orange rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white shadow-lg transition-all"
        >
          <QrCode className="w-5 h-5 text-brand-orange" />
          Scan Equipment Barcode / QR
        </button>

        {/* Assigned Work Orders List */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            My Assigned Field Work Orders ({workOrders.length})
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">Loading assigned work orders...</div>
          ) : workOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
              No work orders assigned to your queue.
            </div>
          ) : (
            workOrders.map((wo) => (
              <Link
                key={wo.id}
                href={`/pwa/work-orders/${wo.id}`}
                className="block bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-2.5 transition-all shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-brand-orange">{wo.workOrderNumber}</span>
                  <WorkOrderStatusBadge status={wo.status} size="sm" />
                </div>

                <div className="font-semibold text-sm text-white">{wo.title}</div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>{wo.asset ? wo.asset.name : wo.location?.name ?? 'Facility'}</span>
                  <WorkOrderPriorityBadge priority={wo.priority} size="sm" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* QR Code Camera Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <QrCode className="w-16 h-16 text-brand-orange animate-pulse" />
          <div className="text-lg font-bold text-white">Camera Scanner Ready</div>
          <p className="text-xs text-slate-400 max-w-xs">
            Point camera at equipment asset tag or part barcode to inspect specifications.
          </p>
          <button
            onClick={() => setScannerOpen(false)}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
          >
            Close Scanner
          </button>
        </div>
      )}
    </div>
  );
}
