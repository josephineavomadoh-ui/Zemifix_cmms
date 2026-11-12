'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

export default function SlaBreachesPage() {
  const [breachLogs, setBreachLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const fetchBreaches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sla/breaches');
      const data = await res.json();
      if (res.ok) setBreachLogs(data.breachLogs ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreaches();
  }, []);

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/sla/breaches', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`SLA evaluation complete. Evaluated ${data.evaluatedCount} active work orders.`);
        fetchBreaches();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
            Authoritative SLA Breach Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cycle-aware immutable SLA breach history ledger and compliance audit records.
          </p>
        </div>

        <button
          onClick={handleEvaluateNow}
          disabled={evaluating}
          className="px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin text-brand-orange' : ''}`} />
          {evaluating ? 'Evaluating...' : 'Run SLA Check'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading SLA breach records...</div>
        ) : breachLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No SLA breaches recorded. Excellent compliance!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Work Order</th>
                  <th className="p-3.5">Breach Classification</th>
                  <th className="p-3.5">Cycle</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Target (Mins)</th>
                  <th className="p-3.5">Actual Elapsed (Mins)</th>
                  <th className="p-3.5">Breached At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {breachLogs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">
                      {b.workOrder?.workOrderNumber}
                      <div className="font-sans text-slate-300 font-normal">{b.workOrder?.title}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-rose-400">{b.breachType}</td>
                    <td className="p-3.5 font-mono text-slate-300">{b.slaCycle}</td>
                    <td className="p-3.5 font-mono font-bold text-amber-400">{b.priority}</td>
                    <td className="p-3.5 font-mono text-slate-400">{b.targetMinutes}m</td>
                    <td className="p-3.5 font-mono font-bold text-rose-400">{b.actualElapsedMinutes}m</td>
                    <td className="p-3.5 text-slate-500">{new Date(b.breachedAt).toLocaleString()}</td>
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
