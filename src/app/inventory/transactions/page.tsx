'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function StockTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/inventory/transactions')
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  const inTypes = ['RECEIPT', 'OPENING_BALANCE', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={History}
        title="Stock Transaction Ledger"
        description="Authoritative, append-only immutable stock movement ledger enforcing Weighted Average Cost (WAC) valuation."
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Transaction Ledger' },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={8} columns={9} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No stock transactions posted yet"
            description="Receive opening stock or process stock issues/receipts to see transactions here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Txn Reference</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Store</th>
                  <th className={thClass}>Part / Item</th>
                  <th className={thClass}>Qty</th>
                  <th className={thClass}>Unit Cost</th>
                  <th className={thClass}>Total Cost</th>
                  <th className={thClass}>Balance After</th>
                  <th className={thClass}>Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isIn = inTypes.includes(t.transactionType);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{t.transactionRef}</td>
                      <td className={tdClass}>
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
                            isIn
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {t.transactionType}
                        </span>
                      </td>
                      <td className={`${tdClass} text-slate-600`}>{t.store?.name}</td>
                      <td className={tdClass}>
                        <div className="font-medium text-slate-800">{t.part?.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{t.part?.partNumber}</div>
                      </td>
                      <td className={`${tdClass} font-mono font-bold text-slate-700`}>{t.quantity}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>GHS {t.unitCost}</td>
                      <td className={`${tdClass} font-mono font-semibold text-emerald-700`}>GHS {t.totalCost}</td>
                      <td className={`${tdClass} font-mono text-slate-700`}>{t.balanceAfter}</td>
                      <td className={`${tdClass} text-slate-400 text-xs`}>{new Date(t.createdAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
