import React from 'react';

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

/**
 * Priority badge: low / medium / high / critical (and legacy "urgent")
 * low: grey, medium: blue, high: amber, critical: red with dot indicator.
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const norm = priority.toLowerCase();

  let styles = 'bg-slate-100 text-slate-600 border-slate-200';
  let dot = 'bg-slate-400';

  if (norm === 'critical' || norm === 'urgent') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    dot = 'bg-rose-500';
  } else if (norm === 'high') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200 font-semibold';
    dot = 'bg-amber-500';
  } else if (norm === 'medium') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dot = 'bg-blue-500';
  } else if (norm === 'low') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
    dot = 'bg-slate-400';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight ${padding} ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      <span>{priority}</span>
    </span>
  );
};
