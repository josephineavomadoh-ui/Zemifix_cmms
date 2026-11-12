'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Plus, Check, PackageCheck } from 'lucide-react';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/procurement" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Procurement Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-brand-orange" /> Purchase Orders
          </h1>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isFormOpen ? 'Close Form' : 'Issue Purchase Order'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleCreatePO} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-semibold text-white">Issue Purchase Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Vendor</label>
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registeredName} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Delivery Address</label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Part Item</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
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
              <label className="block text-xs text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Unit Price (GHS)</label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
            Ghana Statutory Taxes (VAT 15%, NHIL 2.5%, GETFund 2.5% = Total 20% Tax) will be automatically computed on PO line total.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Issuing PO...' : 'Issue Purchase Order'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading purchase orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No purchase orders created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">Tax (VAT+NHIL+GETFund)</th>
                  <th className="p-3.5">Total (GHS)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchaseOrders.map((po) => {
                  const totalTax = parseFloat(po.vatAmount ?? 0) + parseFloat(po.nhilAmount ?? 0) + parseFloat(po.getFundAmount ?? 0);

                  return (
                    <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-medium text-brand-orange">{po.poNumber}</td>
                      <td className="p-3.5 font-medium text-white">{po.vendor?.registeredName}</td>
                      <td className="p-3.5 font-mono text-slate-300">GHS {po.subtotal}</td>
                      <td className="p-3.5 font-mono text-slate-400">GHS {totalTax.toFixed(2)}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {po.totalAmount}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {po.status !== 'RECEIVED' && po.status !== 'CLOSED' && (
                          <button
                            onClick={() => {
                              setSelectedPo(po);
                              setIsGrnModalOpen(true);
                            }}
                            className="px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> Post GRN
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <h3 className="font-semibold text-lg text-white">Post Goods Received Note (GRN)</h3>
            <p className="text-xs text-slate-400">
              Receiving goods against PO <span className="font-mono text-brand-orange">{selectedPo.poNumber}</span> will automatically update inventory stock balances & WAC in Stage D.3.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Receiving Store / Warehouse
              </label>
              <select
                value={receivingStoreId}
                onChange={(e) => setReceivingStoreId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setIsGrnModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handlePostGrn}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {submitting ? 'Posting GRN...' : 'Post GRN & Receive Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
