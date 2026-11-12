'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Original FilterBar API (backwards-compatible)                        */
/* ------------------------------------------------------------------ */

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSelect {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface LegacyFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  rightActions?: React.ReactNode;
  /** Discriminant to select legacy API */
  filters?: undefined;
}

/* ------------------------------------------------------------------ */
/* New FilterBar API (spec-compliant)                                   */
/* ------------------------------------------------------------------ */

export interface FilterDefinition {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface NewFilterBarProps {
  filters: FilterDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  /** Discriminant */
  searchValue?: undefined;
}

type FilterBarProps = LegacyFilterBarProps | NewFilterBarProps;

/**
 * Reusable filter row.
 *
 * Supports two call signatures:
 * 1. Legacy (search + selects + rightActions) — used by existing module pages.
 * 2. New spec (filters array + values map + onChange/onClear) — used by new pages.
 */
export const FilterBar: React.FC<FilterBarProps> = (props) => {
  /* ---- New API ---- */
  if ('filters' in props && props.filters !== undefined) {
    const { filters, values, onChange, onClear } = props as NewFilterBarProps;
    const hasValues = Object.values(values).some(Boolean);

    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {filters.map((f) => (
          <div key={f.key} className="flex items-center gap-1.5">
            <label htmlFor={`filter-${f.key}`} className="hidden text-[11px] font-semibold text-slate-500 sm:inline">
              {f.label}
            </label>
            <select
              id={`filter-${f.key}`}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
            >
              <option value="">{f.label}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {hasValues && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    );
  }

  /* ---- Legacy API ---- */
  const {
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search…',
    selects = [],
    rightActions,
  } = props as LegacyFilterBarProps;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF5B00] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
          />
        </div>
        {selects.map((sel) => (
          <div key={sel.key} className="flex items-center gap-1.5">
            <span className="hidden text-[11px] font-semibold text-slate-500 sm:inline">{sel.label}</span>
            <select
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#FF5B00] focus:outline-none"
            >
              {sel.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {rightActions && <div className="flex shrink-0 items-center gap-2">{rightActions}</div>}
    </div>
  );
};
