'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareWarning, Plus, Check, X, Wrench, MapPin, Calendar } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquareWarning className="w-7 h-7 text-brand-orange" />
            Maintenance Requests
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Submit facility or equipment breakdown requests and convert approved requests into active work orders.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/10"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'Submit Request'}
        </button>
      </div>

      {/* New Request Collapsible Form */}
      {isFormOpen && (
        <form onSubmit={handleCreateRequest} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">New Maintenance Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AC unit leaking water in Conference Room B"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
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
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide complete details about the issue..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Asset (Optional)</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                <option value="">None (Location / Facility)</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.assetTag})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Location (Optional)</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                <option value="">None (Branch / Facility Wide)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading maintenance requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No maintenance requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Request #</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Asset / Location</th>
                  <th className="p-3.5">Requester</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{req.requestNumber}</td>
                    <td className="p-3.5">
                      <div className="font-medium text-white">{req.title}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{req.description}</div>
                    </td>
                    <td className="p-3.5 text-xs text-slate-300">
                      {req.asset ? req.asset.name : req.location ? req.location.name : 'Facility Wide'}
                    </td>
                    <td className="p-3.5 text-xs text-slate-300">{req.requesterUser?.name}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        req.status === 'CONVERTED' ? 'bg-emerald-500/10 text-emerald-400' :
                        req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-sky-500/10 text-sky-400'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {req.status === 'SUBMITTED' || req.status === 'UNDER_REVIEW' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReview(req.id, 'CONVERT')}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Convert to WO
                          </button>
                          <button
                            onClick={() => handleReview(req.id, 'REJECT')}
                            className="px-2.5 py-1 text-xs font-medium bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : req.convertedWorkOrder ? (
                        <Link
                          href={`/work-orders/${req.convertedWorkOrder.id}`}
                          className="text-xs font-mono font-medium text-brand-orange hover:underline"
                        >
                          {req.convertedWorkOrder.workOrderNumber}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
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
