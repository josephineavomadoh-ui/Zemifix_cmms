'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { LocationHierarchyTree, LocationNode } from '@/src/components/assets/LocationHierarchyTree';

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
        body: JSON.stringify({
          name,
          code,
          building,
        }),
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/dashboard/assets" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand-orange" /> Spatial Locations
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300">New Location</h2>
          <form onSubmit={handleCreateLocation} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. LOC-PUMP-ROOM-1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Water Pump Station"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Building / Facility</label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Block C"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Location'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Spatial Location Tree</h2>
          {loading ? (
            <div className="text-sm text-slate-500 py-8 text-center">Loading spatial locations...</div>
          ) : (
            <LocationHierarchyTree locations={locations} />
          )}
        </div>
      </div>
    </div>
  );
}
