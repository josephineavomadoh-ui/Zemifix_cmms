import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  accentColor?: 'orange' | 'navy' | 'emerald' | 'amber' | 'rose';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  accentColor = 'navy',
  onClick,
}) => {
  const colorMap = {
    orange: {
      bg: 'bg-orange-50',
      text: 'text-[#FF5B00]',
      border: 'border-orange-100',
      badge: 'text-[#FF5B00] bg-orange-100/60',
    },
    navy: {
      bg: 'bg-slate-100',
      text: 'text-[#0B1336]',
      border: 'border-slate-200',
      badge: 'text-slate-700 bg-slate-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      badge: 'text-emerald-700 bg-emerald-100/60',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      badge: 'text-amber-700 bg-amber-100/60',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
      badge: 'text-rose-700 bg-rose-100/60',
    },
  };

  const c = colorMap[accentColor];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${c.border} ${c.bg} ${c.text} transition-transform group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#0B1336]">
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-medium text-slate-500">{subValue}</span>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium text-[11px] ${
              trend.isNeutral
                ? 'bg-slate-100 text-slate-600'
                : trend.isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-400">vs last month</span>
        </div>
      )}
    </div>
  );
};
