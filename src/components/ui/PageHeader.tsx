import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  /** Small domain eyebrow pill, e.g. "Domain 02: Work Orders". */
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description?: string;
  /** Right-aligned action buttons / filters. */
  actions?: React.ReactNode;
}

/**
 * Consistent module page header used across every ZemiFix module.
 * Renders an eyebrow badge, the page title, a short description and an
 * optional actions slot aligned to the right.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight text-[#0B1336] md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-xs text-slate-500 md:text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
