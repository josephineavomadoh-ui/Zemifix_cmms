import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

type StyleTuple = [containerClass: string, dotClass: string];

function resolveStyles(norm: string): StyleTuple {
  // Exact matches first (spec-required statuses)
  if (norm === 'open')        return ['bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-500'];
  if (norm === 'in-progress' || norm === 'inprogress')
                              return ['bg-amber-50 text-amber-800 border-amber-200', 'bg-amber-500 animate-pulse'];
  if (norm === 'completed')   return ['bg-emerald-50 text-emerald-800 border-emerald-200', 'bg-emerald-500'];
  if (norm === 'overdue')     return ['bg-rose-50 text-rose-700 border-rose-200 font-semibold', 'bg-rose-500'];
  if (norm === 'cancelled')   return ['bg-slate-100 text-slate-600 border-slate-200', 'bg-slate-400'];
  if (norm === 'pending')     return ['bg-yellow-50 text-yellow-800 border-yellow-200', 'bg-yellow-500'];
  if (norm === 'approved')    return ['bg-emerald-50 text-emerald-800 border-emerald-200', 'bg-emerald-500'];
  if (norm === 'rejected')    return ['bg-rose-50 text-rose-700 border-rose-200 font-semibold', 'bg-rose-500'];

  // Broader keyword matches (backwards compatibility)
  if (norm.includes('verified') || norm.includes('operational') || norm.includes('closed'))
    return ['bg-emerald-50 text-emerald-800 border-emerald-200', 'bg-emerald-500'];
  if (norm.includes('assigned') || norm.includes('active'))
    return ['bg-orange-50 text-[#FF5B00] border-orange-200 font-semibold', 'bg-[#FF5B00] animate-pulse'];
  if (norm.includes('submitted') || norm.includes('underreview') || norm.includes('standby'))
    return ['bg-blue-50 text-blue-700 border-blue-200', 'bg-blue-500'];
  if (
    norm.includes('onhold') ||
    norm.includes('degraded') ||
    norm.includes('undermaintenance') ||
    norm.includes('low stock')
  )
    return ['bg-amber-50 text-amber-800 border-amber-200', 'bg-amber-500'];
  if (
    norm.includes('urgent') ||
    norm.includes('critical') ||
    norm.includes('down') ||
    norm.includes('breached')
  )
    return ['bg-rose-50 text-rose-700 border-rose-200 font-semibold', 'bg-rose-500'];

  // Fallback: grey
  return ['bg-slate-100 text-slate-700 border-slate-200', 'bg-slate-400'];
}

/**
 * Pill badge for record statuses across all ZemiFix modules.
 * Accepts the full range of CMMS status strings.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase().replace(/[\s_]/g, '');
  const [containerClass, dotClass] = resolveStyles(norm);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight ${padding} ${containerClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{status}</span>
    </span>
  );
};
