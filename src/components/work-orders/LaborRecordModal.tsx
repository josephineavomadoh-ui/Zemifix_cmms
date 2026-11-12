import React, { useState } from 'react';
import { Clock, X, Check } from 'lucide-react';

interface LaborRecordModalProps {
  workOrderId: string;
  workOrderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const LaborRecordModal: React.FC<LaborRecordModalProps> = ({
  workOrderId,
  workOrderNumber,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [hoursWorked, setHoursWorked] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('50');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursWorked,
          hourlyRate,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record labor hours');

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
            <Clock className="w-5 h-5 text-brand-orange" />
            <h3 className="font-semibold text-lg">Record Labor Hours</h3>
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

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Hours Worked
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              required
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Hourly Cost Rate (GHS)
            </label>
            <input
              type="number"
              step="1"
              required
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Work Performed Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tasks completed during these hours..."
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
              {loading ? 'Recording...' : 'Record Labor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
