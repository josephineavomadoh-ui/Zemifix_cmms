import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-[#FF5B00] font-bold text-lg">
          404
        </div>
        <h1 className="text-xl font-bold text-[#0B1336]">Page Not Found</h1>
        <p className="text-xs text-slate-500">
          The requested CMMS module or record could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-[#FF5B00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E65200] transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
