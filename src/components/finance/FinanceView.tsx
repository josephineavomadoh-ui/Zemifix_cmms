'use client';

import React, { useMemo, useState } from 'react';
import { Receipt, Plus, TrendingUp, TrendingDown, CircleDollarSign, AlertTriangle } from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { demoInvoices, demoBudgets, demoExpenses, demoPayments, demoCustomers, ghTaxBreakdown, expenditureTrend } from '@/src/lib/demo/finance';
import { formatGhs } from '@/src/lib/demo/common';
import type { Invoice, Budget, ExpenseRecord } from '@/src/lib/types';

const INV_STYLE: Record<string, string> = {
  Draft: 'bg-slate-50 text-slate-500 border-slate-200', Issued: 'bg-blue-50 text-blue-700 border-blue-200',
  PartiallyPaid: 'bg-amber-50 text-amber-700 border-amber-200', Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200', Cancelled: 'bg-slate-100 text-slate-400 border-slate-200',
};

const TABS = [
  { id: 'expenditure', label: 'Expenditure' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'invoices', label: 'Customer Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'customers', label: 'Customers' },
];

export const FinanceView: React.FC = () => {
  const [tab, setTab] = useState('expenditure');
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [newInvOpen, setNewInvOpen] = useState(false);

  const kpis = useMemo(() => ({
    totalExpenditure: demoExpenses.reduce((s, e) => s + e.amount, 0),
    totalReceivable: demoInvoices.filter((i) => !['Paid', 'Cancelled'].includes(i.status)).reduce((s, i) => s + (i.total - i.paid), 0),
    overdue: demoInvoices.filter((i) => i.status === 'Overdue').reduce((s, i) => s + i.total, 0),
    collected: demoPayments.reduce((s, p) => s + p.amount, 0),
  }), []);

  const spendTotal = expenditureTrend.map((m) => m.labour + m.parts + m.contractor);
  const maxSpend = Math.max(...spendTotal, 1);

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Finance & Billing</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Finance & Billing</h1>
          <p className="mt-1 text-sm text-slate-500">Maintenance expenditure, work order costing, budgets, customer invoicing and Ghana tax breakdown.</p>
        </div>
        <button onClick={() => setNewInvOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]"><Plus className="h-4 w-4" />New Invoice</button>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;Illustrative financial records — not connected to live accounting APIs.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { icon: TrendingDown, v: formatGhs(kpis.totalExpenditure), l: 'Month expenditure', cls: 'bg-slate-100 text-[#0B1336]' },
          { icon: CircleDollarSign, v: formatGhs(kpis.totalReceivable), l: 'Total receivable', cls: 'bg-orange-50 text-[#D94D00]' },
          { icon: AlertTriangle, v: formatGhs(kpis.overdue), l: 'Overdue invoices', cls: kpis.overdue > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-[#0B1336]' },
          { icon: TrendingUp, v: formatGhs(kpis.collected), l: 'Collected (period)', cls: 'bg-emerald-50 text-emerald-700' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.l} className={`flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 shadow-sm ${c.cls}`}>
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="text-sm font-bold tabular-nums">{c.v}</span>
              <span className="text-[11px] font-medium opacity-70">{c.l}</span>
            </div>
          );
        })}
      </div>

      {/* Spend chart + budget overview */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Spend trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly maintenance spend</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">6-Month Expenditure Trend</h3>
          <div className="flex h-28 items-end gap-2 border-b border-slate-100 pb-1">
            {expenditureTrend.map((m, i) => {
              const total = m.labour + m.parts + m.contractor;
              const pct = Math.max((total / maxSpend) * 100, 4);
              return (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[9px] tabular-nums text-slate-400">{(total / 1000).toFixed(0)}k</span>
                  <div title={`${m.month}: ${formatGhs(total)}`} className="w-full max-w-8 rounded-t bg-[#0B1336] transition-colors hover:bg-[#FF5B00]" style={{ height: `${pct}%` }} />
                  <span className="text-[9px] font-medium text-slate-400">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            {[['Labour', expenditureTrend[5].labour], ['Parts', expenditureTrend[5].parts], ['Contractor', expenditureTrend[5].contractor]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-400">{l}</p><p className="font-bold text-slate-700">{formatGhs(v as number)}</p></div>
            ))}
          </div>
        </div>

        {/* Ghana tax info */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tax configuration</p>
          <h3 className="mb-3 text-sm font-bold text-[#0B1336]">Ghana Tax Components</h3>
          <div className="space-y-2">
            {ghTaxBreakdown(100).map((t) => (
              <div key={t.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-700">{t.label}</span>
                <span className="font-mono font-bold text-slate-800">{t.rate}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400">Rates are read from system configuration — not hardcoded. Update in System Settings → Finance.</p>

          {/* Budget utilization mini overview */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Budget utilization — this month</p>
            <div className="space-y-2">
              {demoBudgets.slice(0, 3).map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="truncate text-slate-600 max-w-[160px]">{b.category}</span>
                    <span className={`font-bold ${b.utilization > 100 ? 'text-rose-600' : 'text-slate-600'}`}>{b.utilization}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${b.utilization > 100 ? 'bg-rose-400' : b.utilization > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(b.utilization, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-100 px-4">
          <nav className="-mb-px flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${tab === t.id ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
            ))}
          </nav>
        </div>

        {tab === 'expenditure' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Expense', 'Category', 'Description', 'Work Order', 'Amount', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {demoExpenses.map((e, i) => (
                  <tr key={e.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{e.number}</p><p className="text-[10px] text-slate-400">{e.date}</p></td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{e.category}</span></td>
                    <td className="px-4 py-3 max-w-[200px]"><p className="truncate text-xs text-slate-600">{e.description}</p></td>
                    <td className="px-4 py-3">{e.workOrderNumber ? <span className="font-mono text-[11px] text-[#FF5B00]">{e.workOrderNumber}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(e.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{demoExpenses.length} expense records · demonstration dataset</div>
          </div>
        )}

        {tab === 'budgets' && (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoBudgets.map((b) => (
              <div key={b.id} className={`rounded-xl border p-4 ${b.utilization > 100 ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'}`}>
                <p className="font-mono text-[10px] text-slate-400">{b.branchName}</p>
                <p className="font-bold text-slate-800">{b.category}</p>
                <div className="mt-2 flex items-end justify-between text-xs">
                  <span className="text-slate-500">{formatGhs(b.spent)} <span className="text-slate-300">/ {formatGhs(b.budgeted)}</span></span>
                  <span className={`font-bold ${b.utilization > 100 ? 'text-rose-600' : b.utilization > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{b.utilization}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${b.utilization > 100 ? 'bg-rose-400' : b.utilization > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(b.utilization, 100)}%` }} />
                </div>
                {b.utilization > 100 && <p className="mt-1 text-[10px] font-semibold text-rose-600">Over by {formatGhs(b.spent - b.budgeted)}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Invoice', 'Customer', 'Work Order', 'Due', 'Total', 'Paid', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {demoInvoices.map((inv, i) => (
                  <tr key={inv.id} onClick={() => setSelectedInv(inv)} className={`group cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{inv.number}</p><p className="text-[10px] text-slate-400">{inv.issueDate}</p></td>
                    <td className="px-4 py-3 max-w-[160px]"><p className="truncate font-medium text-slate-700">{inv.customer}</p></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#FF5B00]">{inv.workOrderNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{inv.dueDate}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(inv.total)}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-600">{formatGhs(inv.paid)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${INV_STYLE[inv.status]}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{demoInvoices.length} invoices · contractor mode · demonstration dataset</div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Payment', 'Invoice', 'Customer', 'Date', 'Method', 'Amount', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {demoPayments.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 font-mono text-[11px] font-bold text-[#0B1336]">{p.number}</td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#FF5B00]">{p.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.customer}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{p.date}</td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{p.method}</span></td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(p.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'customers' && (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoCustomers.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1336] text-[10px] font-bold text-white">{c.code}</div>
                  <div className="min-w-0"><p className="truncate font-bold text-slate-900">{c.name}</p><p className="text-[10px] text-slate-400">{c.contractRef}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-400">Outstanding</p><p className={`font-bold ${c.outstandingBalance > 0 ? 'text-[#FF5B00]' : 'text-emerald-600'}`}>{formatGhs(c.outstandingBalance)}</p></div>
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-400">Active WOs</p><p className="font-bold text-slate-800">{c.activeWorkOrders}</p></div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">{c.contactName} · {c.phone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice drawer */}
      <Drawer open={!!selectedInv} onClose={() => setSelectedInv(null)} title={selectedInv?.number ?? ''} subtitle={selectedInv?.customer} width="md">
        {selectedInv && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${INV_STYLE[selectedInv.status]}`}>
              <span className="h-2 w-2 rounded-full bg-current" />{selectedInv.status}
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-3 py-2.5 text-slate-500">Subtotal</td><td className="px-3 py-2.5 text-right font-mono">{formatGhs(selectedInv.subtotal)}</td></tr>
                  {ghTaxBreakdown(selectedInv.subtotal).map((t) => <tr key={t.label}><td className="px-3 py-2 text-slate-400">{t.label}</td><td className="px-3 py-2 text-right font-mono text-slate-500">{formatGhs(t.amount)}</td></tr>)}
                  <tr className="bg-[#0B1336] text-white"><td className="px-3 py-3 font-bold">Total</td><td className="px-3 py-3 text-right font-mono font-bold">{formatGhs(selectedInv.total)}</td></tr>
                  <tr><td className="px-3 py-2.5 font-semibold text-emerald-600">Paid</td><td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-600">{formatGhs(selectedInv.paid)}</td></tr>
                  {selectedInv.total - selectedInv.paid > 0 && <tr className="bg-rose-50"><td className="px-3 py-2.5 font-bold text-rose-700">Outstanding</td><td className="px-3 py-2.5 text-right font-mono font-bold text-rose-700">{formatGhs(selectedInv.total - selectedInv.paid)}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2"><button className="flex-1 rounded-lg bg-[#FF5B00] py-2 text-xs font-bold text-white hover:bg-[#E65200]">Record Payment</button><button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Send Reminder</button></div>
          </div>
        )}
      </Drawer>

      <Modal open={newInvOpen} onClose={() => setNewInvOpen(false)} title="New Customer Invoice" subtitle="Contractor mode — invoice linked to a completed work order." size="md"
        footer={<><ModalButton variant="secondary" onClick={() => setNewInvOpen(false)}>Cancel</ModalButton><ModalButton onClick={() => setNewInvOpen(false)}>Create Invoice</ModalButton></>}
      >
        <div className="space-y-3">
          {['Customer', 'Work order number', 'Invoice date', 'Due date', 'Line item description', 'Amount (before tax)'].map((l) => <Field key={l} label={l}><input className={inputClass} placeholder={l} /></Field>)}
          <p className="text-[11px] text-amber-600">Demo — invoice will not persist to accounts.</p>
        </div>
      </Modal>
    </div>
  );
};
