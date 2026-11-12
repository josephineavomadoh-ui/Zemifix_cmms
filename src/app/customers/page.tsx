'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Check, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [billingAddress, setBillingAddress] = useState<string>('');
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [primaryEmail, setPrimaryEmail] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok) setCustomers(data.customers ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          taxId,
          billingAddress,
          primaryPhone,
          primaryEmail,
        }),
      });

      if (res.ok) {
        setName('');
        setTaxId('');
        setBillingAddress('');
        setPrimaryPhone('');
        setPrimaryEmail('');
        setIsFormOpen(false);
        fetchCustomers();
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
        eyebrow="Customers"
        eyebrowIcon={Users}
        title="Customer Accounts"
        description="Manage external client accounts, physical customer sites, portal contacts, and site access grants."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'Register Customer'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreateCustomer} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Register Customer Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Registered Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Goldfields Ghana Mining Corp"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>GRA Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="C0009876543"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Email</label>
              <input
                type="email"
                required
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="contact@goldfields.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Primary Phone</label>
              <input
                type="text"
                required
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="0302000111"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Billing Address</label>
            <textarea
              required
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Tarkwa Gold Mine Site, Western Region, Ghana"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {submitting ? 'Registering…' : 'Register Customer'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customer accounts registered yet"
            description="Register your first external client to start managing contracts and work orders."
            action={{ label: 'Register Customer', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Customer #</th>
                  <th className={thClass}>Business Name</th>
                  <th className={thClass}>Primary Contact</th>
                  <th className={thClass}>GRA TIN</th>
                  <th className={thClass}>Sites</th>
                  <th className={thClass}>Contracts</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{c.customerNumber}</td>
                    <td className={`${tdClass} font-medium text-slate-800`}>{c.name}</td>
                    <td className={`${tdClass} text-slate-600`}>
                      <div>{c.primaryEmail}</div>
                      <div className="text-xs text-slate-400">{c.primaryPhone}</div>
                    </td>
                    <td className={`${tdClass} font-mono text-slate-500`}>{c.taxId ?? 'N/A'}</td>
                    <td className={`${tdClass} font-mono font-bold text-slate-700`}>{c.sites?.length ?? 0}</td>
                    <td className={`${tdClass} font-mono font-bold text-emerald-700`}>{c.contracts?.length ?? 0}</td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Manage Account <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
