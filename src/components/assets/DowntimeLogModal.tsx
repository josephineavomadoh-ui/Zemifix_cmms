import React, { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface DowntimeLogModalProps {
  assetId: string;
  assetName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const DowntimeLogModal: React.FC<DowntimeLogModalProps> = ({
  assetId,
  assetName,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [downtimeType, setDowntimeType] = useState<'UNPLANNED' | 'PLANNED'>('UNPLANNED');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/assets/${assetId}/downtime/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downtimeType,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start downtime');

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
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-lg">Log Equipment Downtime</h3>
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
              Asset
            </label>
            <div className="text-sm font-medium text-slate-200">{assetName}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Downtime Classification
            </label>
            <select
              value={downtimeType}
              onChange={(e) => setDowntimeType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="UNPLANNED">Unplanned Failure / Breakdown</option>
              <option value="PLANNED">Planned Overhaul / Servicing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Root Failure Reason / Description
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the operational failure or maintenance reason..."
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
              className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Starting...' : 'Log Downtime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
