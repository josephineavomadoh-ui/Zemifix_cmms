import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';

interface ModulePlaceholderProps {
  moduleName: string;
  stage: string;
  description: string;
  keyFeatures: string[];
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  stage,
  description,
  keyFeatures,
}) => {
  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#FF5B00] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#0B1336] mt-2">
            {moduleName}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">{description}</p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-[#FF5B00]">
          <Clock className="h-3.5 w-3.5" />
          <span>Scheduled for {stage}</span>
        </span>
      </div>

      {/* Feature Preview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs max-w-3xl">
        <h2 className="text-sm font-bold text-[#0B1336] mb-3">
          Planned Deliverables in {stage}
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          {keyFeatures.map((feat, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 border border-slate-100"
            >
              <span className="h-2 w-2 rounded-full bg-[#FF5B00] shrink-0" />
              <span className="font-medium text-slate-800">{feat}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Ready for progressive implementation following Stage 1 sign-off.</span>
          <Link
            href="/dashboard"
            className="font-semibold text-[#FF5B00] hover:underline"
          >
            Return to Management Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
};
