'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Tag, MapPin, Building, Activity, Layers } from 'lucide-react';
import { AssetStatusBadge } from '@/src/components/assets/AssetStatusBadge';

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAssets(data.assets ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-brand-orange" />
            Equipment & Asset Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Master physical asset tracking, location hierarchy, telemetry meters, and status lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/assets/categories"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/dashboard/assets/locations"
            className="px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Locations
          </Link>
          <button
            onClick={() => alert('New Asset Registration Form (Click an asset below to inspect detail)')}
            className="px-4 py-2 text-sm font-medium bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-brand-orange/10"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset tag, serial number, or asset name..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
          >
            <option value="">All Statuses</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="DEGRADED">Degraded</option>
            <option value="DOWN">Down</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
            <option value="STANDBY">Standby</option>
            <option value="RETIRED">Retired</option>
            <option value="DISPOSED">Disposed</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div>No assets found matching the query criteria.</div>
            <div className="text-xs text-slate-500">Register new equipment or clear your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/50">
                  <th className="py-3.5 px-4">Asset Tag</th>
                  <th className="py-3.5 px-4">Name / Category</th>
                  <th className="py-3.5 px-4">Placement / Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Criticality</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-brand-orange">
                      <Link href={`/dashboard/assets/${asset.id}`} className="hover:underline">
                        {asset.assetTag}
                      </Link>
                      {asset.serialNumber && (
                        <div className="text-xs font-sans text-slate-500">S/N: {asset.serialNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{asset.name}</div>
                      <div className="text-xs text-slate-400">{asset.category?.name ?? 'Uncategorized'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {asset.location ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{asset.location.name}</span>
                          <span className="text-slate-500">({asset.branch?.code})</span>
                        </div>
                      ) : asset.site ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{asset.site.name}</span>
                          <span className="text-slate-500">({asset.ownerCustomer?.name})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unplaced</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <AssetStatusBadge status={asset.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      <span className={`px-2 py-0.5 rounded ${
                        asset.criticality === 1 ? 'bg-rose-500/10 text-rose-400' :
                        asset.criticality === 2 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        Level {asset.criticality}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/assets/${asset.id}`}
                        className="text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors"
                      >
                        Inspect
                      </Link>
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
