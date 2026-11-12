'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Plus, Check, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';
  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contracts"
        eyebrowIcon={ShieldCheck}
        title="Customer Maintenance Contracts"
        description="Service Level Agreements (SLAs), multi-site maintenance coverage, and contract-specific labor rate cards."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'Create Contract'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreateContract} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Create Maintenance Contract</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Select Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Contract Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 2026 Mining Equipment Full PM Maintenance SLA"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Annual Contract Value (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Assigned SLA Policy</label>
            <select
              value={slaPolicyId}
              onChange={(e) => setSlaPolicyId(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Default Standard SLA --</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.policyNumber})
                </option>
              ))}
            </select>
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
              {submitting ? 'Creating…' : 'Create Contract'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : contracts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No maintenance contracts created yet"
            description="Create a service contract to manage SLAs and billing for a customer."
            action={{ label: 'Create Contract', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Contract #</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>SLA Policy</th>
                  <th className={thClass}>Value (GHS)</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{cnt.contractNumber}</td>
                    <td className={`${tdClass} font-medium text-slate-800`}>{cnt.customer?.name}</td>
                    <td className={`${tdClass} text-slate-600`}>{cnt.title}</td>
                    <td className={`${tdClass} text-slate-500`}>{cnt.slaPolicy?.name ?? 'Standard'}</td>
                    <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {cnt.contractValue}</td>
                    <td className={tdClass}>
                      <StatusBadge status={cnt.status} />
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/contracts/${cnt.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        Rate Cards <ArrowRight className="h-3.5 w-3.5" />
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
