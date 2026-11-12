'use client';

import React, { useEffect, useState } from 'react';
import { Building, Plus } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

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
        body: JSON.stringify({ code, name, type }),
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

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 shadow-xs transition focus:border-[#FF5B00] focus:outline-none focus:ring-2 focus:ring-[#FF5B00]/20';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        eyebrowIcon={Building}
        title="Warehouse & Stores Management"
        description="Configure physical storage locations for inventory management and stock tracking."
        breadcrumbs={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stores' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">New Store / Warehouse</h2>
          <form onSubmit={handleCreateStore} className="space-y-4">
            <div>
              <label className={labelClass}>Store Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. STR-MAIN-ACC"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Store Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Central Warehouse"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Store Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                <option value="MAIN">Main Warehouse</option>
                <option value="BRANCH">Branch Store</option>
                <option value="DEPARTMENT">Departmental Store</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5B00] py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Creating…' : 'Create Store'}
            </button>
          </form>
        </div>

        {/* Stores Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Active Warehouses & Stores</h2>
          {loading ? (
            <LoadingSkeleton rows={4} columns={3} />
          ) : stores.length === 0 ? (
            <EmptyState
              icon={Building}
              title="No stores created yet"
              description="Create your first warehouse or store to manage stock locations."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{s.name}</div>
                      <div className="font-mono text-xs text-[#FF5B00] mt-0.5">{s.code}</div>
                    </div>
                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                      {s.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">Branch: {s.branch?.name ?? '—'}</div>
                  <div className="text-xs text-slate-500">Manager: {s.managerUser?.name ?? 'Unassigned'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
