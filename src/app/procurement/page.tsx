'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockPurchaseOrders, mockBranches } from '@/src/lib/mockData';
import { PurchaseOrderItem } from '@/src/lib/types';
import {
  ShoppingCart,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building,
  FileCheck,
  UserCheck,
  X,
  ChevronRight,
  Truck,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export default function ProcurementPage() {
  const [orders, setOrders] = useState<PurchaseOrderItem[]>(mockPurchaseOrders);
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderItem | null>(null);

  // Create PO Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendorName, setVendorName] = useState('Apex Power & Automation Ghana');
  const [vendorEmail, setVendorEmail] = useState('procurement@apexpower.com.gh');
  const [workOrderRef, setWorkOrderRef] = useState('WO-00284');
  const [branchName, setBranchName] = useState('Tema Industrial Region');
  const [lineDesc, setLineDesc] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('5000');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered list
  const filteredOrders = orders.filter((po) => {
    const matchesSearch =
      po.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.workOrderRef && po.workOrderRef.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCommitted = orders.reduce((sum, po) => sum + po.totalAmount, 0);
  const pendingApprovalsCount = orders.filter((po) => po.status === 'PendingApproval').length;
  const activeOrdersCount = orders.filter((po) => po.status === 'Ordered' || po.status === 'Approved').length;

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(lineQty, 10) || 1;
    const price = parseFloat(linePrice) || 1000;
    const total = qty * price;
    const requiresDual = total > 10000;

    const newPO: PurchaseOrderItem = {
      id: `po-${Date.now()}`,
      number: `PO-2026-00${90 + orders.length}`,
      vendorName,
      vendorEmail,
      requestedBy: 'Kwesi Mensah',
      branchName,
      dateCreated: '2026-11-08',
      deliveryDueDate: '2026-11-20',
      totalAmount: total,
      currency: 'GH₵',
      requiresDualApproval: requiresDual,
      status: requiresDual ? 'PendingApproval' : 'Approved',
      workOrderRef: workOrderRef || undefined,
      lines: [
        {
          description: lineDesc || 'Industrial Spares / Replacement Assembly',
          qty,
          unitPrice: price,
          total,
        },
      ],
    };

    setOrders([newPO, ...orders]);
    setShowCreateModal(false);
    setLineDesc('');
    setNotification(
      requiresDual
        ? `Purchase order ${newPO.number} created (Requires Dual-Control approval as amount exceeds GH₵ 10,000 threshold).`
        : `Purchase order ${newPO.number} created and approved.`
    );
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDualControlApprove = (poId: string) => {
    const updated = orders.map((po) => {
      if (po.id === poId) {
        return {
          ...po,
          status: 'Approved' as const,
          approvedBy: 'Nana Yaw Addo (Operations Manager)',
        };
      }
      return po;
    });

    setOrders(updated);
    if (selectedPO && selectedPO.id === poId) {
      setSelectedPO({
        ...selectedPO,
        status: 'Approved',
        approvedBy: 'Nana Yaw Addo (Operations Manager)',
      });
    }

    setNotification('Maker-Checker Dual-Control signature verified. Purchase Order released to vendor.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Domain 07: Procurement & Supply Chain</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Procurement & Purchasing
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue purchase orders, track deliveries with 3-way matching, and enforce dual-control financial approval limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create Purchase Order</span>
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

        {/* Dual-Control Maker-Checker Banner */}
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">Dual-Control Maker-Checker Governance Active</p>
            <p className="text-amber-800 leading-relaxed">
              Any Purchase Order exceeding the single-signatory threshold of <strong className="font-mono">GH₵ 10,000</strong> requires
              secondary verification by an authorized Operations Manager or Financial Controller before release.
            </p>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Committed Spend</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-[#0B1336] tabular-nums font-mono">
                GH₵ {(totalCommitted / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-slate-500">All POs</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Pending Approval</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-amber-600 tabular-nums">{pendingApprovalsCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">Dual-Control</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Active Orders</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-blue-600 tabular-nums">{activeOrdersCount}</span>
              <span className="text-[11px] text-slate-500">In Transit</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Vetted Suppliers</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">14</span>
              <span className="text-[11px] text-emerald-600">Approved</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PO#, vendor, requester, linked WO..."
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
                <option value="All">All Statuses</option>
                <option value="PendingApproval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Ordered">Ordered</option>
                <option value="Received">Received</option>
              </select>
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor & Delivery Target</th>
                  <th className="py-3 px-4">Linked WO</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Amount (GH₵)</th>
                  <th className="py-3 px-4">Dual-Control</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPO(po)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                      {po.number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                        {po.vendorName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Due: {po.deliveryDueDate}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {po.workOrderRef || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {po.branchName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {po.requestedBy}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {po.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {po.requiresDualApproval ? (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          &gt; GH₵ 10k
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={po.status} size="sm" />
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

        {/* PO Detail Drawer */}
        {selectedPO && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedPO.number}
                      </span>
                      <StatusBadge status={selectedPO.status} size="sm" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedPO.vendorName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contact: {selectedPO.vendorEmail} · Destination: {selectedPO.branchName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPO(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Line Items Table */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Procured Line Items</span>
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold">
                          <tr>
                            <th className="p-2.5">Item & Spec</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Price</th>
                            <th className="p-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {selectedPO.lines.map((line, idx) => (
                            <tr key={idx}>
                              <td className="p-2.5 font-sans font-medium text-slate-900">{line.description}</td>
                              <td className="p-2.5 text-center">{line.qty}</td>
                              <td className="p-2.5 text-right">GH₵ {line.unitPrice.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-bold">GH₵ {line.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3-Way Matching Checklist */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">3-Way Matching Reconciliation</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">1. PO Approved</span>
                        <div className="font-bold text-emerald-700 text-xs mt-1">Matched</div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">2. Goods Receipt</span>
                        <div className="font-bold text-slate-700 text-xs mt-1">
                          {selectedPO.status === 'Received' ? 'Verified' : 'Pending Dock'}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400">3. Vendor Invoice</span>
                        <div className="font-bold text-slate-700 text-xs mt-1">Awaiting Bill</div>
                      </div>
                    </div>
                  </div>

                  {/* Dual-Control Approval Box */}
                  {selectedPO.requiresDualApproval && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                        <ShieldCheck className="h-4 w-4 text-amber-700" />
                        <span>Dual-Control Sign-off Status</span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        {selectedPO.approvedBy ? (
                          <span>Approved by: <strong>{selectedPO.approvedBy}</strong></span>
                        ) : (
                          <span>Secondary management authorization required before issuing purchase order.</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-2">
                <button
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                {selectedPO.status === 'PendingApproval' && (
                  <button
                    onClick={() => handleDualControlApprove(selectedPO.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Authorize (Dual-Control)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Create PO */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-[#FF5B00]" />
                  <span>Create Purchase Order</span>
                </h3>
                <button onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreatePO} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Vendor / Supplier *</label>
                    <input
                      required
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. Apex Power & Automation"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Vendor Email</label>
                    <input
                      type="email"
                      value={vendorEmail}
                      onChange={(e) => setVendorEmail(e.target.value)}
                      placeholder="orders@vendor.com"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Delivery Branch</label>
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
                  <div>
                    <label className="font-semibold text-slate-700">Linked Work Order</label>
                    <input
                      type="text"
                      value={workOrderRef}
                      onChange={(e) => setWorkOrderRef(e.target.value)}
                      placeholder="e.g. WO-00284"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Line Item Description *</label>
                  <input
                    required
                    type="text"
                    value={lineDesc}
                    onChange={(e) => setLineDesc(e.target.value)}
                    placeholder="e.g. Danfoss VFD Inverter Drive 37kW"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Quantity</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Unit Price (GH₵)</label>
                    <input
                      required
                      type="number"
                      value={linePrice}
                      onChange={(e) => setLinePrice(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                  Total Order Amount:{' '}
                  <strong className="font-mono text-slate-900 font-bold">
                    GH₵ {((parseInt(lineQty, 10) || 1) * (parseFloat(linePrice) || 0)).toLocaleString()}
                  </strong>
                  {(parseInt(lineQty, 10) || 1) * (parseFloat(linePrice) || 0) > 10000 && (
                    <span className="text-amber-700 block font-semibold mt-0.5">
                      ⚠️ Exceeds GH₵ 10,000 threshold. Will require secondary Dual-Control authorization.
                    </span>
                  )}
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
                    Generate Purchase Order
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
