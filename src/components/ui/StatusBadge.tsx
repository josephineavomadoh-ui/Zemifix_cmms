import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (
    norm.includes('completed') ||
    norm.includes('verified') ||
    norm.includes('operational') ||
    norm.includes('approved') ||
    norm.includes('closed')
  ) {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (
    norm.includes('inprogress') ||
    norm.includes('assigned') ||
    norm.includes('active')
  ) {
    styles = 'bg-orange-50 text-[#FF5B00] border-orange-200 font-semibold';
    dotColor = 'bg-[#FF5B00] animate-pulse';
  } else if (
    norm.includes('open') ||
    norm.includes('underreview') ||
    norm.includes('submitted') ||
    norm.includes('standby')
  ) {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
  } else if (
    norm.includes('onhold') ||
    norm.includes('pending') ||
    norm.includes('degraded') ||
    norm.includes('undermaintenance') ||
    norm.includes('low stock')
  ) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (
    norm.includes('urgent') ||
    norm.includes('critical') ||
    norm.includes('down') ||
    norm.includes('overdue') ||
    norm.includes('rejected') ||
    norm.includes('breached')
  ) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    dotColor = 'bg-rose-500';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium tracking-tight ${padding} ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};
