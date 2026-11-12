'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Boxes, Check, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';

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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={Boxes}
        title="Register Inventory Part Master"
        description="Define a new part or material in the inventory catalog."
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'New Part' },
        ]}
        actions={
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Part Number / SKU</label>
            <input
              type="text"
              required
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="e.g. P-FILT-1004"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Part Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Pressure Hydraulic Oil Filter"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed specifications, compatibility notes, or technical parameters…"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Inventory Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
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
            <label className={labelClass}>Unit of Measure (UOM)</label>
            <input
              type="text"
              required
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              placeholder="e.g. PCS, LTR, KG, SET"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Standard / Base Cost (GHS)</label>
            <input
              type="number"
              step="0.01"
              required
              value={standardCost}
              onChange={(e) => setStandardCost(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Minimum Stock Threshold</label>
            <input
              type="number"
              step="1"
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Reorder Trigger Level</label>
            <input
              type="number"
              step="1"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Barcode (Optional)</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Manufacturer (Optional)</label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Parker Hannifin"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/inventory"
            className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {loading ? 'Creating Part Master…' : 'Register Part'}
          </button>
        </div>
      </form>
    </div>
  );
}
