'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  loadingRows?: number;
  empty?: React.ReactNode;
  /** Sticky column header on scroll within a panel. */
  stickyHeader?: boolean;
}

/**
 * Generic data table used across all modules. Renders loading skeletons,
 * an empty slot, hover states and optional row click (e.g. open a drawer).
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  loading = false,
  loadingRows = 6,
  empty,
  stickyHeader = false,
}: DataTableProps<T>) {
  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr
            className={`border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
              stickyHeader ? 'sticky top-0 z-10' : ''
            }`}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 ${alignClass(col.align)} ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading &&
            Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-2">
                {empty ?? (
                  <p className="py-8 text-center text-xs text-slate-400">No records to display.</p>
                )}
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-slate-50 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 align-middle ${alignClass(col.align)} ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : (row as Record<string, React.ReactNode>)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/** Convenience type for a "no records" empty cell referencing an icon. */
export function TableEmpty({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-slate-300" strokeWidth={1.6} />
      <p className="mt-2 text-xs text-slate-400">{label}</p>
    </div>
  );
}
