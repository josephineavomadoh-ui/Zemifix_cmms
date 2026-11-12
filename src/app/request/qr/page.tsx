'use client';

import React, { useState } from 'react';
import { QrCode, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

export default function PublicQrRequestPage() {
  const [siteCode, setSiteCode] = useState<string>('STE-TARKWA-01');
  const [assetTag, setAssetTag] = useState<string>('');
  const [requesterName, setRequesterName] = useState<string>('');
  const [requesterEmail, setRequesterEmail] = useState<string>('');
  const [requesterPhone, setRequesterPhone] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/public/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteCode,
          assetTag: assetTag || undefined,
          requesterName,
          requesterEmail,
          requesterPhone,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange">
            <QrCode className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Public QR Request Intake</h1>
          <p className="text-xs text-slate-400">
            Submit a maintenance fault report for your site without logging in.
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-5 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="font-bold text-sm">Report Submitted Successfully</div>
            <p className="text-xs text-slate-400">
              Your fault report has been queued for review by the site maintenance team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Site Code</label>
              <input
                type="text"
                required
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Equipment Asset Tag (Optional)</label>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="e.g. AST-CUST-1001"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Your Phone</label>
                <input
                  type="text"
                  required
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Issue Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the fault or maintenance issue observed..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-orange/10 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
