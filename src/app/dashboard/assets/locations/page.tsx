'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { LocationHierarchyTree, LocationNode } from '@/src/components/assets/LocationHierarchyTree';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets/locations');
      const data = await res.json();
      if (res.ok) setLocations(data.locations ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, building }),
      });

      if (res.ok) {
        setName('');
        setCode('');
        setBuilding('');
        fetchLocations();
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
        eyebrow="Assets"
        eyebrowIcon={MapPin}
        title="Spatial Locations"
        description="Define the physical location hierarchy for asset placement and work order routing."
        breadcrumbs={[
          { label: 'Asset Register', href: '/dashboard/assets' },
          { label: 'Locations' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">New Location</h2>
          <form onSubmit={handleCreateLocation} className="space-y-4">
            <div>
              <label className={labelClass}>Location Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. LOC-PUMP-ROOM-1"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Location Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Water Pump Station"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Building / Facility</label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Block C"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5B00] py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Creating…' : 'Create Location'}
            </button>
          </form>
        </div>

        {/* Location Tree */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Spatial Location Tree</h2>
          {loading ? (
            <LoadingSkeleton rows={5} columns={2} />
          ) : locations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No locations defined yet"
              description="Create your first location to map where assets are physically placed."
            />
          ) : (
            <LocationHierarchyTree locations={locations} />
          )}
        </div>
      </div>
    </div>
  );
}
