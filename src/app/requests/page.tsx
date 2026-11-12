'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareWarning, Plus, Check, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (res.ok) setRequests(data.requests ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => setAssets(data.assets ?? []))
      .catch((err) => console.error(err));

    fetch('/api/assets/locations')
      .then((res) => res.json())
      .then((data) => setLocations(data.locations ?? []))
      .catch((err) => console.error(err));
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          assetId: assetId || null,
          locationId: locationId || null,
          priority,
        }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setAssetId('');
        setLocationId('');
        setIsFormOpen(false);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (requestId: string, action: 'CONVERT' | 'REJECT') => {
    try {
      const res = await fetch(`/api/requests/${requestId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to review request');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';
  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maintenance"
        eyebrowIcon={MessageSquareWarning}
        title="Maintenance Requests"
        description="Submit facility or equipment breakdown requests and convert approved requests into active work orders."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'Submit Request'}
          </button>
        }
      />

      {/* New Request Form */}
      {isFormOpen && (
        <form onSubmit={handleCreateRequest} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">New Maintenance Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AC unit leaking water in Conference Room B"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete details about the issue..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Asset (Optional)</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className={inputClass}
              >
                <option value="">None (Location / Facility)</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Location (Optional)</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={inputClass}
              >
                <option value="">None (Branch / Facility Wide)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
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
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Requests Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={MessageSquareWarning}
            title="No maintenance requests found"
            description="Submit a new request to log a facility or equipment issue."
            action={{ label: 'Submit Request', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Request #</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Asset / Location</th>
                  <th className={thClass}>Requester</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{req.requestNumber}</td>
                    <td className={tdClass}>
                      <div className="font-medium text-slate-800">{req.title}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{req.description}</div>
                    </td>
                    <td className={`${tdClass} text-slate-600`}>
                      {req.asset ? req.asset.name : req.location ? req.location.name : 'Facility Wide'}
                    </td>
                    <td className={`${tdClass} text-slate-600`}>{req.requesterUser?.name}</td>
                    <td className={tdClass}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReview(req.id, 'CONVERT')}
                            className="rounded px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            Convert to WO
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'REJECT')}
                            className="rounded px-2.5 py-1 text-xs font-medium border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : req.convertedWorkOrder ? (
                        <Link
                          href={`/work-orders/${req.convertedWorkOrder.id}`}
                          className="font-mono text-xs font-medium text-[#FF5B00] hover:underline"
                        >
                          {req.convertedWorkOrder.workOrderNumber}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
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
