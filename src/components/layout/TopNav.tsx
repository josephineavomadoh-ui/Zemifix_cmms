'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/lib/auth-context';
import {
  Building,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
} from 'lucide-react';
import { NotificationHub } from '../notifications/NotificationHub';

interface TopNavProps {
  onOpenMobile: () => void;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  type: string;
}

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

function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/work-orders/')) return 'Work order details';
  if (pathname.startsWith('/dashboard/assets/')) return 'Asset details';
  return 'Operations workspace';
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobile }) => {
  const pathname = usePathname();
  const { user, selectedBranch, setSelectedBranch, logout } = useAuth();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBranches() {
      try {
        const response = await fetch('/api/organization/branches', { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.message || result?.error || `Unable to load branches (HTTP ${response.status}).`);
        }
        if (!Array.isArray(result?.data)) {
          throw new Error('The branch list response was not in the expected format.');
        }
        setBranches(result.data);
        setBranchError(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setBranchError(error instanceof Error ? error.message : 'Unable to load branches.');
      } finally {
        if (!controller.signal.aborted) setBranchesLoading(false);
      }
    }

    void loadBranches();
    return () => controller.abort();
  }, []);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ZF';

  return (
    <header className="sticky top-0 z-30 flex min-h-16 w-full items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#080E29]">{getPageTitle(pathname)}</p>
          <p className="hidden text-[11px] text-slate-500 sm:block">ZemiFix operations workspace</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowBranchMenu((open) => !open);
              setShowProfileMenu(false);
            }}
            aria-haspopup="menu"
            aria-expanded={showBranchMenu}
            className="flex h-9 max-w-[190px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:px-3"
          >
            <Building className="h-4 w-4 shrink-0 text-[#0B1336]" />
            <span className="hidden text-slate-500 sm:inline">Branch</span>
            <span className="truncate font-semibold text-[#0B1336]">{selectedBranch}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>

          {showBranchMenu && (
            <div role="menu" className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Available branches
              </p>
              {branchesLoading ? (
                <p className="px-3 py-4 text-xs text-slate-500">Loading branches…</p>
              ) : branchError ? (
                <p role="alert" className="px-3 py-4 text-xs text-rose-700">{branchError}</p>
              ) : branches.length ? (
                <div className="max-h-64 overflow-y-auto py-1">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSelectedBranch(branch.name);
                        setShowBranchMenu(false);
                      }}
                      className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                        selectedBranch === branch.name ? 'bg-orange-50/60 text-[#0B1336]' : 'text-slate-700'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{branch.name}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">{branch.code} · {branch.type}</span>
                      </span>
                      {selectedBranch === branch.name && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF5B00]" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-4 text-xs text-slate-500">No branches are available for this account.</p>
              )}
            </div>
          )}
        </div>

        <NotificationHub realm="staff" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((open) => !open);
              setShowBranchMenu(false);
            }}
            aria-label="Open user menu"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            className="flex h-9 items-center gap-2 rounded-md px-1.5 transition hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1336] text-[11px] font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-36 text-left xl:block">
              <span className="block truncate text-xs font-semibold text-slate-800">{user?.name || 'Staff account'}</span>
              <span className="block truncate text-[10px] text-slate-500">{user?.role?.name || 'ZemiFix'}</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
          </button>

          {showProfileMenu && (
            <div role="menu" className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <div className="border-b border-slate-100 px-2.5 pb-2.5">
                <p className="truncate text-xs font-semibold text-slate-900">{user?.name || 'Staff account'}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{user?.email || 'Signed-in workspace'}</p>
                {user?.accessScope && <p className="mt-2 text-[10px] text-slate-500">Access scope: {user.accessScope}</p>}
              </div>
              <Link
                href="/users"
                role="menuitem"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <User className="h-4 w-4 text-slate-400" />
                Staff directory
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
