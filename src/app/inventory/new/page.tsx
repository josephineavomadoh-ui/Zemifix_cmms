'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Boxes, Check } from 'lucide-react';

export default function CreatePartPage() {
  const router = useRouter();
  const [partNumber, setPartNumber] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('SPARE_PARTS');
  const [uom, setUom] = useState<string>('PCS');
  const [barcode, setBarcode] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [minStockLevel, setMinStockLevel] = useState<string>('5');
  const [reorderLevel, setReorderLevel] = useState<string>('10');
  const [standardCost, setStandardCost] = useState<string>('50');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/inventory/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber,
          name,
          description,
          category,
          uom,
          barcode: barcode || null,
          manufacturer: manufacturer || null,
          minStockLevel: parseFloat(minStockLevel),
          reorderLevel: parseFloat(reorderLevel),
          standardCost: parseFloat(standardCost),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create part master');

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message ?? 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/inventory" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-orange" /> Register Inventory Part Master
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Part Number / SKU
            </label>
            <input
              type="text"
              required
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="e.g. P-FILT-1004"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Part Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Pressure Hydraulic Oil Filter"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed specifications, compatibility notes, or technical parameters..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Inventory Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            >
              <option value="SPARE_PARTS">Spare Parts</option>
              <option value="ELECTRICAL">Electrical Materials</option>
              <option value="MECHANICAL">Mechanical Components</option>
              <option value="CONSUMABLES">Consumables</option>
              <option value="TOOLS">Tools & Equipment</option>
              <option value="SAFETY">Safety Equipment</option>
              <option value="GENERAL">General Supplies</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Unit of Measure (UOM)
            </label>
            <input
              type="text"
              required
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              placeholder="e.g. PCS, LTR, KG, SET"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Standard / Base Cost (GHS)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={standardCost}
              onChange={(e) => setStandardCost(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Minimum Stock Threshold
            </label>
            <input
              type="number"
              step="1"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Reorder Trigger Level
            </label>
            <input
              type="number"
              step="1"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/inventory"
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Creating Part Master...' : 'Register Part'}
          </button>
        </div>
      </form>
    </div>
  );
}
