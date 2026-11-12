'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'details' | 'sla' | 'rates'>('details');

  useEffect(() => {
    fetch(`/api/contracts/${id}`)
      .then((res) => res.json())
      .then((data) => { if (data.contract) setContract(data.contract); })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16">
        <EmptyState
          icon={ShieldCheck}
          title="Contract not found"
          description="This contract may not exist or you may not have access."
          action={
            <Link
              href="/contracts"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#F95700]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Contracts
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { key: 'details', label: 'Contract Details' },
    { key: 'sla', label: 'SLA Configuration' },
    { key: 'rates', label: `Rate Cards (${contract.laborRates?.length ?? 0})` },
  ] as const;

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  // Check if contract is nearing expiry (< 30 days)
  const daysUntilExpiry = contract.endDate
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isNearExpiry = daysUntilExpiry !== null && daysUntilExpiry <= 30;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contracts"
        eyebrowIcon={ShieldCheck}
        title={contract.title}
        breadcrumbs={[
          { label: 'Contracts', href: '/contracts' },
          { label: contract.contractNumber },
        ]}
      />

      {/* Expiry warning */}
      {isNearExpiry && daysUntilExpiry !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          This contract expires in {daysUntilExpiry <= 0 ? 'less than a day' : `${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}. Consider renewing.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contract #</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-[#FF5B00]">{contract.contractNumber}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-1.5"><StatusBadge status={contract.status} /></div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contract Value</p>
          <p className="mt-1.5 text-sm font-mono font-bold text-emerald-700">GHS {contract.contractValue}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expires</p>
          <p className={`mt-1.5 text-sm font-semibold ${isNearExpiry ? 'text-amber-700' : 'text-slate-700'}`}>
            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-[#FF5B00] text-[#FF5B00]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contract Information</h3>
            <dl className="space-y-3">
              {[
                { label: 'Customer', value: contract.customer?.name ?? 'N/A' },
                { label: 'SLA Policy', value: contract.slaPolicy?.name ?? 'Standard' },
                { label: 'Start Date', value: contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'N/A' },
                { label: 'End Date', value: contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-400 font-medium">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          {!contract.slaPolicy ? (
            <EmptyState icon={ShieldCheck} title="No SLA policy assigned" description="Assign an SLA policy to this contract to enforce response and resolution targets." />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-slate-800">{contract.slaPolicy.name}</div>
                <div className="font-mono text-xs text-[#FF5B00] mt-0.5">{contract.slaPolicy.policyNumber}</div>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Priority Rules</div>
                {(contract.slaPolicy.rules ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                    <span className="font-semibold text-slate-600">{r.priority}</span>
                    <span className="font-mono text-slate-500">
                      Resp {r.responseTargetMinutes}m &nbsp;|&nbsp; Res {r.resolutionTargetMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {!contract.laborRates?.length ? (
            <EmptyState icon={DollarSign} title="No rate cards defined" description="Add labor rate cards to this contract to manage billing rates." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>Role / Skill</th>
                    <th className={thClass}>Hourly Rate (GHS)</th>
                    <th className={thClass}>Effective From</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contract.laborRates.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-medium text-slate-800`}>{r.roleOrSkill}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {r.hourlyRate}</td>
                      <td className={`${tdClass} text-slate-500`}>{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
