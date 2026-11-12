import React from 'react';

export type AssetStatus =
  | 'OPERATIONAL'
  | 'DEGRADED'
  | 'DOWN'
  | 'IN_MAINTENANCE'
  | 'STANDBY'
  | 'RETIRED'
  | 'DISPOSED';

interface AssetStatusBadgeProps {
  status: AssetStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<AssetStatus, { label: string; bg: string; text: string; border: string }> = {
  OPERATIONAL: { label: 'Operational', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  DEGRADED: { label: 'Degraded', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  DOWN: { label: 'Down', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  IN_MAINTENANCE: { label: 'In Maintenance', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  STANDBY: { label: 'Standby', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  RETIRED: { label: 'Retired', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  DISPOSED: { label: 'Disposed', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

export const AssetStatusBadge: React.FC<AssetStatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status] ?? statusConfig.OPERATIONAL;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`} />
      {cfg.label}
    </span>
  );
};
