import React from 'react';

export type WorkOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<WorkOrderStatus, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  OPEN: { label: 'Open', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  ON_HOLD: { label: 'On Hold', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

export const WorkOrderStatusBadge: React.FC<WorkOrderStatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status] ?? statusConfig.OPEN;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`} />
      {cfg.label}
    </span>
  );
};
