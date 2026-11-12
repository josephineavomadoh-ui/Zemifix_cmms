'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Check } from 'lucide-react';

export default function StockReturnsPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedWoId, setSelectedWoId] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/work-orders').then((res) => res.json()),
      fetch('/api/inventory/stores').then((res) => res.json()),
    ])
      .then(([woData, storesData]) => {
        setWorkOrders(woData.workOrders ?? []);
        setStores(storesData.stores ?? []);
        if (storesData.stores?.[0]) setStoreId(storesData.stores[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/inventory/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: selectedWoId,
          storeId,
          partId: selectedPartId,
          quantity,
          transactionType: 'RETURN_IN',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process material return');

      alert('Unused material successfully returned to inventory!');
      setSelectedWoId('');
      setSelectedPartId('');
    } catch (err: any) {
      setError(err.message ?? 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWo = workOrders.find((w) => w.id === selectedWoId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/inventory" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-brand-orange" /> Work Order Material Return
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleReturnSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Select Work Order
          </label>
          <select
            required
            value={selectedWoId}
            onChange={(e) => {
              setSelectedWoId(e.target.value);
              setSelectedPartId('');
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            <option value="">-- Select Work Order --</option>
            {workOrders.map((w) => (
              <option key={w.id} value={w.id}>
                {w.workOrderNumber} — {w.title}
              </option>
            ))}
          </select>
        </div>

        {selectedWo && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Issued Material to Return
            </label>
            <select
              required
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="">-- Select Material --</option>
              {(selectedWo.parts ?? []).map((p: any) => (
                <option key={p.id} value={p.partId ?? p.id}>
                  {p.partName} ({p.partNumber}) — Consumed: {p.quantityConsumed} {p.uom}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Receiving Warehouse / Store
          </label>
          <select
            required
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Quantity to Return
          </label>
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link href="/inventory" className="px-4 py-2 text-sm text-slate-400 hover:text-white">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'Returning...' : 'Return Material to Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
