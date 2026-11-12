import React, { useState } from 'react';
import { Gauge, X, Check } from 'lucide-react';

interface MeterReadingModalProps {
  meter: {
    id: string;
    name: string;
    unitOfMeasure: string;
    meterType: 'CONTINUOUS_INCREMENTAL' | 'ABSOLUTE_GAUGE';
    currentReading: string | number;
  };
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export const MeterReadingModal: React.FC<MeterReadingModalProps> = ({
  meter,
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [readingValue, setReadingValue] = useState<string>('');
  const [isRollover, setIsRollover] = useState<boolean>(false);
  const [isReset, setIsReset] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assets/0/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterId: meter.id,
          readingValue: parseFloat(readingValue),
          isRollover,
          isReset,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reading');

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
            <Gauge className="w-5 h-5 text-brand-orange" />
            <h3 className="font-semibold text-lg">Submit Telemetry Reading</h3>
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
              Meter Name
            </label>
            <div className="text-sm font-medium text-slate-200">{meter.name} ({meter.meterType.replace('_', ' ')})</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              Current Baseline Reading
            </label>
            <div className="text-lg font-mono font-semibold text-slate-300">
              {meter.currentReading} {meter.unitOfMeasure}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              New Reading Value ({meter.unitOfMeasure})
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder={`Enter value in ${meter.unitOfMeasure}`}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          {meter.meterType === 'CONTINUOUS_INCREMENTAL' && (
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRollover}
                  onChange={(e) => {
                    setIsRollover(e.target.checked);
                    if (e.target.checked) setIsReset(false);
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-brand-orange focus:ring-brand-orange"
                />
                Meter Rollover Event
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReset}
                  onChange={(e) => {
                    setIsReset(e.target.checked);
                    if (e.target.checked) setIsRollover(false);
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-brand-orange focus:ring-brand-orange"
                />
                Meter Replacement Reset
              </label>
            </div>
          )}

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
              {loading ? 'Submitting...' : 'Record Reading'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
