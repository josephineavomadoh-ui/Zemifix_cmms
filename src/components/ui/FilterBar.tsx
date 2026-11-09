'use client';

import React from 'react';
import { Search, LucideIcon } from 'lucide-react';

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

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchIcon?: LucideIcon;
  selects?: FilterSelect[];
  rightActions?: React.ReactNode;
}

/** Reusable filter row: search + configurable selects + right-aligned actions. */
export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  searchIcon: SearchIcon = Search,
  selects = [],
  rightActions,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
