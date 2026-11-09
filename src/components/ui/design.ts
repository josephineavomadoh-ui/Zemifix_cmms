/**
 * Shared design tokens and micro-component helpers used across every module.
 * Import from here to keep visual language consistent.
 */

/** Accent colour → Tailwind classes for a KPI chip */
export type ChipAccent = 'slate' | 'orange' | 'rose' | 'emerald' | 'amber' | 'blue' | 'purple' | 'navy';

export const chipBg: Record<ChipAccent, string> = {
  slate:   'bg-slate-100 text-[#0B1336]',
  navy:    'bg-[#0B1336] text-white',
  orange:  'bg-orange-50 text-[#D94D00]',
  rose:    'bg-rose-50 text-rose-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  blue:    'bg-blue-50 text-blue-700',
  purple:  'bg-purple-50 text-purple-700',
};

/** Page-level header helper classnames */
export const pageTitle = 'text-2xl font-bold tracking-tight text-[#0B1336]';
export const pageEyebrow = 'mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400';
export const pageDesc = 'mt-1 text-sm text-slate-500';

/** Card container */
export const card = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm';

/** Table head cell */
export const th = 'px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400';

/** Button variants */
export const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E65200] transition-colors';
export const btnSecondary = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors';

/** Demo banner */
export const demoBanner = 'flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] text-amber-800';
