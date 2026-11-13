'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface KpiCardSegment {
  label: string;
  count: number;
  value: number;
  color: string;
}

export interface KpiCardProps {
  category?: string;
  title: string;
  href: string;
  icon: LucideIcon;
  tone: 'navy' | 'orange' | 'emerald' | 'amber' | 'rose';
  value: string | number;
  badgeText?: string;
  subDetail?: string;
  progressBar?: {
    type: 'single' | 'segmented';
    value?: number;
    color?: string;
    segments?: KpiCardSegment[];
  };
  footerText: string;
  footerTrend?: 'up' | 'down' | 'neutral' | 'check';
}

const toneStyles = {
  navy: 'bg-slate-100 text-[#0B1336]',
  orange: 'bg-orange-50 text-[#FF5B00]',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  category,
  title,
  href,
  icon: Icon,
  tone,
  value,
  badgeText,
  subDetail,
  progressBar,
  footerText,
  footerTrend,
}) => {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between min-w-0 rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B00]"
    >
      <div>
        {/* Category Label & Icon */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {category && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                {category}
              </p>
            )}
            <h3 className={`text-xs sm:text-sm font-semibold text-[#080E29] truncate ${category ? 'mt-0.5' : ''}`}>
              {title}
            </h3>
          </div>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {/* Primary Metric & Inline Badge */}
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl sm:text-2.5xl font-bold tracking-tight text-[#080E29] tabular-nums">
            {value}
          </span>
          {badgeText && (
            <span className="text-[11px] font-medium text-slate-500 truncate">
              {badgeText}
            </span>
          )}
        </div>

        {/* Supporting Sub-detail */}
        {subDetail && (
          <p className="mt-1 text-[11px] text-slate-500 leading-snug truncate">
            {subDetail}
          </p>
        )}

        {/* Progress Visualizations */}
        {progressBar && (
          <div className="mt-3.5 space-y-1.5">
            {progressBar.type === 'segmented' && progressBar.segments ? (
              <>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  {progressBar.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className={`h-full ${seg.color} transition-all duration-300`}
                      style={{ width: `${Math.max(seg.value, 0)}%` }}
                      title={`${seg.label}: ${seg.count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[10px] font-medium text-slate-600">
                  {progressBar.segments.map((seg, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${seg.color}`} />
                      {seg.label} <strong className="text-slate-800 tabular-nums">{seg.count}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${progressBar.color || 'bg-[#FF5B00]'} transition-all duration-300`}
                  style={{ width: `${Math.max(Math.min(progressBar.value ?? 0, 100), 0)}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contextual Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1 min-w-0 truncate">
          {footerTrend === 'up' && <span className="text-emerald-600 font-semibold">↗</span>}
          {footerTrend === 'down' && <span className="text-rose-600 font-semibold">↘</span>}
          {footerTrend === 'check' && <span className="text-emerald-600 font-semibold">✓</span>}
          <span className="truncate">{footerText}</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[#FF5B00] group-hover:translate-x-0.5 transition-transform duration-150" />
      </div>
    </Link>
  );
};
