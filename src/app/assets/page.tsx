'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockAssets, mockBranches } from '@/src/lib/mockData';
import { AssetRecord, AssetCriticality, AssetStatus } from '@/src/lib/types';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Tag,
  Wrench,
  X,
  ChevronRight,
  Activity,
  ShieldCheck,
  Building,
  BarChart2,
  FileText,
} from 'lucide-react';

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>(mockAssets);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  // New Asset Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState<any>('HVAC');
  const [newCriticality, setNewCriticality] = useState<AssetCriticality>('High');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newCost, setNewCost] = useState('85000');
  const [newBranch, setNewBranch] = useState('Tema Industrial Region');
  const [newLocation, setNewLocation] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
    const matchesCriticality = criticalityFilter === 'All' || a.criticality === criticalityFilter;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesBranch = branchFilter === 'All' || a.branchName === branchFilter;
    return matchesSearch && matchesCategory && matchesCriticality && matchesStatus && matchesBranch;
  });

  const totalAssetsCount = assets.length;
  const operationalCount = assets.filter((a) => a.status === 'Operational').length;
  const criticalCount = assets.filter((a) => a.criticality === 'Critical').length;
  const underMaintenanceCount = assets.filter((a) => a.status === 'UnderMaintenance' || a.status === 'Down').length;
  const totalValuation = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const created: AssetRecord = {
      id: `ast-${Date.now()}`,
      tag: newTag || `AST-${newCategory.slice(0, 3).toUpperCase()}-0${Math.floor(Math.random() * 90 + 10)}`,
      name: newName,
      category: newCategory,
      criticality: newCriticality,
      status: 'Operational',
      branchName: newBranch,
      location: newLocation || 'Main Plant Zone',
      manufacturer: newManufacturer || 'Industrial OEM',
      model: newModel || 'Model-2026',
      serialNumber: newSerial || `SN-${Date.now().toString().slice(-6)}`,
      installationDate: '2026-11-01',
      warrantyExpiry: '2029-11-01',
      purchaseCost: parseFloat(newCost) || 50000,
      runtimeHours: 0,
      lastServiceDate: '2026-11-01',
      nextServiceDue: '2026-12-01',
    };

    setAssets([created, ...assets]);
    setShowAddModal(false);
    setNewName('');
    setNewTag('');
    setNotification(`Asset ${created.tag} registered successfully.`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1 border border-blue-200">
              <Layers className="h-3.5 w-3.5" />
              <span>Domain 04: Asset Lifecycle & Engineering</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336]">
              Assets & Equipment Register
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain asset hierarchy, physical locations, warranty lifecycles, run-hour telemetry, and service histories.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Register Asset</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Registered</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#0B1336] tabular-nums">1,428</span>
              <span className="text-[11px] text-slate-500">All Units</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Operational Rate</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-emerald-600 tabular-nums">98.2%</span>
              <span className="text-[11px] text-emerald-600">Online</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Critical Units</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-rose-600 tabular-nums">{criticalCount}</span>
              <span className="text-[11px] text-rose-600 font-medium">Tier-1 Assets</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Under Maintenance</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-[#FF5B00] tabular-nums">{underMaintenanceCount}</span>
              <span className="text-[11px] text-amber-600">In Workshop</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Asset Valuation</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold text-slate-900 tabular-nums font-mono">
                GH₵ {(totalValuation / 1000).toFixed(0)}k
              </span>
              <span className="text-[11px] text-slate-500">Book Value</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tag, equipment name, serial#, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#FF5B00]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Categories</option>
                <option value="HVAC">HVAC</option>
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Fleet & Heavy">Fleet & Heavy</option>
                <option value="Fire & Safety">Fire & Safety</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Criticality:</span>
              <select
                value={criticalityFilter}
                onChange={(e) => setCriticalityFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Criticalities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Operational">Operational</option>
                <option value="Degraded">Degraded</option>
                <option value="UnderMaintenance">Under Maintenance</option>
                <option value="Down">Down</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assets Register Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Asset Tag</th>
                  <th className="py-3 px-4">Equipment & Model</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location / Branch</th>
                  <th className="py-3 px-4">Criticality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Run Hours</th>
                  <th className="py-3 px-4">Next PM Due</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No assets found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B1336] whitespace-nowrap">
                        {asset.tag}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#FF5B00] transition-colors">
                          {asset.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {asset.manufacturer} · {asset.model}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {asset.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{asset.location}</div>
                        <div className="text-[10px] text-slate-400">{asset.branchName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={asset.criticality} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={asset.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {asset.runtimeHours.toLocaleString()} hrs
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {asset.nextServiceDue}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 group-hover:text-[#FF5B00] group-hover:bg-orange-50 transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asset Details Drawer */}
        {selectedAsset && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-in fade-in">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#0B1336] bg-slate-200/80 px-2 py-0.5 rounded">
                        {selectedAsset.tag}
                      </span>
                      <StatusBadge status={selectedAsset.status} size="sm" />
                      <StatusBadge status={selectedAsset.criticality} size="sm" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-2">
                      {selectedAsset.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedAsset.location} · {selectedAsset.branchName}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Technical Specifications */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Technical Specifications</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 text-[10px]">Manufacturer</span>
                        <p className="font-semibold text-slate-900">{selectedAsset.manufacturer}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Model & Spec</span>
                        <p className="font-semibold text-slate-900">{selectedAsset.model}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Serial Number</span>
                        <p className="font-mono font-bold text-[#0B1336]">{selectedAsset.serialNumber}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Acquisition Cost</span>
                        <p className="font-mono font-bold text-slate-900">GH₵ {selectedAsset.purchaseCost.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Installation Date</span>
                        <p className="text-slate-700">{selectedAsset.installationDate}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Warranty Expiration</span>
                        <p className="text-emerald-700 font-semibold">{selectedAsset.warrantyExpiry}</p>
                      </div>
                    </div>
                  </div>

                  {/* Operational Telemetry */}
                  <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Operational Telemetry</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded p-3 bg-slate-50/50">
                        <span className="text-[10px] text-slate-400">Cumulative Run-Hours</span>
                        <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                          {selectedAsset.runtimeHours.toLocaleString()} hrs
                        </div>
                      </div>
                      <div className="border border-slate-100 rounded p-3 bg-slate-50/50">
                        <span className="text-[10px] text-slate-400">Next Scheduled Service</span>
                        <div className="text-sm font-bold text-orange-600 mt-1">
                          {selectedAsset.nextServiceDue}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Log */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Recent Service History</span>
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                      <div className="p-3 flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">Quarterly Overhaul & Vibration Analysis</div>
                          <div className="text-[11px] text-slate-500">WO-00284 · Passed all diagnostic checks</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{selectedAsset.lastServiceDate}</span>
                      </div>
                      <div className="p-3 flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">Preventive Filter & Lubrication Service</div>
                          <div className="text-[11px] text-slate-500">WO-00241 · Clean report by Mechanical Crew</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">2026-06-12</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-2">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Close
                </button>
                <a
                  href="/work-orders"
                  className="px-4 py-2 rounded-lg bg-[#FF5B00] text-white font-bold hover:bg-[#E65200] text-xs flex items-center gap-1.5"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Raise Work Order</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Register Asset */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-[#0B1336] flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#FF5B00]" />
                  <span>Register New Asset</span>
                </h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Equipment Name *</label>
                    <input
                      required
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Centrifugal Chiller 500TR"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Asset Tag *</label>
                    <input
                      required
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="e.g. AST-HVAC-015"
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
                      <option value="HVAC">HVAC</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Fleet & Heavy">Fleet & Heavy</option>
                      <option value="Fire & Safety">Fire & Safety</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Criticality Tier</label>
                    <select
                      value={newCriticality}
                      onChange={(e) => setNewCriticality(e.target.value as AssetCriticality)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      <option value="Critical">Critical (Tier 1)</option>
                      <option value="High">High (Tier 2)</option>
                      <option value="Medium">Medium (Tier 3)</option>
                      <option value="Low">Low (Tier 4)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Manufacturer</label>
                    <input
                      type="text"
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                      placeholder="e.g. Trane / Cummins"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Model</label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="Model Number"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Serial #</label>
                    <input
                      type="text"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value)}
                      placeholder="OEM Serial"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Operating Branch</label>
                    <select
                      value={newBranch}
                      onChange={(e) => setNewBranch(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    >
                      {mockBranches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Physical Location</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="Plant Room / Roof / Bay"
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Acquisition Cost (GH₵)</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
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
                    Register Asset
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
