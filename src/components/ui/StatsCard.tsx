import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';

export type StatsCardColor = 'default' | 'orange' | 'success' | 'warning' | 'error';

export interface StatsCardTrend {
  direction: 'up' | 'down' | 'neutral';
  label: string;
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: StatsCardTrend;
  color?: StatsCardColor;
  onClick?: () => void;
}

const colorMap: Record<StatsCardColor, { iconBg: string; iconText: string; iconBorder: string }> = {
  default:  { iconBg: 'bg-slate-100',   iconText: 'text-[#0B1336]',   iconBorder: 'border-slate-200' },
  orange:   { iconBg: 'bg-orange-50',   iconText: 'text-[#FF5B00]',   iconBorder: 'border-orange-100' },
  success:  { iconBg: 'bg-emerald-50',  iconText: 'text-emerald-700', iconBorder: 'border-emerald-100' },
  warning:  { iconBg: 'bg-amber-50',    iconText: 'text-amber-700',   iconBorder: 'border-amber-100' },
  error:    { iconBg: 'bg-rose-50',     iconText: 'text-rose-700',    iconBorder: 'border-rose-100' },
};

const trendIcon = {
  up:      TrendingUp,
  down:    TrendingDown,
  neutral: Minus,
};

const trendStyle = {
  up:      'text-emerald-700 bg-emerald-50',
  down:    'text-rose-700 bg-rose-50',
  neutral: 'text-slate-600 bg-slate-100',
};

/**
 * KPI summary card used on dashboards and overview pages.
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  color = 'default',
  onClick,
}) => {
  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-transform group-hover:scale-105 ${c.iconBg} ${c.iconText} ${c.iconBorder}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        <span className="text-2xl font-bold tracking-tight text-[#0B1336]">{value}</span>
      </div>

      {/* Trend */}
      {trend && (() => {
        const TrendIcon = trendIcon[trend.direction];
        return (
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${trendStyle[trend.direction]}`}>
              <TrendIcon className="h-3 w-3" />
              {trend.label}
            </span>
          </div>
        );
      })()}
    </div>
  );
};
