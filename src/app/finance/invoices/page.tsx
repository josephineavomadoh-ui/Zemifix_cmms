'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt, Plus, Check, ShieldCheck, DollarSign, ArrowRight, PackageCheck } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [itemDesc, setItemDesc] = useState<string>('Completed Maintenance Job Services');
  const [itemQty, setItemQty] = useState<string>('1');
  const [itemPrice, setItemPrice] = useState<string>('1000');
  const [dueDate, setDueDate] = useState<string>('2026-12-31');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Payment Modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('1000');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/invoices');
      const data = await res.json();
      if (res.ok) setInvoices(data.invoices ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers ?? []);
        if (data.customers?.[0]) setCustomerId(data.customers[0].id);
      });
  }, []);

  const handleCreateDraftInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          dueDate,
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
        setIsFormOpen(false);
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/invoices/${id}/approve`, { method: 'POST' });
      if (res.ok) fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedInvoice.customerId,
          invoiceId: selectedInvoice.id,
          amount: paymentAmount,
        }),
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(data.error || 'Payment recording failed');
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
            <Receipt className="w-7 h-7 text-brand-orange" />
            Commercial Invoicing & Accounts Receivable
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Issue commercial invoices, allocate gapless numbers upon approval, compute Ghana statutory taxes (VAT 15%, NHIL 2.5%, GETFund 2.5%), and record payment remittances.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'Create Draft Invoice'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreateDraftInvoice} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Create Draft Commercial Invoice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Customer Account</label>
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
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Billing Item Description</label>
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
              {submitting ? 'Creating Draft...' : 'Save Draft Invoice'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading commercial invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No commercial invoices generated yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Invoice / Ref #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">Taxes (VAT+NHIL+GETFund)</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Balance Due</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices.map((inv) => {
                  const totalTax = parseFloat(inv.vatAmount ?? 0) + parseFloat(inv.nhilAmount ?? 0) + parseFloat(inv.getFundAmount ?? 0);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-medium text-brand-orange">
                        {inv.invoiceNumber ?? inv.draftReference}
                      </td>
                      <td className="p-3.5 font-medium text-white">{inv.customer?.name}</td>
                      <td className="p-3.5 font-mono text-slate-300">GHS {inv.subtotal}</td>
                      <td className="p-3.5 font-mono text-slate-400">GHS {totalTax.toFixed(2)}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {inv.totalAmount}</td>
                      <td className="p-3.5 font-mono font-bold text-amber-400">GHS {inv.balanceDue}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {inv.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApproveInvoice(inv.id)}
                            className="px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {inv.status !== 'DRAFT' && inv.status !== 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentAmount(inv.balanceDue);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <h3 className="font-semibold text-lg text-white">Record Customer Payment Remittance</h3>
            <p className="text-xs text-slate-400">
              Allocating payment against Invoice <span className="font-mono text-brand-orange">{selectedInvoice.invoiceNumber ?? selectedInvoice.draftReference}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Remittance Amount (GHS)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {submitting ? 'Recording...' : 'Allocate Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
