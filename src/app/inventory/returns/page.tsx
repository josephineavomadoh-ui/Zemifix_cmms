'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={RotateCcw}
        title="Work Order Material Return"
        description="Return unused materials from completed work orders back to warehouse stock."
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Returns' },
        ]}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      <form onSubmit={handleReturnSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div>
          <label className={labelClass}>Select Work Order</label>
          <select
            required
            value={selectedWoId}
            onChange={(e) => {
              setSelectedWoId(e.target.value);
              setSelectedPartId('');
            }}
            className={inputClass}
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
            <label className={labelClass}>Select Issued Material to Return</label>
            <select
              required
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className={inputClass}
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
          <label className={labelClass}>Receiving Warehouse / Store</label>
          <select
            required
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className={inputClass}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Quantity to Return</label>
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link href="/inventory" className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {submitting ? 'Returning…' : 'Return Material to Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
