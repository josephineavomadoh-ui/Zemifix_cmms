'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, Plus, Check } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';
  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        eyebrowIcon={Receipt}
        title="Commercial Invoicing & Accounts Receivable"
        description="Issue commercial invoices, allocate gapless numbers upon approval, compute Ghana statutory taxes (VAT 15%, NHIL 2.5%, GETFund 2.5%), and record payment remittances."
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'Create Draft Invoice'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreateDraftInvoice} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Create Draft Commercial Invoice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Customer Account</label>
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
              <label className={labelClass}>Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Billing Item Description</label>
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
              {submitting ? 'Creating Draft…' : 'Save Draft Invoice'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={8} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No commercial invoices generated yet"
            description="Create a draft invoice and approve it to assign a gapless invoice number."
            action={{ label: 'Create Draft Invoice', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Invoice / Ref #</th>
                  <th className={thClass}>Customer</th>
                  <th className={thClass}>Subtotal</th>
                  <th className={thClass}>Taxes</th>
                  <th className={thClass}>Total Amount</th>
                  <th className={thClass}>Balance Due</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const totalTax = parseFloat(inv.vatAmount ?? 0) + parseFloat(inv.nhilAmount ?? 0) + parseFloat(inv.getFundAmount ?? 0);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>
                        {inv.invoiceNumber ?? inv.draftReference}
                      </td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{inv.customer?.name}</td>
                      <td className={`${tdClass} font-mono text-slate-600`}>GHS {inv.subtotal}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>GHS {totalTax.toFixed(2)}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {inv.totalAmount}</td>
                      <td className={`${tdClass} font-mono font-bold text-amber-700`}>GHS {inv.balanceDue}</td>
                      <td className={tdClass}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleApproveInvoice(inv.id)}
                              className="rounded px-2.5 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
                              className="rounded px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="rounded-xl border border-slate-200 bg-white max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-slate-800">Record Customer Payment Remittance</h3>
            <p className="text-xs text-slate-500">
              Allocating payment against Invoice{' '}
              <span className="font-mono font-semibold text-[#FF5B00]">
                {selectedInvoice.invoiceNumber ?? selectedInvoice.draftReference}
              </span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Remittance Amount (GHS)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'Recording…' : 'Allocate Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
