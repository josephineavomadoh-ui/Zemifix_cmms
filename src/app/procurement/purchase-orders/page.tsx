'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Plus, Check, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StatusBadge } from '@/src/components/ui/StatusBadge';

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [vendorId, setVendorId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Accra Main Store, Industrial Area');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('10');
  const [unitPrice, setUnitPrice] = useState<string>('80');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // GRN Receipt Modal State
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [receivingStoreId, setReceivingStoreId] = useState<string>('');
  const [isGrnModalOpen, setIsGrnModalOpen] = useState<boolean>(false);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement/purchase-orders');
      const data = await res.json();
      if (res.ok) setPurchaseOrders(data.purchaseOrders ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();

    Promise.all([
      fetch('/api/procurement/vendors').then((r) => r.json()),
      fetch('/api/inventory/parts').then((r) => r.json()),
      fetch('/api/inventory/stores').then((r) => r.json()),
    ]).then(([vData, pData, sData]) => {
      setVendors(vData.vendors ?? []);
      setParts(pData.parts ?? []);
      setStores(sData.stores ?? []);
      if (vData.vendors?.[0]) setVendorId(vData.vendors[0].id);
      if (sData.stores?.[0]) setReceivingStoreId(sData.stores[0].id);
    });
  }, []);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedPart = parts.find((p) => p.id === selectedPartId);

      const res = await fetch('/api/procurement/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          deliveryAddress,
          items: [
            {
              partId: selectedPartId || null,
              description: selectedPart ? selectedPart.name : 'Procured Supply',
              quantityOrdered: quantity,
              unitPrice,
            },
          ],
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        fetchPOs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostGrn = async () => {
    if (!selectedPo || !receivingStoreId) return;
    setSubmitting(true);
    try {
      const items = (selectedPo.items ?? []).map((item: any) => ({
        poItemId: item.id,
        partId: item.partId,
        quantityReceived: parseFloat(item.quantityOrdered),
        quantityAccepted: parseFloat(item.quantityOrdered),
        quantityRejected: 0,
        unitCost: parseFloat(item.unitPrice),
      }));

      const res = await fetch('/api/procurement/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: selectedPo.id,
          storeId: receivingStoreId,
          items,
        }),
      });

      if (res.ok) {
        alert('Goods Received Note (GRN) posted & inventory stock automatically updated!');
        setIsGrnModalOpen(false);
        fetchPOs();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to post GRN');
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
        eyebrow="Procurement"
        eyebrowIcon={ShoppingCart}
        title="Purchase Orders"
        description="Issue and track purchase orders to suppliers. Post Goods Received Notes (GRN) to update inventory stock automatically."
        breadcrumbs={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {isFormOpen ? 'Close Form' : 'Issue Purchase Order'}
          </button>
        }
      />

      {isFormOpen && (
        <form onSubmit={handleCreatePO} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Issue Purchase Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Target Vendor</label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={inputClass}
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registeredName} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Delivery Address</label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Select Part Item</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className={inputClass}
              >
                <option value="">-- General Item --</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
            Ghana Statutory Taxes (VAT 15%, NHIL 2.5%, GETFund 2.5% = 20% total) will be automatically computed on the PO line total.
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
              {submitting ? 'Issuing PO…' : 'Issue Purchase Order'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={7} />
        ) : purchaseOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No purchase orders created yet"
            description="Issue a purchase order to a registered vendor."
            action={{ label: 'Issue Purchase Order', onClick: () => setIsFormOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>PO Number</th>
                  <th className={thClass}>Vendor</th>
                  <th className={thClass}>Subtotal</th>
                  <th className={thClass}>Tax (VAT+NHIL+GETFund)</th>
                  <th className={thClass}>Total (GHS)</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => {
                  const totalTax = parseFloat(po.vatAmount ?? 0) + parseFloat(po.nhilAmount ?? 0) + parseFloat(po.getFundAmount ?? 0);

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{po.poNumber}</td>
                      <td className={`${tdClass} font-medium text-slate-800`}>{po.vendor?.registeredName}</td>
                      <td className={`${tdClass} font-mono text-slate-600`}>GHS {po.subtotal}</td>
                      <td className={`${tdClass} font-mono text-slate-500`}>GHS {totalTax.toFixed(2)}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>GHS {po.totalAmount}</td>
                      <td className={tdClass}>
                        <StatusBadge status={po.status} />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {po.status !== 'RECEIVED' && po.status !== 'CLOSED' && (
                          <button
                            onClick={() => {
                              setSelectedPo(po);
                              setIsGrnModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            <PackageCheck className="h-3.5 w-3.5 text-[#FF5B00]" /> Post GRN
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

      {/* GRN Receipt Modal */}
      {isGrnModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="rounded-xl border border-slate-200 bg-white max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-slate-800">Post Goods Received Note (GRN)</h3>
            <p className="text-xs text-slate-500">
              Receiving goods against PO{' '}
              <span className="font-mono font-semibold text-[#FF5B00]">{selectedPo.poNumber}</span>{' '}
              will automatically update inventory stock balances and WAC valuation.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Receiving Store / Warehouse
              </label>
              <select
                value={receivingStoreId}
                onChange={(e) => setReceivingStoreId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsGrnModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePostGrn}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'Posting GRN…' : 'Post GRN & Receive Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
