'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus, Check, Clock } from 'lucide-react';

export default function SlaPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
    try {
      // Create calendar first
      const calRes = await fetch('/api/sla/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name} Business Calendar` }),
      });
      const calData = await calRes.json();

      if (!calRes.ok) throw new Error(calData.error || 'Failed to create calendar');

      const res = await fetch('/api/sla/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          calendarId: calData.calendar.id,
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-brand-orange" />
            SLA Policies & Priority Target Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure response & resolution time targets, business calendars, and priority SLA matrices.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'New SLA Policy'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreatePolicy} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Create SLA Policy</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Policy Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Critical Infrastructure 24/7 SLA Policy"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-rose-400 uppercase">EMERGENCY Priority Targets</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Response (Mins)</label>
                  <input
                    type="number"
                    required
                    value={emergencyResp}
                    onChange={(e) => setEmergencyResp(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Resolution (Mins)</label>
                  <input
                    type="number"
                    required
                    value={emergencyRes}
                    onChange={(e) => setEmergencyRes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase">HIGH Priority Targets</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Response (Mins)</label>
                  <input
                    type="number"
                    required
                    value={highResp}
                    onChange={(e) => setHighResp(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Resolution (Mins)</label>
                  <input
                    type="number"
                    required
                    value={highRes}
                    onChange={(e) => setHighRes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Creating Policy...' : 'Save SLA Policy'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <h2 className="text-sm font-semibold text-slate-300">Active SLA Policies</h2>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading SLA policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No SLA policies defined yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => (
              <div key={p.id} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm text-white">{p.name}</div>
                    <div className="font-mono text-xs text-brand-orange">{p.policyNumber}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400">ACTIVE</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-400 font-medium">Priority Target Rules:</div>
                  {(p.rules ?? []).map((r: any) => (
                    <div key={r.id} className="flex justify-between text-slate-300 font-mono">
                      <span>{r.priority}:</span>
                      <span>Resp {r.responseTargetMinutes}m | Res {r.resolutionTargetMinutes}m</span>
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
