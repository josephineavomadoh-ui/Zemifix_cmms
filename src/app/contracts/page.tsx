'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Check, ShieldCheck, ArrowRight } from 'lucide-react';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  const [slaPolicyId, setSlaPolicyId] = useState<string>('');
  const [contractValue, setContractValue] = useState<string>('120000');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts');
      const data = await res.json();
      if (res.ok) setContracts(data.contracts ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();

    Promise.all([
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/sla/policies').then((r) => r.json()),
    ]).then(([cData, pData]) => {
      setCustomers(cData.customers ?? []);
      setPolicies(pData.policies ?? []);
      if (cData.customers?.[0]) setCustomerId(cData.customers[0].id);
      if (pData.policies?.[0]) setSlaPolicyId(pData.policies[0].id);
    });
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          title,
          startDate,
          endDate,
          slaPolicyId: slaPolicyId || null,
          contractValue,
        }),
      });

      if (res.ok) {
        setTitle('');
        setIsFormOpen(false);
        fetchContracts();
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
            <ShieldCheck className="w-7 h-7 text-brand-orange" />
            Customer Maintenance Contracts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Service Level Agreements (SLAs), multi-site maintenance coverage, and contract-specific labor rate cards.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'Create Contract'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateContract} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Create Maintenance Contract</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Contract Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2026 Mining Equipment Full PM Maintenance SLA"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Annual Contract Value (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Assigned SLA Policy</label>
            <select
              value={slaPolicyId}
              onChange={(e) => setSlaPolicyId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="">-- Default Standard SLA --</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.policyNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading service contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No maintenance contracts created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Contract #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">SLA Policy</th>
                  <th className="p-3.5">Value (GHS)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {contracts.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{cnt.contractNumber}</td>
                    <td className="p-3.5 font-medium text-white">{cnt.customer?.name}</td>
                    <td className="p-3.5 text-slate-300">{cnt.title}</td>
                    <td className="p-3.5 text-slate-400">{cnt.slaPolicy?.name ?? 'Standard'}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {cnt.contractValue}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">
                        {cnt.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/contracts/${cnt.id}`}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors inline-flex items-center gap-1"
                      >
                        Rate Cards <ArrowRight className="w-3.5 h-3.5" />
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
