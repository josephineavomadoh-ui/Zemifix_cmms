'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Folder, Plus } from 'lucide-react';
import { AssetCategoryTree, CategoryNode } from '@/src/components/assets/AssetCategoryTree';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { LoadingSkeleton } from '@/src/components/ui/LoadingSkeleton';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assets/categories');
      const data = await res.json();
      if (res.ok) setCategories(data.categories ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        setName('');
        setCode('');
        setParentId('');
        fetchCategories();
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
        eyebrowIcon={Folder}
        title="Asset Categories"
        description="Organize assets into a hierarchical category tree for better classification and reporting."
        breadcrumbs={[
          { label: 'Asset Register', href: '/dashboard/assets' },
          { label: 'Categories' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800">New Category</h2>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className={labelClass}>Category Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CAT-PUMP"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Centrifugal Pumps"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Parent Category (Optional)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={inputClass}
              >
                <option value="">None (Top-Level Category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5B00] py-2 text-sm font-medium text-white shadow-sm hover:bg-[#F95700] transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Creating…' : 'Create Category'}
            </button>
          </form>
        </div>

        {/* Category Tree */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Category Tree Hierarchy</h2>
          {loading ? (
            <LoadingSkeleton rows={6} columns={2} />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Folder}
              title="No categories defined yet"
              description="Create your first asset category to start classifying equipment."
            />
          ) : (
            <AssetCategoryTree categories={categories} />
          )}
        </div>
      </div>
    </div>
  );
}
