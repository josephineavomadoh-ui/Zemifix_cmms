'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Cpu, CheckCircle2, AlertTriangle, Clock, RefreshCw, Play, ShieldAlert } from 'lucide-react';

export const WorkerMonitoringView: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/internal/workers/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const interval = setInterval(() => { void fetchMetrics(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleTriggerWorker = async (jobType?: string) => {
    setTriggering(true);
    try {
      const res = await fetch('/api/internal/workers/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': 'zemifix-internal-worker-secret-key-secure',
        },
        body: JSON.stringify({ jobType, workerId: `admin-ui-worker-${Date.now()}` }),
      });
      const data = await res.json();
      if (data.success) {
        void fetchMetrics();
      } else {
        alert(data.error || 'Worker execution failed');
      }
    } catch (err: any) {
      alert(`Error triggering worker: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Operational Reliability</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Background Workers & Automation</h1>
          <p className="mt-1 text-sm text-slate-500">Centralized job execution, leasing, heartbeats, preventive maintenance, SLA monitoring, and notification processing.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleTriggerWorker()}
            disabled={triggering}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white hover:bg-[#E65200] disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 ${triggering ? 'animate-spin' : ''}`} />
            Trigger Worker Run
          </button>
          <button
            onClick={fetchMetrics}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-400">Pending</p>
            <p className="mt-1 text-2xl font-bold text-[#0B1336]">{metrics.metrics.pending}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-orange-500">Running</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{metrics.metrics.running}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-emerald-600">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{metrics.metrics.completed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-amber-600">Retrying</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{metrics.metrics.retrying}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-rose-600">Failed</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{metrics.metrics.failed}</p>
          </div>
        </div>
      )}

      {/* Registered Workers */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-[#0B1336]">Registered Workers & Heartbeats</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5">Worker ID</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Current Job ID</th>
                <th className="px-3.5 py-2.5">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!metrics?.workers || metrics.workers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No active workers registered.</td></tr>
              ) : (
                metrics.workers.map((w: any) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-[#0B1336]">{w.workerId}</td>
                    <td className="px-3.5 py-2.5"><span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{w.status}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-500">{w.currentJobId ?? 'None'}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{new Date(w.lastHeartbeatAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs History */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-[#0B1336]">Recent Job Execution History</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5">Job Type</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Worker ID</th>
                <th className="px-3.5 py-2.5 text-right">Retries</th>
                <th className="px-3.5 py-2.5">Last Error</th>
                <th className="px-3.5 py-2.5">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!metrics?.recentJobs || metrics.recentJobs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No recent job execution records.</td></tr>
              ) : (
                metrics.recentJobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 font-bold text-[#0B1336]">{j.jobType}</td>
                    <td className="px-3.5 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${j.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : j.status === 'RUNNING' ? 'bg-orange-50 text-orange-600' : j.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-500">{j.workerId ?? 'Unclaimed'}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono">{j.retryCount} / {j.maxRetries}</td>
                    <td className="px-3.5 py-2.5 text-rose-600 truncate max-w-xs">{j.lastError ?? 'None'}</td>
                    <td className="px-3.5 py-2.5 text-slate-500">{new Date(j.updatedAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
