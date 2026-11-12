'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, Users, FileText, ShoppingCart, PackageCheck, Plus, ArrowRight, DollarSign } from 'lucide-react';

export default function ProcurementDashboardPage() {
  const [vendorsCount, setVendorsCount] = useState<number>(0);
  const [requisitionsCount, setRequisitionsCount] = useState<number>(0);
  const [poCount, setPoCount] = useState<number>(0);
  const [totalSpend, setTotalSpend] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProcurement() {
      try {
        const responses = await Promise.all([
          fetch('/api/procurement/vendors'),
          fetch('/api/procurement/requisitions'),
          fetch('/api/procurement/purchase-orders'),
        ]);
        const [vData, rData, poData] = await Promise.all(responses.map((response) => response.json()));
        const failedIndex = responses.findIndex((response) => !response.ok);
        if (failedIndex !== -1) {
          const failedResponse = responses[failedIndex];
          const failedData = [vData, rData, poData][failedIndex];
          throw new Error(failedData?.message || failedData?.error || `Unable to load procurement data (HTTP ${failedResponse.status}).`);
        }
        setVendorsCount(vData.count ?? 0);
        setRequisitionsCount(rData.count ?? 0);
        const pos = poData.purchaseOrders ?? [];
        setPoCount(pos.length);
        setRecentOrders(pos.slice(0, 5));

        const spend = pos.reduce((sum: number, po: any) => sum + Number(po.totalAmount ?? 0), 0);
        setTotalSpend(spend);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load procurement data.');
        setRecentOrders([]);
      } finally {
        setLoading(false);
      }
    }

    void loadProcurement();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#080E29]">
            <Truck className="h-6 w-6 text-[#FF5B00]" />
            Procurement & Vendor Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track requisitions, purchase orders, suppliers and goods received.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/procurement/vendors"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Users className="w-4 h-4 text-slate-400" /> Vendors
          </Link>
          <Link
            href="/procurement/requisitions"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileText className="w-4 h-4 text-slate-400" /> Requisitions
          </Link>
          <Link
            href="/procurement/purchase-orders"
            className="flex items-center gap-2 rounded-md bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#F95700]"
          >
            <ShoppingCart className="w-4 h-4" /> Purchase Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Registered vendors</div>
          <div className="text-2xl font-semibold text-[#080E29]">{loading ? '—' : error ? '—' : vendorsCount}</div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Purchase requisitions</div>
          <div className="text-2xl font-semibold text-[#080E29]">{loading ? '—' : error ? '—' : requisitionsCount}</div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Purchase orders</div>
          <div className="text-2xl font-semibold text-[#080E29]">{loading ? '—' : error ? '—' : poCount}</div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-medium text-slate-500">Purchase order value</div>
          <div className="text-xl font-semibold text-[#080E29]">{loading || error ? '—' : `GHS ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-[#080E29]">Recent purchase orders</h2>
          <Link href="/procurement/purchase-orders" className="flex items-center gap-1 text-xs font-medium text-[#D94D00] hover:underline">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading procurement data…</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-slate-500">Recent purchase orders are unavailable because the request failed.</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No purchase orders created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">Order Date</th>
                  <th className="p-3.5">Total (GHS)</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((po) => (
                  <tr key={po.id} className="transition-colors hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-medium text-[#D94D00]">{po.poNumber}</td>
                    <td className="p-3.5 font-medium text-slate-800">{po.vendor?.registeredName}</td>
                    <td className="p-3.5 text-slate-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 font-mono font-semibold text-slate-800">GHS {po.totalAmount}</td>
                    <td className="p-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
