'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, Check, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work Orders"
        eyebrowIcon={ClipboardList}
        title="Create Work Order"
        description="Log a new corrective, preventive, or emergency maintenance task."
        breadcrumbs={[
          { label: 'Work Orders', href: '/work-orders' },
          { label: 'New Work Order' },
        ]}
        actions={
          <Link
            href="/work-orders"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div>
          <label className={labelClass}>Work Order Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Replace Worn Drive Belt on Conveyor A"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Detailed Description & Work Scope</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide comprehensive details, safety precautions, and required tools..."
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Maintenance Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              <option value="CORRECTIVE">Corrective Maintenance</option>
              <option value="PREVENTIVE">Preventive Maintenance</option>
              <option value="EMERGENCY">Emergency Breakdown</option>
              <option value="INSPECTION">Safety / Compliance Inspection</option>
              <option value="GENERAL">General Maintenance</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={inputClass}
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
          <label className={labelClass}>Affected Equipment / Asset (Optional)</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className={inputClass}
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
            <label className={labelClass}>Estimated Labor Hours</label>
            <input
              type="number"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Estimated Cost (GHS)</label>
            <input
              type="number"
              step="10"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/work-orders"
            className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#F95700] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loading ? 'Creating Work Order…' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
