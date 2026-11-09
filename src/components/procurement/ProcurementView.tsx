'use client';

import React, { useMemo, useState } from 'react';
import { Truck, Plus, Search, ShieldCheck, AlertTriangle, CheckCircle2, Star } from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { demoSuppliers, demoPurchaseRequisitions, demoPurchaseOrders, demoGoodsReceipts, demoSupplierInvoices } from '@/src/lib/demo/procurement';
import { formatGhs } from '@/src/lib/demo/common';
import type { Supplier, PurchaseRequisition, PurchaseOrder } from '@/src/lib/types';

const MODULE_TABS = [
  { id: 'requisitions', label: 'Requisitions' },
  { id: 'orders', label: 'Purchase Orders' },
  { id: 'receipts', label: 'Goods Receipts' },
  { id: 'invoices', label: 'Supplier Invoices' },
  { id: 'suppliers', label: 'Suppliers' },
];

const MATCH_STYLE: Record<string, string> = {
  Matched: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Price Variance': 'bg-amber-50 text-amber-700 border-amber-100',
  'Quantity Variance': 'bg-amber-50 text-amber-700 border-amber-100',
  Unmatched: 'bg-rose-50 text-rose-700 border-rose-100',
};

const APPROVAL_STYLE: Record<string, string> = {
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  NotRequired: 'bg-slate-50 text-slate-500 border-slate-200',
};

export const ProcurementView: React.FC = () => {
  const [tab, setTab] = useState('requisitions');
  const [search, setSearch] = useState('');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [createPROpen, setCreatePROpen] = useState(false);

  const kpis = useMemo(() => ({
    pendingPR: demoPurchaseRequisitions.filter((r) => r.approvalState === 'Pending').length,
    openPO: demoPurchaseOrders.filter((o) => ['Issued', 'PartiallyReceived'].includes(o.status)).length,
    unmatchedInv: demoSupplierInvoices.filter((i) => i.threeWayMatch !== 'Matched').length,
    totalPOValue: demoPurchaseOrders.reduce((s, o) => s + o.total, 0),
  }), []);

  const q = search.toLowerCase();
  const filteredPRs = demoPurchaseRequisitions.filter((r) => !q || r.number.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q));
  const filteredPOs = demoPurchaseOrders.filter((o) => !q || o.number.toLowerCase().includes(q) || o.supplier.toLowerCase().includes(q));
  const filteredSuppliers = demoSuppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Procurement</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Procurement & Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Supplier register, requisitions, dual-control approvals, purchase orders, goods receipt and 3-way matching.</p>
        </div>
        <button onClick={() => setCreatePROpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]"><Plus className="h-4 w-4" />New Requisition</button>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;Illustrative procurement records — not connected to live APIs.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          { v: kpis.pendingPR, l: 'Pending approvals', cls: kpis.pendingPR > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-[#0B1336]' },
          { v: kpis.openPO, l: 'Open POs', cls: 'border-slate-200 bg-white text-[#0B1336]' },
          { v: kpis.unmatchedInv, l: 'Unmatched invoices', cls: kpis.unmatchedInv > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-[#0B1336]' },
        ].map((c) => (
          <div key={c.l} className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm ${c.cls}`}>
            <span className="text-sm font-bold tabular-nums">{c.v}</span>
            <span className="text-[11px] font-medium opacity-75">{c.l}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-[11px] font-semibold text-slate-500">
          PO value&nbsp;<span className="font-bold text-[#0B1336]">{formatGhs(kpis.totalPOValue)}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="relative sm:max-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier, number…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-4">
          <nav className="-mb-px flex flex-wrap gap-1">
            {MODULE_TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${tab === t.id ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
            ))}
          </nav>
        </div>

        {/* Requisitions */}
        {tab === 'requisitions' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Requisition', 'Department', 'Lines', 'Estimate', 'Approval', 'Status', 'Linked PO'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {filteredPRs.map((r, i) => (
                  <tr key={r.id} onClick={() => setSelectedPR(r)} className={`group cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{r.number}</p><p className="text-[10px] text-slate-400">{r.date} · {r.requester}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.department}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.lines.length}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(r.totalEstimate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${APPROVAL_STYLE[r.approvalState]}`}>
                        <ShieldCheck className="h-3 w-3" />{r.approvalState}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">{r.convertedPONumber ? <span className="font-mono text-[11px] font-semibold text-[#FF5B00]">{r.convertedPONumber}</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{filteredPRs.length} requisitions · demonstration dataset</div>
          </div>
        )}

        {/* Purchase Orders */}
        {tab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['PO', 'Supplier', 'Expected', 'Order Value', 'Received', 'Approval', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {filteredPOs.map((o, i) => (
                  <tr key={o.id} onClick={() => setSelectedPO(o)} className={`group cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{o.number}</p><p className="text-[10px] text-slate-400">{o.date}</p></td>
                    <td className="px-4 py-3 font-medium text-slate-700">{o.supplier}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.expectedDelivery}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(o.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(o.receivedTotal / o.total) * 100}%` }} /></div>
                        <span className="font-mono text-[11px] font-semibold text-slate-600">{formatGhs(o.receivedTotal)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${APPROVAL_STYLE[o.approvalState]}`}>
                        <ShieldCheck className="h-3 w-3" />{o.approvalState}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{filteredPOs.length} purchase orders · demonstration dataset</div>
          </div>
        )}

        {/* Goods Receipts */}
        {tab === 'receipts' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['GRN', 'PO', 'Supplier', 'Lines', 'Received by', '3-Way Match'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {demoGoodsReceipts.map((g, i) => (
                  <tr key={g.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{g.number}</p><p className="text-[10px] text-slate-400">{g.date}</p></td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#FF5B00]">{g.poNumber}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.supplier}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.lines.length}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.receivedBy}</td>
                    <td className="px-4 py-3"><StatusBadge status={g.matched ? 'Matched' : 'Pending'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{demoGoodsReceipts.length} GRNs · demonstration dataset</div>
          </div>
        )}

        {/* Invoices */}
        {tab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Invoice', 'Supplier', 'PO', 'Amount', 'Due', '3-Way Match', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {demoSupplierInvoices.map((inv, i) => (
                  <tr key={inv.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{inv.number}</p><p className="text-[10px] text-slate-400">{inv.invoiceDate}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{inv.supplier}</td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#FF5B00]">{inv.poNumber}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(inv.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{inv.dueDate}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${MATCH_STYLE[inv.threeWayMatch]}`}>{inv.threeWayMatch}</span></td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">3-way match: PO → GRN → Invoice · {demoSupplierInvoices.length} invoices</div>
          </div>
        )}

        {/* Suppliers */}
        {tab === 'suppliers' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Supplier', 'Category', 'Contact', 'Rating', 'On-Time', 'Active POs', 'Total Spend', 'Terms'].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>)}</tr></thead>
              <tbody>
                {filteredSuppliers.map((s, i) => (
                  <tr key={s.id} onClick={() => setSelectedSupplier(s)} className={`group cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[10px] text-slate-400">{s.code}</p><p className="font-semibold text-slate-800">{s.name}</p></td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{s.category}</span></td>
                    <td className="px-4 py-3"><p className="text-xs text-slate-700">{s.contactName}</p><p className="text-[10px] text-slate-400">{s.email}</p></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span className="font-semibold text-slate-700">{s.rating}</span></div></td>
                    <td className="px-4 py-3"><span className={`font-semibold text-xs ${s.onTimeDelivery >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{s.onTimeDelivery}%</span></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.activeOrders}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatGhs(s.totalSpend)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.paymentTerms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">{filteredSuppliers.length} suppliers · click row to view profile</div>
          </div>
        )}
      </div>

      {/* PR drawer */}
      <Drawer open={!!selectedPR} onClose={() => setSelectedPR(null)} title={selectedPR?.number ?? ''} subtitle={`${selectedPR?.requester} · ${selectedPR?.department}`} width="lg">
        {selectedPR && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${APPROVAL_STYLE[selectedPR.approvalState]}`}>
              <ShieldCheck className="h-4 w-4" />Approval: {selectedPR.approvalState}{selectedPR.approver && ` · by ${selectedPR.approver}`}
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Est. Unit</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {selectedPR.lines.map((l, i) => <tr key={i}><td className="px-3 py-2"><p className="font-mono text-[10px] text-slate-400">{l.sku}</p><p>{l.name}</p></td><td className="px-3 py-2 text-right tabular-nums">{l.quantity} {l.uom}</td><td className="px-3 py-2 text-right font-mono">{formatGhs(l.estUnitCost)}</td><td className="px-3 py-2 text-right font-mono font-semibold">{formatGhs(l.estCost)}</td></tr>)}
              </tbody>
              <tfoot><tr className="border-t border-slate-200"><td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-600">Total</td><td className="px-3 py-2 text-right font-mono font-bold text-[#0B1336]">{formatGhs(selectedPR.totalEstimate)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Drawer>

      {/* PO drawer */}
      <Drawer open={!!selectedPO} onClose={() => setSelectedPO(null)} title={selectedPO?.number ?? ''} subtitle={selectedPO?.supplier} width="lg">
        {selectedPO && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${APPROVAL_STYLE[selectedPO.approvalState]}`}>
              <ShieldCheck className="h-4 w-4" />Approval: {selectedPO.approvalState}
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2 text-right">Ordered</th><th className="px-3 py-2 text-right">Received</th><th className="px-3 py-2 text-right">Cost</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {selectedPO.lines.map((l, i) => <tr key={i}><td className="px-3 py-2"><p className="font-mono text-[10px] text-slate-400">{l.sku}</p><p>{l.name}</p></td><td className="px-3 py-2 text-right tabular-nums">{l.ordered}</td><td className={`px-3 py-2 text-right tabular-nums font-semibold ${l.received < l.ordered ? 'text-amber-600' : 'text-emerald-600'}`}>{l.received}</td><td className="px-3 py-2 text-right font-mono font-semibold">{formatGhs(l.cost)}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Drawer>

      {/* Supplier drawer */}
      <Drawer open={!!selectedSupplier} onClose={() => setSelectedSupplier(null)} title={selectedSupplier?.code ?? ''} subtitle={selectedSupplier?.name} width="md">
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#0B1336] p-4 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5B00] text-xs font-bold">{selectedSupplier.code.slice(-3)}</div>
              <div><p className="font-bold">{selectedSupplier.name}</p><p className="text-[11px] text-slate-300">{selectedSupplier.category}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              {[['Contact', selectedSupplier.contactName], ['Phone', selectedSupplier.phone], ['Email', selectedSupplier.email], ['Terms', selectedSupplier.paymentTerms], ['Rating', `${selectedSupplier.rating}/5`], ['On-time', `${selectedSupplier.onTimeDelivery}%`], ['Active POs', selectedSupplier.activeOrders], ['Total spend', formatGhs(selectedSupplier.totalSpend)]].map(([l, v]) => (
                <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-0.5 text-xs font-medium text-slate-700">{v}</p></div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create PR modal */}
      <Modal open={createPROpen} onClose={() => setCreatePROpen(false)} title="New Purchase Requisition" subtitle="Submitted for dual-control approval before PO creation." size="md"
        footer={<><ModalButton variant="secondary" onClick={() => setCreatePROpen(false)}>Cancel</ModalButton><ModalButton onClick={() => setCreatePROpen(false)}>Submit for Approval</ModalButton></>}
      >
        <div className="space-y-3">
          {['Item description / SKU', 'Quantity', 'Unit of measure', 'Est. unit cost (GH₵)', 'Branch', 'Department', 'Justification'].map((l) => <Field key={l} label={l}><input className={inputClass} placeholder={l} /></Field>)}
          <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700"><ShieldCheck className="h-3.5 w-3.5" />Requires maker-checker approval before PO can be raised.</div>
        </div>
      </Modal>
    </div>
  );
};
