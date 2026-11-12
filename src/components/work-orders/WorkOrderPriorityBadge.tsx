import React from 'react';

export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';

interface WorkOrderPriorityBadgeProps {
  priority: WorkOrderPriority;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<WorkOrderPriority, { label: string; bg: string; text: string; border: string }> = {
  LOW: { label: 'Low', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  MEDIUM: { label: 'Medium', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  HIGH: { label: 'High', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  URGENT: { label: 'Urgent', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  EMERGENCY: { label: 'Emergency', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

export const WorkOrderPriorityBadge: React.FC<WorkOrderPriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const cfg = priorityConfig[priority] ?? priorityConfig.MEDIUM;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded border ${cfg.bg} ${cfg.text} ${cfg.border} ${padding}`}>
      {cfg.label}
    </span>
  );
};
