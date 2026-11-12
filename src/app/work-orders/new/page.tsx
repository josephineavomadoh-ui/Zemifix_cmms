'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, Check } from 'lucide-react';

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<string>('CORRECTIVE');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [assetId, setAssetId] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<string>('2');
  const [estimatedCost, setEstimatedCost] = useState<string>('150');

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => setAssets(data.assets ?? []))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          priority,
          assetId: assetId || null,
          estimatedHours: parseFloat(estimatedHours),
          estimatedCost: parseFloat(estimatedCost),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create work order');

      router.push(`/work-orders/${data.workOrder.id}`);
    } catch (err: any) {
      setError(err.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/work-orders" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Work Orders List
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-orange" /> Create Work Order
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Work Order Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Replace Worn Drive Belt on Conveyor A"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Detailed Description & Work Scope
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide comprehensive details, safety precautions, and required tools..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Maintenance Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="CORRECTIVE">Corrective Maintenance</option>
              <option value="PREVENTIVE">Preventive Maintenance</option>
              <option value="EMERGENCY">Emergency Breakdown</option>
              <option value="INSPECTION">Safety / Compliance Inspection</option>
              <option value="GENERAL">General Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="EMERGENCY">Emergency Priority</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Affected Equipment / Asset (Optional)
          </label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            <option value="">None (Facility / General Location)</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.assetTag})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Estimated Labor Hours
            </label>
            <input
              type="number"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Estimated Cost (GHS)
            </label>
            <input
              type="number"
              step="10"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/work-orders"
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Creating Work Order...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
