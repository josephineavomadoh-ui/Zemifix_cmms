import React from 'react';

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

/**
 * Dedicated badge for maintenance priority (Low / Medium / High / Urgent),
 * since StatusBadge does not cover priority semantics well.
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const norm = priority.toLowerCase();
  let styles = 'bg-slate-100 text-slate-600 border-slate-200';
  let dot = 'bg-slate-400';

  if (norm === 'urgent') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    dot = 'bg-rose-500';
  } else if (norm === 'high') {
    styles = 'bg-orange-50 text-[#FF5B00] border-orange-200 font-semibold';
    dot = 'bg-[#FF5B00]';
  } else if (norm === 'medium') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    dot = 'bg-amber-500';
  } else if (norm === 'low') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dot = 'bg-emerald-500';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight ${padding} ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{priority}</span>
    </span>
  );
};
