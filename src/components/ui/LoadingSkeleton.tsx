import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Animated pulse skeleton — used as a placeholder while table data loads.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {Array.from({ length: columns }).map((_, ci) => (
              <th key={ci} className="px-4 py-3">
                <div className="h-2.5 w-20 animate-pulse rounded bg-slate-200" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri}>
              {Array.from({ length: columns }).map((_, ci) => (
                <td key={ci} className="px-4 py-3.5">
                  <div
                    className="h-3 animate-pulse rounded bg-slate-100"
                    style={{ width: `${55 + ((ri + ci) % 3) * 15}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
