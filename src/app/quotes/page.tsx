'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, Plus, Check, ShieldCheck, ArrowRight } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-brand-orange" />
            Commercial Quotations Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Prepare customer quotations, line items, Ghana statutory taxes (VAT 15%, NHIL 2.5%, GETFund 2.5%), and internal maker-checker approvals.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'New Quote'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateQuote} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Create Commercial Quotation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.customerNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Quote Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Jaw Crusher Overhaul & Motor Replacement"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">BOQ Item Description</label>
              <input
                type="text"
                required
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Creating Quote...' : 'Create Draft Quote'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading quotations...</div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No quotations created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Quote #</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">Taxes (VAT+NHIL+GETFund)</th>
                  <th className="p-3.5">Total (GHS)</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quotes.map((q) => {
                  const totalTax = parseFloat(q.vatAmount ?? 0) + parseFloat(q.nhilAmount ?? 0) + parseFloat(q.getFundAmount ?? 0);

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-medium text-brand-orange">{q.quoteNumber}</td>
                      <td className="p-3.5 font-mono text-slate-300">v{q.version}</td>
                      <td className="p-3.5 font-medium text-white">{q.customer?.name}</td>
                      <td className="p-3.5 text-slate-300">{q.title}</td>
                      <td className="p-3.5 font-mono text-slate-300">GHS {q.subtotal}</td>
                      <td className="p-3.5 font-mono text-slate-400">GHS {totalTax.toFixed(2)}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {q.totalAmount}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                          {q.status}
                        </span>
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
