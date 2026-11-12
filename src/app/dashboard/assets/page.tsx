'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Tag, MapPin, Building, Activity, Layers } from 'lucide-react';
import { AssetStatusBadge } from '@/src/components/assets/AssetStatusBadge';

export default function AssetRegisterPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Unable to load assets (HTTP ${res.status}).`);
      }
      setAssets(data.assets ?? []);
      setError(null);
    } catch (err) {
      setAssets([]);
      setError(err instanceof Error ? err.message : 'Unable to load assets.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets();
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#080E29]">
            <Layers className="h-6 w-6 text-[#FF5B00]" />
            Equipment & Asset Register
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Master physical asset tracking, location hierarchy, telemetry meters, and status lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/assets/categories"
            className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Categories
          </Link>
          <Link
            href="/dashboard/assets/locations"
            className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Locations
          </Link>
          <Link
            href="/dashboard/assets/new"
            className="flex items-center gap-2 rounded-md bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#F95700]"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </Link>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset tag, serial number, or asset name..."
            className="h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#FF5B00] focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-[#FF5B00] focus:outline-none"
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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading assets…</div>
        ) : error ? (
          <div role="alert" className="p-8 text-center">
            <p className="text-sm font-semibold text-rose-700">Assets could not be loaded</p>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <button type="button" onClick={() => void fetchAssets()} className="mt-3 text-xs font-semibold text-[#D94D00] hover:underline">Try again</button>
          </div>
        ) : assets.length === 0 ? (
          <div className="space-y-2 p-12 text-center text-sm text-slate-500">
            <div>No assets found matching the query criteria.</div>
            <div className="text-xs text-slate-500">Register new equipment or clear your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Asset Tag</th>
                  <th className="px-4 py-3.5">Name / Category</th>
                  <th className="px-4 py-3.5">Placement / Location</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Criticality</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {assets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-mono font-medium text-[#D94D00]">
                      <Link href={`/dashboard/assets/${asset.id}`} className="hover:underline">
                        {asset.assetTag}
                      </Link>
                      {asset.serialNumber && (
                        <div className="font-sans text-xs text-slate-500">S/N: {asset.serialNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{asset.name}</div>
                      <div className="text-xs text-slate-500">{asset.category?.name ?? 'Uncategorized'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {asset.location ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{asset.location.name}</span>
                          <span className="text-slate-500">({asset.branch?.code})</span>
                        </div>
                      ) : asset.site ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{asset.site.name}</span>
                          <span className="text-slate-500">({asset.ownerCustomer?.name})</span>
                        </div>
                      ) : (
                        <span className="italic text-slate-500">Unplaced</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <AssetStatusBadge status={asset.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      <span className={`px-2 py-0.5 rounded ${
                        asset.criticality === 1 ? 'bg-rose-50 text-rose-700' :
                        asset.criticality === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Level {asset.criticality}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/assets/${asset.id}`}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#080E29]"
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
