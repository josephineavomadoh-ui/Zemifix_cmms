import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Small domain eyebrow pill, e.g. "Work Orders". */
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description?: string;
  /** Right-aligned action buttons / filters. */
  actions?: React.ReactNode;
  breadcrumbs?: PageHeaderBreadcrumb[];
}

/**
 * Consistent module page header used across every ZemiFix module.
 * Renders optional breadcrumbs, an eyebrow badge, the page title,
 * a short description, and an optional actions slot aligned to the right.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-[11px] text-slate-400">{'/'}</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-[11px] text-slate-500 hover:text-[#FF5B00] transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-400">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Eyebrow badge — brand colours (orange accent, not blue) */}
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-[#FF5B00]">
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
