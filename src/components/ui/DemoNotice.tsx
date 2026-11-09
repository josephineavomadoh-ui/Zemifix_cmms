import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DemoNoticeProps {
  /** Optional custom message; a sensible default is used otherwise. */
  message?: string;
  /** Compact single-line variant for tighter layouts. */
  compact?: boolean;
}

/**
 * Amber demonstration-data banner. Every module driven by demo data should
 * surface this so users are never led to believe local state is persisted.
 */
export const DemoNotice: React.FC<DemoNoticeProps> = ({
  message = 'The figures and records below are demonstration data and are not connected to live operational APIs. No changes made here are permanently saved.',
  compact = false,
}) => {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className={`min-w-0 flex-1 ${compact ? 'text-[11px]' : 'text-xs'} leading-relaxed`}>
        <strong className="font-bold">Demonstration data: </strong>
        {message}
      </p>
    </div>
  );
};
