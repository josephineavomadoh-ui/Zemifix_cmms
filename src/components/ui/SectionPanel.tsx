import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionPanelProps {
  eyebrow?: string;
  title?: string;
  detail?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** Removes default inner padding for tables that manage their own padding. */
  flush?: boolean;
}

/**
 * White card container matching the DashboardView Panel + SectionHeading pattern.
 * Extracted so every module shares the same card chrome.
 */
export const SectionPanel: React.FC<SectionPanelProps> = ({
  eyebrow,
  title,
  detail,
  href,
  linkLabel,
  children,
  className = '',
  flush = false,
}) => {
  return (
    <section
      className={`min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm ${
        flush ? '' : 'p-4 sm:p-5'
      } ${className}`}
    >
      {(title || eyebrow) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-base font-bold tracking-tight text-[#0B1336]">{title}</h2>
            )}
            {detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>}
          </div>
          {href && linkLabel && (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#FF5B00] hover:text-[#D94D00]"
            >
              {linkLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
};
