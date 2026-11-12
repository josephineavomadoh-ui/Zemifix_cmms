import React, { useState } from 'react';
import { Boxes, X, Check } from 'lucide-react';

interface PartRequirementModalProps {
  workOrderId: string;
  workOrderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const PartRequirementModal: React.FC<PartRequirementModalProps> = ({
  workOrderId,
  workOrderNumber,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [partNumber, setPartNumber] = useState<string>('');
  const [partName, setPartName] = useState<string>('');
  const [quantityPlanned, setQuantityPlanned] = useState<string>('1');
  const [quantityConsumed, setQuantityConsumed] = useState<string>('0');
  const [unitCost, setUnitCost] = useState<string>('100');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber,
          partName,
          quantityPlanned,
          quantityConsumed,
          unitCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record part requirement');

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
            <Boxes className="w-5 h-5 text-brand-orange" />
            <h3 className="font-semibold text-lg">Add Material / Part Requirement</h3>
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
              Work Order
            </label>
            <div className="text-sm font-mono font-semibold text-brand-orange">{workOrderNumber}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Part Number
              </label>
              <input
                type="text"
                required
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. P-1004"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Part Name
              </label>
              <input
                type="text"
                required
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. Hydraulic Filter"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Qty Planned
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={quantityPlanned}
                onChange={(e) => setQuantityPlanned(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Qty Consumed
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={quantityConsumed}
                onChange={(e) => setQuantityConsumed(e.target.value)}
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
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
            Note: Material requirements recorded here plan and track usage against this work order. Inventory stock deductions will be automatically driven by Stage 5 Store Stock Movements.
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
              {loading ? 'Adding...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
