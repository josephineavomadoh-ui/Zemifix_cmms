'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Shield, FileText } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/inventory" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-brand-orange" /> Stock Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Authoritative, append-only immutable stock movement ledger enforcing Weighted Average Cost (WAC) valuation.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading stock transaction ledger...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No stock transactions posted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Txn Reference</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Store</th>
                  <th className="p-3.5">Part / Item</th>
                  <th className="p-3.5">Qty</th>
                  <th className="p-3.5">Unit Cost</th>
                  <th className="p-3.5">Total Cost</th>
                  <th className="p-3.5">Balance After</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{t.transactionRef}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                        ['RECEIPT', 'OPENING_BALANCE', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(t.transactionType)
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{t.store?.name}</td>
                    <td className="p-3.5 font-medium text-white">{t.part?.name} ({t.part?.partNumber})</td>
                    <td className="p-3.5 font-mono font-bold text-slate-200">{t.quantity}</td>
                    <td className="p-3.5 font-mono text-slate-400">GHS {t.unitCost}</td>
                    <td className="p-3.5 font-mono font-semibold text-emerald-400">GHS {t.totalCost}</td>
                    <td className="p-3.5 font-mono text-slate-200">{t.balanceAfter}</td>
                    <td className="p-3.5 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
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
