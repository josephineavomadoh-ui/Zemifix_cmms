'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Check } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';
  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Procurement"
        eyebrowIcon={Users}
        title="Vendor Master Catalog"
        description="Register and manage approved suppliers. Vendors are linked to purchase orders and goods received notes."
        breadcrumbs={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Vendors' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Register Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">Register New Vendor</h2>
          <form onSubmit={handleCreateVendor} className="space-y-4">
            <div>
              <label className={labelClass}>Vendor Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VEND-ACC-01"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Registered Business Name</label>
              <input
                type="text"
                required
                value={registeredName}
                onChange={(e) => setRegisteredName(e.target.value)}
                placeholder="e.g. Ghana Industrial Spares Ltd"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@vendor.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Telephone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0244000000"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Business Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Accra Industrial Area, Plot 14"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>GRA TIN / Tax ID</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="C0001234567"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5B00] py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {submitting ? 'Registering…' : 'Register Vendor'}
            </button>
          </form>
        </div>

        {/* Vendors Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs md:col-span-2 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-700">Registered Vendor Master Records</h2>
          </div>
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} columns={5} />
            </div>
          ) : vendors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No vendors registered yet"
              description="Register your first approved supplier to issue purchase orders."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>Vendor Code</th>
                    <th className={thClass}>Business Name</th>
                    <th className={thClass}>Contact Email</th>
                    <th className={thClass}>GRA TIN</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{v.code}</td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{v.registeredName}</td>
                      <td className={`${tdClass} text-slate-600`}>{v.email}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>{v.taxId ?? 'N/A'}</td>
                      <td className={tdClass}>
                        <StatusBadge status={v.status} />
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
