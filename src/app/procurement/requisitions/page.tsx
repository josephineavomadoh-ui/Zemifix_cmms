'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Check } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [justification, setJustification] = useState<string>('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('5');
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState<string>('120');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement/requisitions');
      const data = await res.json();
      if (res.ok) setRequisitions(data.requisitions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisitions();

    fetch('/api/inventory/parts')
      .then((res) => res.json())
      .then((data) => setParts(data.parts ?? []))
      .catch((err) => console.error(err));
  }, []);

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedPart = parts.find((p) => p.id === selectedPartId);

      const res = await fetch('/api/procurement/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justification,
          priority,
          items: [
            {
              partId: selectedPartId || null,
              description: selectedPart ? selectedPart.name : 'General Supply Item',
              quantity,
              estimatedUnitPrice,
            },
          ],
        }),
      });

      if (res.ok) {
        setJustification('');
        setSelectedPartId('');
        setIsFormOpen(false);
        fetchRequisitions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
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
        eyebrow="Procurement"
        eyebrowIcon={FileText}
        title="Purchase Requisitions"
        description="Submit and track internal purchase requests before converting them to purchase orders."
        breadcrumbs={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Requisitions' },
        ]}
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'New Requisition'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreateRequisition} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Create Purchase Requisition</h2>
          <div>
            <label className={labelClass}>Business Justification</label>
            <textarea
              required
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain business need for requested materials…"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              </select>
            </div>

            <div>
              <label className={labelClass}>Select Part Item</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- General Item --</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Quantity Requested</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estimated Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={estimatedUnitPrice}
                onChange={(e) => setEstimatedUnitPrice(e.target.value)}
                className={inputClass}
              />
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
              {submitting ? 'Submitting…' : 'Submit Requisition'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={5} />
        ) : requisitions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No purchase requisitions submitted yet"
            description="Submit a requisition to initiate the procurement process."
            action={{ label: 'New Requisition', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>PR Number</th>
                  <th className={thClass}>Requester</th>
                  <th className={thClass}>Justification</th>
                  <th className={thClass}>Est. Total (GHS)</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{pr.requisitionNumber}</td>
                    <td className={`${tdClass} font-medium text-slate-800`}>{pr.requesterUser?.name}</td>
                    <td className={`${tdClass} text-slate-600`}>{pr.justification}</td>
                    <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {pr.estimatedTotal}</td>
                    <td className={tdClass}>
                      <StatusBadge status={pr.status} />
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
