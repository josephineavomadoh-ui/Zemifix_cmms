'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

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

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SLA"
        eyebrowIcon={AlertTriangle}
        title="SLA Breach Ledger"
        description="Cycle-aware immutable SLA breach history ledger and compliance audit records."
        actions={
          <button
            onClick={handleEvaluateNow}
            disabled={evaluating}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${evaluating ? 'animate-spin text-[#FF5B00]' : 'text-slate-400'}`} />
            {evaluating ? 'Evaluating…' : 'Run SLA Check'}
          </button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : breachLogs.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No SLA breaches recorded"
            description="Excellent compliance! All work orders are within their SLA targets."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Work Order</th>
                  <th className={thClass}>Breach Classification</th>
                  <th className={thClass}>Cycle</th>
                  <th className={thClass}>Priority</th>
                  <th className={thClass}>Target (Mins)</th>
                  <th className={thClass}>Actual Elapsed (Mins)</th>
                  <th className={thClass}>Breached At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breachLogs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className={tdClass}>
                      <div className="font-mono font-medium text-[#FF5B00]">{b.workOrder?.workOrderNumber}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{b.workOrder?.title}</div>
                    </td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        {b.breachType}
                      </span>
                    </td>
                    <td className={`${tdClass} font-mono text-slate-600`}>{b.slaCycle}</td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {b.priority}
                      </span>
                    </td>
                    <td className={`${tdClass} font-mono text-slate-600`}>{b.targetMinutes}m</td>
                    <td className={`${tdClass} font-mono font-bold text-rose-700`}>{b.actualElapsedMinutes}m</td>
                    <td className={`${tdClass} text-slate-500`}>{new Date(b.breachedAt).toLocaleString()}</td>
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
