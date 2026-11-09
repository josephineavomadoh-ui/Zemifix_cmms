'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockInventory } from '@/src/lib/mockData';
import { InventoryItem } from '@/src/lib/types';
import {
  Package,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  ChevronRight,
  Warehouse,
  Barcode,
  Building,
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<any>('Electrical');
  const [newWarehouse, setNewWarehouse] = useState('Central Store Tema');
  const [newBin, setNewBin] = useState('BAY-A1-S1');
  const [newUnit, setNewUnit] = useState('Pieces');
  const [newQty, setNewQty] = useState('10');
  const [newMin, setNewMin] = useState('4');
  const [newMax, setNewMax] = useState('20');
  const [newCost, setNewCost] = useState('500');
  const [newSupplier, setNewSupplier] = useState('');

  // Issue / Receive Form
  const [movementType, setMovementType] = useState<'issue' | 'receive'>('issue');
  const [movementQty, setMovementQty] = useState('1');
  const [movementRef, setMovementRef] = useState('WO-00284');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.binLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesWh = warehouseFilter === 'All' || item.warehouse === warehouseFilter;
    return matchesSearch && matchesCat && matchesWh;
  });

  const totalSKUs = inventory.length;
  const totalValuation = inventory.reduce((sum, item) => sum + item.quantityOnHand * item.unitCost, 0);
  const lowStockCount = inventory.filter((item) => item.quantityOnHand > 0 && item.quantityOnHand <= item.minLevel).length;
  const outOfStockCount = inventory.filter((item) => item.quantityOnHand === 0).length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const created: InventoryItem = {
      id: `inv-${Date.now()}`,
      sku: newSku || `SKU-${newCategory.slice(0, 3).toUpperCase()}-0${Math.floor(Math.random() * 90 + 10)}`,
      name: newName,
      category: newCategory,
      warehouse: newWarehouse,
      binLocation: newBin,
      unit: newUnit,
      quantityOnHand: parseInt(newQty, 10) || 5,
      minLevel: parseInt(newMin, 10) || 2,
      maxLevel: parseInt(newMax, 10) || 15,
      unitCost: parseFloat(newCost) || 100,
      supplier: newSupplier || 'Local Industrial Supplier',
      lastRestocked: '2026-11-08',
    };

    setInventory([created, ...inventory]);
    setShowAddModal(false);
    setNewName('');
    setNewSku('');
    setNotification(`Stock item ${created.sku} added to ${created.warehouse}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleStockMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qtyChange = parseInt(movementQty, 10) || 1;

    const newQtyVal =
      movementType === 'issue'
        ? Math.max(0, selectedItem.quantityOnHand - qtyChange)
        : selectedItem.quantityOnHand + qtyChange;

    const updated = inventory.map((i) => {
      if (i.id === selectedItem.id) {
        return { ...i, quantityOnHand: newQtyVal, lastRestocked: '2026-11-08' };
      }
      return i;
    });

    setInventory(updated);
    setSelectedItem({ ...selectedItem, quantityOnHand: newQtyVal });
    setShowIssueModal(false);
    setNotification(
      movementType === 'issue'
        ? `Issued ${qtyChange} ${selectedItem.unit} of ${selectedItem.sku} to ${movementRef}.`
        : `Received ${qtyChange} ${selectedItem.unit} of ${selectedItem.sku} from ${movementRef}.`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Package className="h-3.5 w-3.5" />
              <span>Domain 06: Spare Parts & Inventory</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Inventory & Spare Parts
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control warehouse stock levels, bin locations, reorder thresholds, and work order spare parts issuance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Stock Item</span>
            </button>
          </div>
        </div>

        {/* Banner Alert */}
        {notification && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)}>
              <X className="h-3.5 w-3.5 text-emerald-600" />
            </button>
          </div>
        )}

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Catalog SKUs</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#0B1336] tabular-nums">{totalSKUs}</span>
              <span className="text-[11px] text-slate-500">Active Parts</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Stock Value</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 tabular-nums font-mono">
                GH₵ {(totalValuation / 1000).toFixed(1)}k
              </span>
              <span className="text-[11px] text-emerald-600">Holding Value</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Low Stock Reorders</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-amber-600 tabular-nums">{lowStockCount}</span>
              <span className="text-[11px] text-amber-600 font-medium">Below Min</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Stockouts</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-rose-600 tabular-nums">{outOfStockCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">Critical Depletion</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, part name, bin, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Warehouse className="h-3.5 w-3.5 text-slate-400" />
              <span>Store:</span>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Stores</option>
                <option value="Central Store Tema">Central Store Tema</option>
                <option value="Accra Transit Store">Accra Transit Store</option>
                <option value="Tema Port Maintenance Workshop">Tema Port Workshop</option>
                <option value="Kumasi Spare Parts Hub">Kumasi Hub</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Categories</option>
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="HVAC & Refrigeration">HVAC & Refrigeration</option>
                <option value="Lubricants & Fluids">Lubricants & Fluids</option>
                <option value="Filters & Seals">Filters & Seals</option>
                <option value="Safety & PPE">Safety & PPE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Register Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Part Description</th>
                  <th className="py-3 px-4">Warehouse & Bin</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">On Hand</th>
                  <th className="py-3 px-4">Min / Max</th>
                  <th className="py-3 px-4 text-right">Unit Cost (GH₵)</th>
                  <th className="py-3 px-4 text-right">Total Value (GH₵)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isOutOfStock = item.quantityOnHand === 0;
                  const isLowStock = !isOutOfStock && item.quantityOnHand <= item.minLevel;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Supplier: {item.supplier}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{item.warehouse}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.binLocation}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {item.quantityOnHand} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {item.minLevel} / {item.maxLevel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {item.unitCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {(item.quantityOnHand * item.unitCost).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 group-hover:text-[#FF5B00] group-hover:bg-orange-50 transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawer: Item Details & Movement */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedItem.sku}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {selectedItem.category}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedItem.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedItem.warehouse} · Bin: {selectedItem.binLocation}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Stock Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Current On-Hand</span>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                        {selectedItem.quantityOnHand} <span className="text-xs font-normal">{selectedItem.unit}</span>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Unit Price</span>
                      <div className="text-xl font-bold font-mono text-[#0B1336] mt-1">
                        GH₵ {selectedItem.unitCost.toLocaleString()}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Holding</span>
                      <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                        GH₵ {(selectedItem.quantityOnHand * selectedItem.unitCost).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Reorder Rules */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Inventory Controls</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 text-[10px]">Min Reorder Threshold</span>
                        <p className="font-semibold text-slate-900">{selectedItem.minLevel} {selectedItem.unit}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Max Capacity</span>
                        <p className="font-semibold text-slate-900">{selectedItem.maxLevel} {selectedItem.unit}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Preferred Vendor</span>
                        <p className="font-semibold text-slate-900">{selectedItem.supplier}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Last Cycle Restock</span>
                        <p className="text-slate-600">{selectedItem.lastRestocked}</p>
                      </div>
                    </div>
                  </div>

                  {/* Movement History */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Recent Movements & Issues</span>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                      <div className="p-3 flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-800">PO Delivery Receipt (+4 units)</div>
                            <div className="text-[11px] text-slate-500">PO-2026-0089 · Received at Tema Store</div>
                          </div>
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">Nov 4, 2026</span>
                      </div>
                      <div className="p-3 flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <ArrowDownRight className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-800">Issued to Work Order (-1 unit)</div>
                            <div className="text-[11px] text-slate-500">WO-00284 · Chiller head replacement</div>
                          </div>
                        </div>
                        <span className="font-mono text-slate-400 text-[10px]">Nov 8, 2026</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#FF5B00] text-white font-bold hover:bg-[#E65200] text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Issue / Adjust Stock</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Stock Item */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[#FF5B00]" />
                  <span>Add New Stock SKU</span>
                </h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Part Description *</label>
                    <input
                      required
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Danfoss 37kW VFD"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">SKU Code *</label>
                    <input
                      required
                      type="text"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="e.g. SKU-VFD-015"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="HVAC & Refrigeration">HVAC & Refrigeration</option>
                      <option value="Lubricants & Fluids">Lubricants & Fluids</option>
                      <option value="Filters & Seals">Filters & Seals</option>
                      <option value="Safety & PPE">Safety & PPE</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Warehouse</label>
                    <select
                      value={newWarehouse}
                      onChange={(e) => setNewWarehouse(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Central Store Tema">Central Store Tema</option>
                      <option value="Accra Transit Store">Accra Transit Store</option>
                      <option value="Tema Port Maintenance Workshop">Tema Port Workshop</option>
                      <option value="Kumasi Spare Parts Hub">Kumasi Hub</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Bin Location</label>
                    <input
                      type="text"
                      value={newBin}
                      onChange={(e) => setNewBin(e.target.value)}
                      placeholder="BAY-A1-S1"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Initial Quantity</label>
                    <input
                      type="number"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Unit Cost (GH₵)</label>
                    <input
                      type="number"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Preferred Supplier</label>
                  <input
                    type="text"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="e.g. Danfoss Ghana / Apex Power"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200]"
                  >
                    Add Stock SKU
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue / Receive Stock */}
        {showIssueModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336]">
                  Record Movement for {selectedItem.sku}
                </h3>
                <button onClick={() => setShowIssueModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleStockMovement} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('issue')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors ${
                      movementType === 'issue'
                        ? 'border-[#FF5B00] bg-orange-50 text-[#FF5B00]'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Issue to Work Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('receive')}
                    className={`py-2 px-3 rounded-lg font-bold border transition-colors ${
                      movementType === 'receive'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Receive Delivery
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Quantity ({selectedItem.unit})</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Reference Number *</label>
                  <input
                    required
                    type="text"
                    value={movementRef}
                    onChange={(e) => setMovementRef(e.target.value)}
                    placeholder="e.g. WO-00284 or PO-2026-0089"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#FF5B00] px-4 py-2 font-bold text-white hover:bg-[#E65200]"
                  >
                    Confirm Movement
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
