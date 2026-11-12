'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Check } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

export default function QuotesManagementPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [itemDesc, setItemDesc] = useState<string>('Standard Maintenance Service');
  const [itemQty, setItemQty] = useState<string>('1');
  const [itemPrice, setItemPrice] = useState<string>('500');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (res.ok) setQuotes(data.quotes ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();

    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers ?? []);
        if (data.customers?.[0]) setCustomerId(data.customers[0].id);
      });
  }, []);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          title,
          items: [
            {
              description: itemDesc,
              quantity: itemQty,
              unitPrice: itemPrice,
            },
          ],
        }),
      });

      if (res.ok) {
        setTitle('');
        setIsFormOpen(false);
        fetchQuotes();
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
        eyebrow="Quotes"
        eyebrowIcon={DollarSign}
        title="Commercial Quotations"
        description="Prepare customer quotations, line items, Ghana statutory taxes (VAT 15%, NHIL 2.5%, GETFund 2.5%), and internal maker-checker approvals."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'New Quote'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreateQuote} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Create Commercial Quotation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customerNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Quote Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Jaw Crusher Overhaul & Motor Replacement"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>BOQ Item Description</label>
              <input
                type="text"
                required
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className={inputClass}
              />
            </div>
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
              {submitting ? 'Creating Quote…' : 'Create Draft Quote'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={8} />
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No quotations created yet"
            description="Create your first commercial quotation for a customer."
            action={{ label: 'New Quote', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Quote #</th>
                  <th className={thClass}>Version</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Subtotal</th>
                  <th className={thClass}>Taxes</th>
                  <th className={thClass}>Total (GHS)</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => {
                  const totalTax = parseFloat(q.vatAmount ?? 0) + parseFloat(q.nhilAmount ?? 0) + parseFloat(q.getFundAmount ?? 0);

                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{q.quoteNumber}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>v{q.version}</td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{q.customer?.name}</td>
                      <td className={`${tdClass} text-slate-600`}>{q.title}</td>
                      <td className={`${tdClass} font-mono text-slate-600`}>GHS {q.subtotal}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>GHS {totalTax.toFixed(2)}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {q.totalAmount}</td>
                      <td className={tdClass}>
                        <StatusBadge status={q.status} />
                      </td>
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
