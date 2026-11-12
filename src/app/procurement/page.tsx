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

  useEffect(() => {
    Promise.all([
      fetch('/api/procurement/vendors').then((res) => res.json()),
      fetch('/api/procurement/requisitions').then((res) => res.json()),
      fetch('/api/procurement/purchase-orders').then((res) => res.json()),
    ])
      .then(([vData, rData, poData]) => {
        setVendorsCount(vData.count ?? 0);
        setRequisitionsCount(rData.count ?? 0);
        const pos = poData.purchaseOrders ?? [];
        setPoCount(pos.length);
        setRecentOrders(pos.slice(0, 5));

        const spend = pos.reduce((sum: number, po: any) => sum + parseFloat(po.totalAmount ?? 0), 0);
        setTotalSpend(spend);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-brand-orange" />
            Procurement & Vendor Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Purchase requisitions, vendor quotation evaluation, purchase order issuance, Ghana statutory taxes (VAT 15%, NHIL 2.5%, GETFund 2.5%), and GRN stock receipt integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/procurement/vendors"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-400" /> Vendors
          </Link>
          <Link
            href="/procurement/requisitions"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-slate-400" /> Requisitions
          </Link>
          <Link
            href="/procurement/purchase-orders"
            className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/10"
          >
            <ShoppingCart className="w-4 h-4" /> Purchase Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Vendors</div>
          <div className="text-2xl font-bold text-white">{vendorsCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Requisitions</div>
          <div className="text-2xl font-bold text-white">{requisitionsCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Issued Purchase Orders</div>
          <div className="text-2xl font-bold text-white">{poCount}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Procurement Spend</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">GHS {totalSpend.toFixed(2)}</div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white">Recent Purchase Orders</h2>
          <Link href="/procurement/purchase-orders" className="text-xs font-medium text-brand-orange hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading procurement data...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No purchase orders created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Vendor</th>
                  <th className="p-3.5">Order Date</th>
                  <th className="p-3.5">Total (GHS)</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{po.poNumber}</td>
                    <td className="p-3.5 font-medium text-white">{po.vendor?.registeredName}</td>
                    <td className="p-3.5 text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">GHS {po.totalAmount}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300">
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
