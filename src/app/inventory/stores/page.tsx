'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building, Plus } from 'lucide-react';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<string>('MAIN');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/stores');
      const data = await res.json();
      if (res.ok) setStores(data.stores ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/inventory/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          type,
        }),
      });

      if (res.ok) {
        setCode('');
        setName('');
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/inventory" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Catalog
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-orange" /> Warehouse & Stores Management
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300">New Store / Warehouse</h2>
          <form onSubmit={handleCreateStore} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Store Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. STR-MAIN-ACC"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Central Warehouse"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Store Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                <option value="MAIN">Main Warehouse</option>
                <option value="BRANCH">Branch Store</option>
                <option value="DEPARTMENT">Departmental Store</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Store'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">Active Warehouses & Stores</h2>
          {loading ? (
            <div className="text-sm text-slate-500 py-8 text-center">Loading stores...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((s) => (
                <div key={s.id} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm text-white">{s.name}</div>
                      <div className="font-mono text-brand-orange">{s.code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{s.type}</span>
                  </div>
                  <div className="text-slate-400">Branch: {s.branch?.name}</div>
                  <div className="text-slate-400">Manager: {s.managerUser?.name ?? 'Unassigned'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
