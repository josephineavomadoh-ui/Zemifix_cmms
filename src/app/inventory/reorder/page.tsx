'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

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

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={AlertTriangle}
        title="Reorder Recommendations"
        description="Parts and materials with available stock at or below their reorder trigger level."
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Reorder Queue' },
        ]}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={6} columns={6} />
        ) : recommendations.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="All stock levels are healthy"
            description="No parts are currently at or below their reorder trigger level."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-amber-50">
                <tr>
                  <th className={thClass}>Part Number</th>
                  <th className={thClass}>Part Name</th>
                  <th className={thClass}>Warehouse Store</th>
                  <th className={thClass}>Available Stock</th>
                  <th className={thClass}>Reorder Level</th>
                  <th className={thClass}>Suggested Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recommendations.map((r, i) => (
                  <tr key={i} className="hover:bg-amber-50/50 transition-colors">
                    <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>{r.partNumber}</td>
                    <td className={`${tdClass} font-medium text-slate-800`}>{r.name}</td>
                    <td className={`${tdClass} text-slate-600`}>{r.storeName}</td>
                    <td className={tdClass}>
                      <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                        {r.available} {r.uom}
                      </span>
                    </td>
                    <td className={`${tdClass} font-mono text-slate-500`}>{r.reorderLevel} {r.uom}</td>
                    <td className={tdClass}>
                      <span className="font-mono font-bold text-emerald-700">{r.reorderQuantity} {r.uom}</span>
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
