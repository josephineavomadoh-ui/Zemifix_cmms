'use client';

import React, { useMemo, useState } from 'react';
import {
  Boxes, Plus, Download, Search, SlidersHorizontal,
  TrendingDown, PackageX, AlertTriangle, ArrowUpDown,
} from 'lucide-react';
import { Drawer } from '@/src/components/ui/Drawer';
import { Modal, ModalButton, Field, inputClass } from '@/src/components/ui/Modal';
import { demoInventoryItems, demoStockMovements, demoWarehouses, stockCategories } from '@/src/lib/demo/inventory';
import { formatGhs } from '@/src/lib/demo/common';
import type { InventoryItem, StockMovement, StockMovementType } from '@/src/lib/types';

const STATUS_STYLE: Record<string, string> = {
  'In Stock': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Low Stock': 'bg-amber-50 text-amber-700 border-amber-100',
  'Out of Stock': 'bg-rose-50 text-rose-700 border-rose-100',
  Overstock: 'bg-blue-50 text-blue-700 border-blue-100',
};

const MOV_COLOR: Record<StockMovementType, string> = {
  Receipt: 'text-emerald-600', Issue: 'text-[#FF5B00]', Transfer: 'text-blue-600',
  Adjustment: 'text-amber-600', Reservation: 'text-purple-600', Return: 'text-slate-500',
};

const MODULE_TABS = [
  { id: 'catalogue', label: 'Item Catalogue' },
  { id: 'movements', label: 'Stock Ledger' },
  { id: 'alerts', label: 'Replenishment Alerts' },
  { id: 'warehouses', label: 'Warehouses' },
];

export const InventoryView: React.FC = () => {
  const [items] = useState<InventoryItem[]>(demoInventoryItems);
  const [movements] = useState<StockMovement[]>(demoStockMovements);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [tab, setTab] = useState('catalogue');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const kpis = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + i.totalValue, 0);
    const lowStock = items.filter((i) => i.stockStatus === 'Low Stock').length;
    const outOfStock = items.filter((i) => i.stockStatus === 'Out of Stock').length;
    return { total: items.length, totalValue, lowStock, outOfStock };
  }, [items]);

  const filteredItems = useMemo(() => items.filter((i) => {
    const q = search.toLowerCase();
    return (!q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) &&
      (catFilter === 'all' || i.category === catFilter) &&
      (statusFilter === 'all' || i.stockStatus === statusFilter) &&
      (warehouseFilter === 'all' || i.warehouse === warehouseFilter);
  }), [items, search, catFilter, statusFilter, warehouseFilter]);

  const alertItems = items.filter((i) => i.stockStatus === 'Low Stock' || i.stockStatus === 'Out of Stock');

  const exportCsv = () => {
    const rows = filteredItems.map((i) => [i.sku, `"${i.name}"`, i.category, i.onHand, i.available, i.averageCost, i.totalValue, i.stockStatus]);
    const csv = ['SKU,Name,Category,On Hand,Available,Unit Cost,Value,Status', ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="space-y-0 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Inventory & Stock</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B1336]">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Item catalogue, multi-warehouse stock levels, traceable transaction ledger and replenishment alerts.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export</span></button>
          <button onClick={() => setReceiptOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200]"><Plus className="h-4 w-4" />Stock Receipt</button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /><strong>Demo data:</strong>&nbsp;Illustrative inventory — not connected to live stock APIs.
      </div>

      {/* KPI strip */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-bold tabular-nums text-[#0B1336]">{kpis.total}</span>
          <span className="text-[11px] font-medium text-slate-500">Catalogue items</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-bold tabular-nums text-emerald-700">{formatGhs(kpis.totalValue)}</span>
          <span className="text-[11px] font-medium text-slate-500">WAC value</span>
        </div>
        {kpis.lowStock > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <TrendingDown className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm font-bold tabular-nums text-amber-700">{kpis.lowStock}</span>
            <span className="text-[11px] font-medium text-amber-600">Low stock</span>
          </div>
        )}
        {kpis.outOfStock > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <PackageX className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-sm font-bold tabular-nums text-rose-700">{kpis.outOfStock}</span>
            <span className="text-[11px] font-medium text-rose-600">Out of stock</span>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU or item name…" className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-slate-400 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]" />
            </div>
            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {[
                  { val: catFilter, set: setCatFilter, opts: [['all', 'All categories'], ...stockCategories.map((c) => [c, c] as [string, string])] },
                  { val: statusFilter, set: setStatusFilter, opts: [['all', 'All statuses'], ['In Stock', 'In Stock'], ['Low Stock', 'Low Stock'], ['Out of Stock', 'Out of Stock']] },
                  { val: warehouseFilter, set: setWarehouseFilter, opts: [['all', 'All warehouses'], ...demoWarehouses.map((w) => [w.name, w.name] as [string, string])] },
                ].map((f, i) => (
                  <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none">
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 sm:ml-auto">
              <button onClick={() => setShowFilters((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${showFilters ? 'border-[#FF5B00] bg-orange-50 text-[#FF5B00]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />Filters
              </button>
            </div>
          </div>
        </div>

        {/* Module tabs */}
        <div className="border-b border-slate-100 px-4">
          <nav className="-mb-px flex gap-1">
            {MODULE_TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${tab === t.id ? 'border-[#FF5B00] text-[#0B1336]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t.label}
                {t.id === 'alerts' && kpis.lowStock + kpis.outOfStock > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{kpis.lowStock + kpis.outOfStock}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Catalogue */}
        {tab === 'catalogue' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">
                {['Item', 'Category', 'Warehouse / Bin', 'On Hand', 'Min / ROP / Max', 'Unit Cost', 'Value', 'Status'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${i >= 3 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredItems.map((item, i) => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className={`group cursor-pointer border-b border-slate-50 hover:bg-orange-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[11px] font-bold text-[#0B1336]">{item.sku}</p>
                      <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-600">{item.name}</p>
                    </td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{item.category}</span></td>
                    <td className="px-4 py-3"><p className="text-xs text-slate-600">{item.warehouse}</p><p className="font-mono text-[10px] text-slate-400">{item.bin}</p></td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono font-bold text-slate-800">{item.onHand}</p>
                      <p className="text-[10px] text-slate-400">{item.available} avail</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500">{item.minimum} / {item.reorderPoint} / {item.maximum}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{formatGhs(item.averageCost)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{formatGhs(item.totalValue)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[item.stockStatus]}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{item.stockStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-[11px] text-slate-400">
              {filteredItems.length} of {items.length} items · total WAC value: {formatGhs(items.reduce((s, i) => s + i.totalValue, 0))} · demonstration dataset
            </div>
          </div>
        )}

        {/* Stock Ledger */}
        {tab === 'movements' && (
          <div className="overflow-x-auto">
            <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-2 text-[11px] font-semibold text-slate-400">Append-only stock transaction ledger — demonstration dataset</div>
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/80">
                {['Transaction', 'Type', 'Item', 'Warehouse', 'Qty', 'Value', 'Reference', 'By'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ${h === 'Qty' || h === 'Value' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3"><p className="font-mono text-[11px] font-bold text-[#0B1336]">{m.number}</p><p className="text-[10px] text-slate-400">{m.date}</p></td>
                    <td className="px-4 py-3"><span className={`font-semibold text-xs ${MOV_COLOR[m.type]}`}>{m.type}</span></td>
                    <td className="px-4 py-3"><p className="font-mono text-[10px] text-slate-500">{m.itemSku}</p><p className="text-xs text-slate-600">{m.itemName}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.warehouse}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{formatGhs(Math.abs(m.value))}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#FF5B00]">{m.reference}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Alerts */}
        {tab === 'alerts' && (
          <div className="p-4 space-y-3">
            {alertItems.length === 0 ? <p className="py-10 text-center text-xs text-slate-400">No replenishment alerts.</p> :
              alertItems.map((item) => (
                <div key={item.id} className={`rounded-xl border p-4 ${item.stockStatus === 'Out of Stock' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] font-bold text-[#0B1336]">{item.sku}</p>
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.warehouse} · {item.bin} · {item.supplier}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[item.stockStatus]}`}>{item.stockStatus}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <span className="text-slate-600">On hand: <strong>{item.onHand} {item.uom}</strong></span>
                    <span className="text-slate-500">Min: <strong>{item.minimum}</strong></span>
                    <span className="text-slate-500">ROP: <strong>{item.reorderPoint}</strong></span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                    <div className={`h-full rounded-full ${item.stockStatus === 'Out of Stock' ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${Math.max((item.onHand / item.maximum) * 100, 2)}%` }} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-lg bg-[#FF5B00] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#E65200]">Create Requisition</button>
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Dismiss</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Warehouses */}
        {tab === 'warehouses' && (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoWarehouses.map((wh) => {
              const whItems = items.filter((i) => i.warehouse === wh.name);
              const whValue = whItems.reduce((s, i) => s + i.totalValue, 0);
              return (
                <div key={wh.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1336] text-[11px] font-bold text-white">{wh.code.slice(0, 3)}</div>
                    <div><p className="font-bold text-slate-900">{wh.name}</p><p className="font-mono text-[10px] text-slate-400">{wh.code}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[['Items', whItems.length], ['Bins', wh.binCount], ['Value', formatGhs(whValue)]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-white border border-slate-200 p-2"><p className="text-[10px] text-slate-400">{l}</p><p className="font-bold text-slate-800 mt-0.5">{v}</p></div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{wh.location} · {wh.branchName}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item drawer */}
      <Drawer open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.sku ?? ''} subtitle={selectedItem?.name} width="lg">
        {selectedItem && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${STATUS_STYLE[selectedItem.stockStatus]}`}>
              <span className="h-2 w-2 rounded-full bg-current" />{selectedItem.stockStatus}
              <span className="ml-auto font-normal">{selectedItem.available} available of {selectedItem.onHand} on hand</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              {[['SKU', selectedItem.sku], ['Category', selectedItem.category], ['UOM', selectedItem.uom], ['Warehouse', selectedItem.warehouse], ['Bin', selectedItem.bin], ['On hand', `${selectedItem.onHand} ${selectedItem.uom}`], ['Available', `${selectedItem.available} ${selectedItem.uom}`], ['Reserved', `${selectedItem.reserved} ${selectedItem.uom}`], ['Min / ROP / Max', `${selectedItem.minimum} / ${selectedItem.reorderPoint} / ${selectedItem.maximum}`], ['Avg unit cost', formatGhs(selectedItem.averageCost)], ['Total value', formatGhs(selectedItem.totalValue)], ['Supplier', selectedItem.supplier]].map(([l, v]) => (
                <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-0.5 text-xs font-medium text-slate-700">{v}</p></div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 rounded-lg bg-[#FF5B00] py-2 text-xs font-bold text-white hover:bg-[#E65200]">Issue Stock</button>
              <button className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Create Requisition</button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Receipt modal */}
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="Post Stock Receipt" subtitle="Record goods received. Linked to a GRN or PO." size="md"
        footer={<><ModalButton variant="secondary" onClick={() => setReceiptOpen(false)}>Cancel</ModalButton><ModalButton onClick={() => setReceiptOpen(false)}>Post Receipt</ModalButton></>}
      >
        <div className="space-y-3">
          {['SKU / Item', 'Quantity received', 'Unit cost (GH₵)', 'Warehouse', 'Bin location', 'GRN / PO reference'].map((l) => (
            <Field key={l} label={l}><input className={inputClass} placeholder={l} /></Field>
          ))}
          <p className="text-[11px] text-amber-600">Demonstration — receipt will not persist to inventory balance.</p>
        </div>
      </Modal>
    </div>
  );
};
