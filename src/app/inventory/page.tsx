'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Boxes, Building, PackageCheck, History, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { StockReceiptModal } from '@/src/components/inventory/StockReceiptModal';

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="w-7 h-7 text-brand-orange" />
            Inventory & Stores Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative append-only stock transaction ledger, Weighted Average Cost (WAC) valuation, multi-warehouse stores, and work order material issues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory/stores"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Building className="w-4 h-4 text-slate-400" />
            Stores
          </Link>
          <Link
            href="/inventory/transactions"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <History className="w-4 h-4 text-slate-400" />
            Ledger
          </Link>
          <Link
            href="/inventory/new"
            className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/10"
          >
            <Plus className="w-4 h-4" />
            New Item / Part
          </Link>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by part number, SKU, barcode, or part name..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
          />
        </form>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading inventory catalog...</div>
        ) : parts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div>No inventory items found.</div>
            <div className="text-xs text-slate-500">Create a new part master or receive opening stock.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="py-3.5 px-4">Part Number / SKU</th>
                  <th className="py-3.5 px-4">Name / Category</th>
                  <th className="py-3.5 px-4">Total Qty On Hand</th>
                  <th className="py-3.5 px-4">Average Cost (WAC)</th>
                  <th className="py-3.5 px-4">Total Valuation</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parts.map((p) => {
                  const totalOnHand = (p.stocks ?? []).reduce(
                    (sum: number, s: any) => sum + parseFloat(s.quantityOnHand ?? 0),
                    0
                  );
                  const totalValuation = totalOnHand * parseFloat(p.averageCost ?? 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-brand-orange">
                        {p.partNumber}
                        {p.barcode && <div className="text-xs font-sans text-slate-500">BC: {p.barcode}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.category.replace('_', ' ')}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        {totalOnHand} <span className="text-xs text-slate-400">{p.uom}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">GHS {p.averageCost}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        GHS {totalValuation.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedPart(p);
                            setIsReceiptModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5 text-brand-orange" />
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
