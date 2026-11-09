'use client';

import React from 'react';

/** Horizontal progress bars for category breakdowns (reused from DashboardView). */
export function HorizontalBars({
  items,
  unit = '',
}: {
  items: { label: string; value: number; color: string }[];
  unit?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-600">{item.label}</span>
            <span className="tabular-nums font-semibold text-[#0B1336]">
              {item.value}
              {unit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simple vertical bar chart from label/value pairs. */
export function BarChart({
  data,
  height = 160,
  color = 'bg-[#0B1336]',
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 border-b border-slate-200 pb-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-center text-[9px] tabular-nums text-slate-500">
            {valueFormatter ? valueFormatter(d.value) : d.value}
          </span>
          <div
            className={`w-full max-w-10 rounded-t ${color} transition-colors hover:bg-[#FF5B00]`}
            style={{ height: `${Math.max((d.value / max) * 78, 3)}%` }}
            role="img"
            aria-label={`${d.label}: ${d.value}`}
          />
          <span className="truncate text-[10px] font-medium text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Lightweight SVG line chart. */
export function LineChart({
  data,
  height = 160,
  stroke = '#FF5B00',
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  height?: number;
  stroke?: string;
  valueFormatter?: (v: number) => string;
}) {
  const w = 100;
  const h = 100;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((d, i) => {
    const x = i * step;
    const y = h - ((d.value - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lineFill)" />
        <path d={path} fill="none" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="1.2" fill={stroke} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        {data.map((d) => (
          <span key={d.label} className="text-[9px] text-slate-400">
            {d.label}
            {valueFormatter ? ` ${valueFormatter(d.value)}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut chart with a centre label and legend. */
export function DonutChart({
  data,
  size = 160,
  centreLabel,
  centreValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centreLabel?: string;
  centreValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const segment = (
              <circle
                key={i}
                cx="20"
                cy="20"
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth="6"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        {(centreLabel || centreValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centreValue && <span className="text-lg font-bold text-[#0B1336]">{centreValue}</span>}
            {centreLabel && <span className="text-[9px] font-semibold uppercase text-slate-400">{centreLabel}</span>}
          </div>
        )}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="truncate text-slate-600">{d.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-slate-700">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Circular gauge for a single percentage metric. */
export function GaugeRing({
  value,
  max = 100,
  size = 96,
  label,
  color = '#10b981',
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.min(value / max, 1);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${pct * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-bold text-[#0B1336]">{Math.round(value)}%</span>
        {label && <span className="text-[8px] font-semibold uppercase text-slate-400">{label}</span>}
      </div>
    </div>
  );
}
