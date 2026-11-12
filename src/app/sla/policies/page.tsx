'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Plus, Check, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function SlaPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [emergencyResp, setEmergencyResp] = useState<string>('15');
  const [emergencyRes, setEmergencyRes] = useState<string>('120');
  const [highResp, setHighResp] = useState<string>('60');
  const [highRes, setHighRes] = useState<string>('240');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sla/policies');
      const data = await res.json();
      if (res.ok) setPolicies(data.policies ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      // Create calendar first — /api/sla/calendars may not exist; handle gracefully
      let calendarId: string | null = null;
      try {
        const calRes = await fetch('/api/sla/calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `${name} Business Calendar` }),
        });
        const calData = await calRes.json();
        if (calRes.ok) calendarId = calData.calendar?.id ?? null;
      } catch {
        // Calendar API not available — continue without it
      }

      const res = await fetch('/api/sla/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(calendarId ? { calendarId } : {}),
          rules: [
            { priority: 'EMERGENCY', responseTargetMinutes: parseInt(emergencyResp), resolutionTargetMinutes: parseInt(emergencyRes) },
            { priority: 'HIGH', responseTargetMinutes: parseInt(highResp), resolutionTargetMinutes: parseInt(highRes) },
            { priority: 'MEDIUM', responseTargetMinutes: 240, resolutionTargetMinutes: 1440 },
          ],
        }),
      });

      if (res.ok) {
        setName('');
        setIsFormOpen(false);
        fetchPolicies();
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create SLA policy');
      }
    } catch (err: any) {
      setCreateError(err.message ?? 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SLA"
        eyebrowIcon={Clock}
        title="SLA Policies & Priority Target Rules"
        description="Configure response & resolution time targets, business calendars, and priority SLA matrices."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'New SLA Policy'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreatePolicy} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-semibold text-slate-800">Create SLA Policy</h2>

          {createError && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              {createError}
            </div>
          )}

          <div>
            <label className={labelClass}>Policy Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Critical Infrastructure 24/7 SLA Policy"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">EMERGENCY Priority Targets</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Response (Mins)</label>
                  <input
                    type="number"
                    required
                    value={emergencyResp}
                    onChange={(e) => setEmergencyResp(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Resolution (Mins)</label>
                  <input
                    type="number"
                    required
                    value={emergencyRes}
                    onChange={(e) => setEmergencyRes(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">HIGH Priority Targets</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Response (Mins)</label>
                  <input
                    type="number"
                    required
                    value={highResp}
                    onChange={(e) => setHighResp(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Resolution (Mins)</label>
                  <input
                    type="number"
                    required
                    value={highRes}
                    onChange={(e) => setHighRes(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {submitting ? 'Creating Policy…' : 'Save SLA Policy'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">Active SLA Policies</h2>
        </div>
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={3} columns={2} />
          </div>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No SLA policies defined yet"
            description="Create a policy to enforce response and resolution targets on work orders."
            action={{ label: 'New SLA Policy', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {policies.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{p.name}</div>
                    <div className="font-mono text-xs text-[#FF5B00] mt-0.5">{p.policyNumber}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Priority Target Rules</div>
                  {(p.rules ?? []).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-xs rounded-lg bg-white border border-slate-200 px-3 py-1.5">
                      <span className="font-semibold text-slate-600">{r.priority}</span>
                      <span className="font-mono text-slate-500">
                        Resp {r.responseTargetMinutes}m &nbsp;|&nbsp; Res {r.resolutionTargetMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
