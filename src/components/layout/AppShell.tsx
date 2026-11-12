'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { useAuth } from '@/src/lib/auth-context';
import {
  Building,
  ChevronDown,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Nested-shell guard (same pattern as Shell.tsx)                       */
/* ------------------------------------------------------------------ */

const AppShellContext = createContext(false);

/* ------------------------------------------------------------------ */
/* Page title helpers                                                    */
/* ------------------------------------------------------------------ */

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/work-orders': 'Work orders',
  '/work-orders/new': 'Create work order',
  '/work-orders/calendar': 'Work order schedule',
  '/requests': 'Service requests',
  '/assets': 'Assets',
  '/dashboard/assets': 'Asset register',
  '/dashboard/assets/locations': 'Asset locations',
  '/dashboard/assets/categories': 'Asset categories',
  '/preventive': 'Preventive maintenance',
  '/inventory': 'Inventory',
  '/inventory/new': 'Create part',
  '/inventory/reorder': 'Reorder queue',
  '/inventory/returns': 'Stock returns',
  '/inventory/stores': 'Stores',
  '/inventory/transactions': 'Stock transactions',
  '/procurement': 'Procurement',
  '/procurement/requisitions': 'Purchase requisitions',
  '/procurement/purchase-orders': 'Purchase orders',
  '/procurement/vendors': 'Suppliers',
  '/customers': 'Customers',
  '/contracts': 'Contracts',
  '/quotes': 'Quotes',
  '/sla/policies': 'SLA policies',
  '/sla/breaches': 'SLA breaches',
  '/finance': 'Finance',
  '/finance/invoices': 'Invoices',
  '/reports': 'Reports',
  '/organization': 'Organization',
  '/workers': 'Workers',
  '/users': 'Users & roles',
  '/import': 'Data import',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/work-orders/')) return 'Work order';
  if (pathname.startsWith('/dashboard/assets/')) return 'Asset details';
  if (pathname.startsWith('/customers/')) return 'Customer details';
  if (pathname.startsWith('/contracts/')) return 'Contract details';
  return 'ZemiFix CMMS';
}

/* ------------------------------------------------------------------ */
/* Branch selector (self-contained, reads from auth context)            */
/* ------------------------------------------------------------------ */

interface Branch {
  id: string;
  name: string;
  code: string;
  type: string;
}

function BranchSelector() {
  const { selectedBranch, setSelectedBranch } = useAuth();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = React.useRef(false);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/organization/branches');
      const result = await res.json();
      if (!res.ok) throw new Error(result?.message || 'Unable to load branches');
      if (Array.isArray(result?.data)) setBranches(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading branches');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 max-w-[180px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Building className="h-3.5 w-3.5 shrink-0 text-[#0B1336]" />
        <span className="hidden text-slate-500 sm:inline">Branch</span>
        <span className="max-w-[80px] truncate font-semibold text-[#0B1336]">{selectedBranch}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
          <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Available branches
          </p>
          {loading ? (
            <p className="px-3 py-4 text-xs text-slate-500">Loading…</p>
          ) : error ? (
            <p className="px-3 py-4 text-xs text-rose-700">{error}</p>
          ) : branches.length ? (
            <div className="max-h-60 overflow-y-auto py-1">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { setSelectedBranch(b.name); setOpen(false); }}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                    selectedBranch === b.name ? 'bg-orange-50/60 text-[#0B1336]' : 'text-slate-700'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{b.name}</span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">{b.code} · {b.type}</span>
                  </span>
                  {selectedBranch === b.name && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF5B00]" />}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-xs text-slate-500">No branches available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AppShell                                                              */
/* ------------------------------------------------------------------ */

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isNested = useContext(AppShellContext);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isNested) return <>{children}</>;

  const sidebarUser = {
    name: user?.name ?? 'Staff account',
    role: user?.role?.name ?? 'ZemiFix',
    email: user?.email ?? '',
  };

  const topbarUser = {
    name: user?.name ?? 'Staff account',
  };

  const title = getPageTitle(pathname);

  return (
    <AppShellContext.Provider value={true}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Sidebar */}
        <AppSidebar
          currentPath={pathname}
          user={sidebarUser}
          onLogout={() => void logout()}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main column */}
        <div
          className={`flex min-h-screen flex-col transition-[padding-left] duration-200 ${
            collapsed ? 'lg:pl-16' : 'lg:pl-60'
          }`}
        >
          {/* Topbar */}
          <AppTopbar
            title={title}
            user={topbarUser}
            onMenuToggle={() => setMobileOpen(true)}
            onLogout={() => void logout()}
            notificationCount={0}
            branchSelector={<BranchSelector />}
          />

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-[1440px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
