import React, { useState } from 'react';
import { PackageCheck, X, Check } from 'lucide-react';

interface StockReceiptModalProps {
  part: {
    id: string;
    partNumber: string;
    name: string;
    uom: string;
  };
  stores: Array<{ id: string; name: string; code: string }>;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const StockReceiptModal: React.FC<StockReceiptModalProps> = ({
  part,
  stores,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [storeId, setStoreId] = useState<string>(stores[0]?.id ?? '');
  const [transactionType, setTransactionType] = useState<'RECEIPT' | 'OPENING_BALANCE'>('RECEIPT');
  const [quantity, setQuantity] = useState<string>('10');
  const [unitCost, setUnitCost] = useState<string>('50');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/inventory/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType,
          storeId,
          partId: part.id,
          quantity,
          unitCost,
          referenceDoc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post stock receipt');

      onSubmitSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-brand-orange" />
            <h3 className="font-semibold text-lg">Receive Inventory Stock</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Part / Item
            </label>
            <div className="text-sm font-semibold text-white">{part.name}</div>
            <div className="text-xs font-mono text-brand-orange">{part.partNumber}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Target Store / Warehouse
            </label>
            <select
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
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Transaction Classification
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="RECEIPT">Stock Receipt / Inbound Delivery</option>
              <option value="OPENING_BALANCE">Opening Stock Balance</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Qty Received ({part.uom})
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
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Unit Cost (GHS)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Reference Document / Invoice #
            </label>
            <input
              type="text"
              value={referenceDoc}
              onChange={(e) => setReferenceDoc(e.target.value)}
              placeholder="e.g. GRN-2026-0041"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Posting...' : 'Post Stock Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
