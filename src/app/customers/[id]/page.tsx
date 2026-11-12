'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Building, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'info' | 'sites' | 'contracts'>('info');

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((res) => res.json())
      .then((data) => { if (data.customer) setCustomer(data.customer); })
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

  if (!customer) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16">
        <EmptyState
          icon={Users}
          title="Customer not found"
          description="This customer account may not exist or you may not have access."
          action={
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#F95700]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to Customers
            </Link>
          }
        />
      </div>
    );
  }

  const tabs = [
    { key: 'info', label: 'Info' },
    { key: 'sites', label: `Sites (${customer.sites?.length ?? 0})` },
    { key: 'contracts', label: `Contracts (${customer.contracts?.length ?? 0})` },
  ] as const;

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        eyebrowIcon={Users}
        title={customer.name}
        breadcrumbs={[
          { label: 'Customers', href: '/customers' },
          { label: customer.customerNumber },
        ]}
      />

      {/* Summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Customer #</p>
          <p className="mt-1.5 font-mono text-sm font-bold text-[#FF5B00]">{customer.customerNumber}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">GRA TIN</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700 font-mono">{customer.taxId ?? 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sites</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-700">{customer.sites?.length ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Contracts</p>
          <p className="mt-1.5 text-sm font-semibold text-emerald-700">{customer.contracts?.length ?? 0}</p>
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

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-slate-700">{customer.primaryEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-slate-700">{customer.primaryPhone}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-700">{customer.billingAddress}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sites' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {!customer.sites?.length ? (
            <EmptyState icon={Building} title="No sites registered" description="No customer sites have been added to this account." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>Site Name</th>
                    <th className={thClass}>Code</th>
                    <th className={thClass}>Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.sites.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-medium text-slate-800`}>{s.name}</td>
                      <td className={`${tdClass} font-mono text-[#FF5B00]`}>{s.code}</td>
                      <td className={`${tdClass} text-slate-600`}>{s.address ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {!customer.contracts?.length ? (
            <EmptyState icon={FileText} title="No contracts" description="No maintenance contracts are linked to this customer." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={thClass}>Contract #</th>
                    <th className={thClass}>Title</th>
                    <th className={thClass}>Value (GHS)</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customer.contracts.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>
                        <Link href={`/contracts/${c.id}`} className="hover:underline">{c.contractNumber}</Link>
                      </td>
                      <td className={`${tdClass} text-slate-700`}>{c.title}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {c.contractValue}</td>
                      <td className={tdClass}><StatusBadge status={c.status} /></td>
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
