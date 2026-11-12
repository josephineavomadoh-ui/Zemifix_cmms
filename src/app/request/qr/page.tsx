'use client';

import React, { useState } from 'react';
import { QrCode, CheckCircle2, AlertCircle, Send } from 'lucide-react';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1';

  return (
    <div className="min-h-screen bg-[#080E29] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5B00]/10 border border-[#FF5B00]/30 text-[#FF5B00]">
            <QrCode className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">ZemiFix — Maintenance Request</h1>
          <p className="text-xs text-slate-400">
            Submit a fault report for your site. No login required.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl space-y-5">
          {success ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-800">Report Submitted Successfully</div>
              <p className="text-sm text-slate-500">
                Your fault report has been queued for review by the site maintenance team.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>Site Code</label>
                <input
                  type="text"
                  required
                  value={siteCode}
                  onChange={(e) => setSiteCode(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Equipment Asset Tag (Optional)</label>
                <input
                  type="text"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder="e.g. AST-CUST-1001"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Your Phone</label>
                  <input
                    type="text"
                    required
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Issue Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the fault or maintenance issue observed…"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5B00] py-3 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Submitting…' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
