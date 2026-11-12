'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Boxes, Building, History, PackageCheck } from 'lucide-react';
import { StockReceiptModal } from '@/src/components/inventory/StockReceiptModal';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function InventoryDashboardPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);

      const [partsRes, storesRes] = await Promise.all([
        fetch(`/api/inventory/parts?${params.toString()}`),
        fetch('/api/inventory/stores'),
      ]);

      const partsData = await partsRes.json();
      const storesData = await storesRes.json();

      if (partsRes.ok) setParts(partsData.parts ?? []);
      if (storesRes.ok) setStores(storesData.stores ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const thClass = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
  const tdClass = 'px-4 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={Boxes}
        title="Inventory & Stores Management"
        description="Authoritative append-only stock transaction ledger, Weighted Average Cost (WAC) valuation, multi-warehouse stores, and work order material issues."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/stores"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Building className="h-4 w-4 text-slate-400" />
              Stores
            </Link>
            <Link
              href="/inventory/transactions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <History className="h-4 w-4 text-slate-400" />
              Ledger
            </Link>
            <Link
              href="/inventory/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Item / Part
            </Link>
          </div>
        }
      />

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by part number, SKU, barcode, or part name…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20"
          />
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:border-[#FF5B00] focus:outline-none sm:w-52"
        >
          <option value="">All Categories</option>
          <option value="SPARE_PARTS">Spare Parts</option>
          <option value="ELECTRICAL">Electrical Materials</option>
          <option value="MECHANICAL">Mechanical Components</option>
          <option value="CONSUMABLES">Consumables</option>
          <option value="TOOLS">Tools & Equipment</option>
          <option value="SAFETY">Safety Equipment</option>
          <option value="GENERAL">General Supplies</option>
        </select>
      </div>

      {/* Parts Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <LoadingSkeleton rows={7} columns={6} />
        ) : parts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory items found"
            description="Create a new part master or receive opening stock."
            action={
              <Link
                href="/inventory/new"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#F95700]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Part
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={thClass}>Part Number / SKU</th>
                  <th className={thClass}>Name / Category</th>
                  <th className={thClass}>Total Qty On Hand</th>
                  <th className={thClass}>Average Cost (WAC)</th>
                  <th className={thClass}>Total Valuation</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((p) => {
                  const totalOnHand = (p.stocks ?? []).reduce(
                    (sum: number, s: any) => sum + parseFloat(s.quantityOnHand ?? 0),
                    0
                  );
                  const totalValuation = totalOnHand * parseFloat(p.averageCost ?? 0);
                  const isLowStock = p.reorderPoint && totalOnHand <= parseFloat(p.reorderPoint);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className={`${tdClass} font-mono font-medium text-[#FF5B00]`}>
                        {p.partNumber}
                        {p.barcode && <div className="text-xs font-sans text-slate-400">BC: {p.barcode}</div>}
                      </td>
                      <td className={tdClass}>
                        <div className="font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.category.replace(/_/g, ' ')}</div>
                      </td>
                      <td className={tdClass}>
                        <span className={`font-mono font-semibold ${isLowStock ? 'text-amber-700' : 'text-slate-700'}`}>
                          {totalOnHand}
                        </span>{' '}
                        <span className="text-xs text-slate-400">{p.uom}</span>
                        {isLowStock && (
                          <div className="text-[10px] font-semibold text-amber-600 mt-0.5">LOW STOCK</div>
                        )}
                      </td>
                      <td className={`${tdClass} font-mono text-slate-600`}>GHS {p.averageCost}</td>
                      <td className={`${tdClass} font-mono font-bold text-emerald-700`}>
                        GHS {totalValuation.toFixed(2)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <button
                          onClick={() => {
                            setSelectedPart(p);
                            setIsReceiptModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          <PackageCheck className="h-3.5 w-3.5 text-[#FF5B00]" />
                          Receive Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Receipt Modal */}
      {selectedPart && (
        <StockReceiptModal
          part={selectedPart}
          stores={stores}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSubmitSuccess={fetchData}
        />
      )}
    </div>
  );
}
