'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockInvoices, mockBranches } from '@/src/lib/mockData';
import { InvoiceRecord } from '@/src/lib/types';
import {
  DollarSign,
  Search,
  Filter,
  Plus,
  Receipt,
  CheckCircle2,
  FileText,
  Clock,
  Building,
  CreditCard,
  Percent,
  X,
  ChevronRight,
  Printer,
  Download,
} from 'lucide-react';

export default function FinancePage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(mockInvoices);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientName, setClientName] = useState('Meridian Maritime Terminals Ltd.');
  const [clientTin, setClientTin] = useState('C0019283748');
  const [workOrderRef, setWorkOrderRef] = useState('WO-00284');
  const [subtotalInput, setSubtotalInput] = useState('25000');
  const [branchName, setBranchName] = useState('Tema Industrial Region');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered list
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientTin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.workOrderRef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== 'Paid').reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalTaxes = invoices.reduce((sum, inv) => sum + inv.totalTax, 0);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = parseFloat(subtotalInput) || 10000;
    const vat = subtotal * 0.15;
    const nhil = subtotal * 0.025;
    const getFund = subtotal * 0.025;
    const covid = subtotal * 0.01;
    const totalTax = vat + nhil + getFund + covid;
    const grandTotal = subtotal + totalTax;

    const newInv: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      number: `INV-2026-00${46 + invoices.length}`,
      clientName,
      clientTin,
      workOrderRef,
      branchName,
      issueDate: '2026-11-08',
      dueDate: '2026-12-08',
      subtotal,
      vatAmount: vat,
      nhilAmount: nhil,
      getFundAmount: getFund,
      covidAmount: covid,
      totalTax,
      grandTotal,
      currency: 'GH₵',
      status: 'Issued',
      paymentTerms,
    };

    setInvoices([newInv, ...invoices]);
    setShowCreateModal(false);
    setNotification(`Invoice ${newInv.number} generated with Ghana standard levies applied.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleMarkAsPaid = (invId: string) => {
    const updated = invoices.map((inv) => (inv.id === invId ? { ...inv, status: 'Paid' as const } : inv));
    setInvoices(updated);
    if (selectedInvoice && selectedInvoice.id === invId) {
      setSelectedInvoice({ ...selectedInvoice, status: 'Paid' });
    }
    setNotification('Invoice marked as Paid and cleared into revenue ledger.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Domain 08: Finance, Billing & Taxation</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Finance, Billing & Costing
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer maintenance billing, work order costing, and statutory Ghana tax scheme reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Generate Invoice</span>
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {notification && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {/* Ghana Statutory Tax Breakdown Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#FF5B00]" />
              <h3 className="text-xs font-bold text-[#0B1336] uppercase tracking-wide">
                Ghana Statutory Tax Framework (GRA Standard Scheme)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Effective Rate: 21.0%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Standard VAT</span>
              <div className="font-bold text-slate-900 mt-0.5">15.0%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Value Added Tax Act (Act 870)</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">NHIL</span>
              <div className="font-bold text-slate-900 mt-0.5">2.5%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">National Health Insurance Levy</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">GETFund Levy</span>
              <div className="font-bold text-slate-900 mt-0.5">2.5%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Ghana Education Trust Fund</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">COVID-19 HRL</span>
              <div className="font-bold text-slate-900 mt-0.5">1.0%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Health Recovery Levy (Act 1068)</p>
            </div>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Invoiced</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0B1336] tabular-nums font-mono">
                GH₵ {(totalBilled / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-slate-500">Gross Billings</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Collections Received</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-emerald-600 tabular-nums font-mono">
                GH₵ {(totalPaid / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-emerald-600">Paid In Full</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Outstanding AR</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-amber-600 tabular-nums font-mono">
                GH₵ {(totalOutstanding / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-amber-600 font-medium">Within Terms</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Taxes Withheld/Remitted</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 tabular-nums font-mono">
                GH₵ {(totalTaxes / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-slate-500">GRA Scheduled</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice #, client name, TIN, WO reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Invoices</option>
                <option value="Issued">Issued (Unpaid)</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client Name & TIN</th>
                  <th className="py-3 px-4">Work Order Ref</th>
                  <th className="py-3 px-4">Issue & Due Date</th>
                  <th className="py-3 px-4 text-right">Subtotal (GH₵)</th>
                  <th className="py-3 px-4 text-right">Taxes (21%)</th>
                  <th className="py-3 px-4 text-right">Grand Total (GH₵)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                      {inv.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                        {inv.clientName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        TIN: {inv.clientTin}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {inv.workOrderRef}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div>{inv.issueDate}</div>
                      <div className="text-[10px] text-slate-400">Due: {inv.dueDate}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {inv.subtotal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {inv.totalTax.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {inv.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 group-hover:text-[#FF5B00] group-hover:bg-orange-50 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail Drawer */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedInvoice.number}
                      </span>
                      <StatusBadge status={selectedInvoice.status} size="sm" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedInvoice.clientName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      TIN: {selectedInvoice.clientTin} · Branch: {selectedInvoice.branchName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Tax Breakdown Matrix */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Statutory Tax Schedule</span>
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                        <span>Net Maintenance Services Subtotal:</span>
                        <span className="font-bold">GH₵ {selectedInvoice.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Standard VAT (15.0%):</span>
                        <span>GH₵ {selectedInvoice.vatAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>NHIL Levy (2.5%):</span>
                        <span>GH₵ {selectedInvoice.nhilAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>GETFund Levy (2.5%):</span>
                        <span>GH₵ {selectedInvoice.getFundAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-600 border-b border-slate-100 pb-2">
                        <span>COVID-19 Recovery Levy (1.0%):</span>
                        <span>GH₵ {selectedInvoice.covidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-bold text-[#0B1336]">
                        <span>Grand Invoice Total:</span>
                        <span>GH₵ {selectedInvoice.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Terms</span>
                      <div className="font-bold text-slate-900 mt-1">{selectedInvoice.paymentTerms}</div>
                      <div className="text-[11px] text-slate-500">Due: {selectedInvoice.dueDate}</div>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Work Order Source</span>
                      <div className="font-bold text-[#FF5B00] font-mono mt-1">{selectedInvoice.workOrderRef}</div>
                      <div className="text-[11px] text-slate-500">Verified & Approved</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                {selectedInvoice.status !== 'Paid' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Mark As Paid</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Generate Invoice */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-[#FF5B00]" />
                  <span>Generate Customer Tax Invoice</span>
                </h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Client Organization *</label>
                    <input
                      required
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Meridian Maritime Terminals"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Client TIN *</label>
                    <input
                      required
                      type="text"
                      value={clientTin}
                      onChange={(e) => setClientTin(e.target.value)}
                      placeholder="e.g. C0019283748"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Linked Work Order</label>
                    <input
                      required
                      type="text"
                      value={workOrderRef}
                      onChange={(e) => setWorkOrderRef(e.target.value)}
                      placeholder="e.g. WO-00284"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Operating Branch</label>
                    <select
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {mockBranches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Net Labor & Parts (GH₵) *</label>
                    <input
                      required
                      type="number"
                      value={subtotalInput}
                      onChange={(e) => setSubtotalInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Payment Terms</label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Immediate / Wire">Immediate / Wire</option>
                    </select>
                  </div>
                </div>

                {/* Auto Calculated Live Breakdown */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base:</span>
                    <span>GH₵ {(parseFloat(subtotalInput) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ghana Levies (21.0% total):</span>
                    <span>GH₵ {((parseFloat(subtotalInput) || 0) * 0.21).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>Invoice Total:</span>
                    <span>GH₵ {((parseFloat(subtotalInput) || 0) * 1.21).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200]"
                  >
                    Issue Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
