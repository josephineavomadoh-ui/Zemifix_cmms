import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction | React.ReactNode;
}

/**
 * Consistent empty / no-records placeholder used across all ZemiFix modules.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  // Distinguish between the action object shape and a React node passed directly (backwards compat)
  const isActionObject = (a: unknown): a is EmptyStateAction =>
    typeof a === 'object' && a !== null && 'label' in a && 'onClick' in a;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && (
        <div className="mt-4">
          {isActionObject(action) ? (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#F95700]"
            >
              {action.label}
            </button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
};
