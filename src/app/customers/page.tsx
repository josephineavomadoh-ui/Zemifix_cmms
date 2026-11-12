'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Building, Check, ArrowRight } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-orange" />
            Customer Root Accounts (Contractor Mode)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage external client accounts, physical customer sites, portal contacts, and site access grants.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'Register Customer'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateCustomer} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Register Customer Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Registered Business Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Goldfields Ghana Mining Corp"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">GRA Tax Identification Number (TIN)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="C0009876543"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Email</label>
              <input
                type="email"
                required
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="contact@goldfields.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Phone</label>
              <input
                type="text"
                required
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="0302000111"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Billing Address</label>
            <textarea
              required
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Tarkwa Gold Mine Site, Western Region, Ghana"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Register Customer'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading customer accounts...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No customer accounts registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Customer #</th>
                  <th className="p-3.5">Business Name</th>
                  <th className="p-3.5">Primary Contact</th>
                  <th className="p-3.5">GRA TIN</th>
                  <th className="p-3.5">Sites</th>
                  <th className="p-3.5">Contracts</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{c.customerNumber}</td>
                    <td className="p-3.5 font-medium text-white">{c.name}</td>
                    <td className="p-3.5 text-slate-300">{c.primaryEmail} ({c.primaryPhone})</td>
                    <td className="p-3.5 font-mono text-slate-400">{c.taxId ?? 'N/A'}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-200">{c.sites?.length ?? 0}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{c.contracts?.length ?? 0}</td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors inline-flex items-center gap-1"
                      >
                        Manage Account <ArrowRight className="w-3.5 h-3.5" />
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
