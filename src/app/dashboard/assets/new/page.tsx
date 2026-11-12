'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Save, Wrench } from 'lucide-react';

interface AssetCategory {
  id: string;
  name: string;
  code: string;
  path?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

const fieldClass =
  'mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#FF5B00] focus:outline-none';

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    assetTag: '',
    name: '',
    categoryId: '',
    branchId: '',
    locationId: '',
    serialNumber: '',
    manufacturer: '',
    modelNumber: '',
    description: '',
    criticality: '3',
  });

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [categoryResponse, branchResponse] = await Promise.all([
          fetch('/api/assets/categories'),
          fetch('/api/organization/branches'),
        ]);
        const [categoryData, branchData] = await Promise.all([
          categoryResponse.json(),
          branchResponse.json(),
        ]);

        if (!categoryResponse.ok) {
          throw new Error(categoryData?.message || categoryData?.error || 'Unable to load asset categories.');
        }
        if (!branchResponse.ok) {
          throw new Error(branchData?.message || branchData?.error || 'Unable to load branches.');
        }
        if (!Array.isArray(categoryData.categories) || !Array.isArray(branchData.data)) {
          throw new Error('The asset setup data was not in the expected format.');
        }

        if (active) {
          setCategories(categoryData.categories);
          setBranches(branchData.data);
          setOptionsError(null);
        }
      } catch (loadError) {
        if (active) {
          setOptionsError(loadError instanceof Error ? loadError.message : 'Unable to load asset setup data.');
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.branchId) {
      setLocations([]);
      setForm((current) => ({ ...current, locationId: '' }));
      return;
    }

    const controller = new AbortController();
    async function loadLocations() {
      try {
        const response = await fetch(`/api/assets/locations?branchId=${encodeURIComponent(form.branchId)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || data?.error || 'Unable to load locations for this branch.');
        }
        if (!Array.isArray(data.locations)) {
          throw new Error('The location response was not in the expected format.');
        }
        setLocations(data.locations);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === 'AbortError')) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load branch locations.');
        }
      }
    }

    void loadLocations();
    return () => controller.abort();
  }, [form.branchId]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetTag: form.assetTag.trim(),
          name: form.name.trim(),
          categoryId: form.categoryId,
          branchId: form.branchId || null,
          locationId: form.locationId || null,
          serialNumber: form.serialNumber.trim() || null,
          manufacturer: form.manufacturer.trim() || null,
          modelNumber: form.modelNumber.trim() || null,
          description: form.description.trim() || null,
          criticality: Number(form.criticality),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Unable to register asset (HTTP ${response.status}).`);
      }
      router.push('/dashboard/assets');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to register this asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/assets" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#080E29]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Asset register
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-[#D94D00]">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#080E29]">Register an asset</h1>
            <p className="mt-1 text-sm text-slate-500">Add equipment to the live asset register.</p>
          </div>
        </div>
      </div>

      {optionsError && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {optionsError}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <section>
          <h2 className="text-sm font-semibold text-[#080E29]">Asset information</h2>
          <p className="mt-1 text-xs text-slate-500">Fields marked required are needed by the asset register.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">
              Asset tag <span className="text-[#FF5B00]">*</span>
              <input required maxLength={50} value={form.assetTag} onChange={(event) => update('assetTag', event.target.value)} placeholder="AST-HVAC-015" className={fieldClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Asset name <span className="text-[#FF5B00]">*</span>
              <input required maxLength={150} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Main chiller unit" className={fieldClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Category <span className="text-[#FF5B00]">*</span>
              <select required value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} className={fieldClass} disabled={loadingOptions || categories.length === 0}>
                <option value="">{loadingOptions ? 'Loading categories…' : 'Select a category'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name} ({category.code})</option>
                ))}
              </select>
              {!loadingOptions && categories.length === 0 && (
                <Link href="/dashboard/assets/categories" className="mt-1 inline-block text-[11px] font-medium text-[#D94D00] hover:underline">
                  Create an asset category
                </Link>
              )}
            </label>
            <label className="text-xs font-medium text-slate-700">
              Criticality
              <select value={form.criticality} onChange={(event) => update('criticality', event.target.value)} className={fieldClass}>
                <option value="1">1 · Critical</option>
                <option value="2">2 · High</option>
                <option value="3">3 · Standard</option>
                <option value="4">4 · Low</option>
                <option value="5">5 · Minor</option>
              </select>
            </label>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[#080E29]">
            <Building2 className="h-4 w-4 text-slate-400" />
            Placement and identification
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">
              Branch
              <select value={form.branchId} onChange={(event) => update('branchId', event.target.value)} className={fieldClass} disabled={loadingOptions}>
                <option value="">No branch selected</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              Location
              <select value={form.locationId} onChange={(event) => update('locationId', event.target.value)} className={fieldClass} disabled={!form.branchId || locations.length === 0}>
                <option value="">{form.branchId ? 'No location selected' : 'Select a branch first'}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name} ({location.code})</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              Serial number
              <input maxLength={100} value={form.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} className={fieldClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Manufacturer
              <input maxLength={100} value={form.manufacturer} onChange={(event) => update('manufacturer', event.target.value)} className={fieldClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Model number
              <input maxLength={100} value={form.modelNumber} onChange={(event) => update('modelNumber', event.target.value)} className={fieldClass} />
            </label>
            <label className="text-xs font-medium text-slate-700 sm:col-span-2">
              Description
              <textarea rows={3} value={form.description} onChange={(event) => update('description', event.target.value)} className={`${fieldClass} h-auto py-2`} />
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Link href="/dashboard/assets" className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || loadingOptions || categories.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#FF5B00] px-4 text-xs font-semibold text-white hover:bg-[#F95700] disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="h-4 w-4" />
            {submitting ? 'Saving asset…' : 'Save asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
