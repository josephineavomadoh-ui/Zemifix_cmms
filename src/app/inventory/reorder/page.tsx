'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Boxes, ShoppingCart } from 'lucide-react';

export default function ReorderManagementPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/inventory/parts')
      .then((res) => res.json())
      .then((data) => {
        const parts = data.parts ?? [];
        const recs: any[] = [];

        parts.forEach((p: any) => {
          const reorderLvl = parseFloat(p.reorderLevel ?? '0');
          if (reorderLvl <= 0) return;

          (p.stocks ?? []).forEach((s: any) => {
            const avail = parseFloat(s.quantityAvailable ?? s.quantityOnHand ?? '0');
            if (avail <= reorderLvl) {
              recs.push({
                partId: p.id,
                partNumber: p.partNumber,
                name: p.name,
                category: p.category,
                storeName: s.store?.name ?? 'Warehouse',
                available: avail,
                reorderLevel: reorderLvl,
                reorderQuantity: parseFloat(p.reorderQuantity ?? '1'),
                uom: p.uom,
              });
            }
          });
        });

        setRecommendations(recs);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/inventory" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" /> Reorder Recommendations & Low Stock Alerts
          </h1>
          <p className="text-xs text-slate-400">
            Calculated available stock triggers preparing procurement purchase requisitions for Stage D.4.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading low stock items...</div>
        ) : recommendations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            All inventory item stock levels are healthy above reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="p-3.5">Part Number</th>
                  <th className="p-3.5">Part Name</th>
                  <th className="p-3.5">Warehouse Store</th>
                  <th className="p-3.5">Available Stock</th>
                  <th className="p-3.5">Reorder Level</th>
                  <th className="p-3.5">Suggested Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recommendations.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium text-brand-orange">{r.partNumber}</td>
                    <td className="p-3.5 font-medium text-white">{r.name}</td>
                    <td className="p-3.5 text-slate-300">{r.storeName}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-400">{r.available} {r.uom}</td>
                    <td className="p-3.5 font-mono text-slate-400">{r.reorderLevel} {r.uom}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{r.reorderQuantity} {r.uom}</td>
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
