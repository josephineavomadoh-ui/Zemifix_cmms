'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Plus, Check } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/procurement" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Procurement Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-orange" /> Purchase Requisitions
          </h1>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'New Requisition'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateRequisition} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Create Purchase Requisition</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Business Justification</label>
            <textarea
              required
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain business need for requested materials..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Part Item</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
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
              <label className="block text-xs text-slate-400 mb-1">Quantity Requested</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Estimated Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={estimatedUnitPrice}
                onChange={(e) => setEstimatedUnitPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Requisition'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading purchase requisitions...</div>
        ) : requisitions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No purchase requisitions submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">PR Number</th>
                  <th className="p-3.5">Requester</th>
                  <th className="p-3.5">Justification</th>
                  <th className="p-3.5">Est. Total (GHS)</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {requisitions.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{pr.requisitionNumber}</td>
                    <td className="p-3.5 text-white font-medium">{pr.requesterUser?.name}</td>
                    <td className="p-3.5 text-slate-300">{pr.justification}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {pr.estimatedTotal}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                        {pr.status}
                      </span>
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
