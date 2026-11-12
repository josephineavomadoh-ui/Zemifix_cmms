'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarCheck2, ClipboardList, Wrench } from 'lucide-react';
import { PageHeader } from '@/src/components/ui/PageHeader';

export function PreventiveView() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Maintenance"
        eyebrowIcon={CalendarCheck2}
        title="Preventive maintenance"
        description="Review planned maintenance and its relationship to work orders."
      />

      <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#080E29]">Schedule data is not available</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-600">
              The current frontend has no preventive-maintenance API for listing or saving maintenance plans. No sample schedule data is shown here, and this page does not claim changes have been saved.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/work-orders"
                className="inline-flex items-center gap-2 rounded-md bg-[#FF5B00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#F95700]"
              >
                <ClipboardList className="h-4 w-4" />
                View work orders
              </Link>
              <Link
                href="/dashboard/assets"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Wrench className="h-4 w-4" />
                View asset register
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
