'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Plus, Check } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [code, setCode] = useState<string>('');
  const [registeredName, setRegisteredName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement/vendors');
      const data = await res.json();
      if (res.ok) setVendors(data.vendors ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/procurement/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          registeredName,
          email,
          phone,
          address,
          taxId,
        }),
      });

      if (res.ok) {
        setCode('');
        setRegisteredName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setTaxId('');
        fetchVendors();
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
            <Users className="w-6 h-6 text-brand-orange" /> Vendor Master Catalog
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300">Register New Vendor</h2>
          <form onSubmit={handleCreateVendor} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vendor Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VEND-ACC-01"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Registered Business Name</label>
              <input
                type="text"
                required
                value={registeredName}
                onChange={(e) => setRegisteredName(e.target.value)}
                placeholder="e.g. Ghana Industrial Spares Ltd"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@vendor.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Telephone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0244000000"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Accra Industrial Area, Plot 14"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">GRA TIN / Tax ID</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="C0001234567"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Register Vendor'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Registered Vendor Master Records</h2>
          {loading ? (
            <div className="text-sm text-slate-500 py-8 text-center">Loading vendor master...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                    <th className="p-3">Vendor Code</th>
                    <th className="p-3">Business Name</th>
                    <th className="p-3">Contact Email</th>
                    <th className="p-3">GRA TIN</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-medium text-brand-orange">{v.code}</td>
                      <td className="p-3 font-medium text-white">{v.registeredName}</td>
                      <td className="p-3 text-slate-300">{v.email}</td>
                      <td className="p-3 font-mono text-slate-400">{v.taxId ?? 'N/A'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 font-medium">
                          {v.status}
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
    </div>
  );
}
