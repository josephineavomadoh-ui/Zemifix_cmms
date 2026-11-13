'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart2,
  FileInput,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Upload,
  Users,
  Users2,
  Wrench,
  MessageSquareWarning,
} from 'lucide-react';
import { ZemifixLogo } from '../ui/ZemifixLogo';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

export interface AppSidebarUser {
  name: string;
  role: string;
  email: string;
}

type OperatingMode = 'facility' | 'contractor';

export interface AppSidebarProps {
  currentPath: string;
  user: AppSidebarUser;
  onLogout: () => void;
  mode?: OperatingMode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/* ------------------------------------------------------------------ */
/* Navigation definition                                                 */
/* ------------------------------------------------------------------ */

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  key: string;
  items: NavItem[];
}

const facilityGroups: NavGroup[] = [
  {
    group: 'Overview',
    key: 'overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Operations',
    key: 'operations',
    items: [
      { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
      { name: 'Assets', href: '/dashboard/assets', icon: Wrench },
      { name: 'Preventive Maintenance', href: '/preventive', icon: CalendarCheck2 },
    ],
  },
  {
    group: 'Supply',
    key: 'supply',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Boxes },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
    ],
  },
  {
    group: 'Business',
    key: 'business',
    items: [
      { name: 'Customers', href: '/customers', icon: Users2 },
      { name: 'Contracts & SLA', href: '/contracts', icon: Handshake },
      { name: 'Invoicing', href: '/finance/invoices', icon: Receipt },
    ],
  },
  {
    group: 'Management',
    key: 'management',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Organization', href: '/organization', icon: Building2 },
      { name: 'Users & Roles', href: '/users', icon: Users },
    ],
  },
  {
    group: 'System',
    key: 'system',
    items: [
      { name: 'Import', href: '/import', icon: Upload },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const contractorGroups: NavGroup[] = [
  {
    group: 'Overview',
    key: 'overview',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Business',
    key: 'business',
    items: [
      { name: 'Customers', href: '/customers', icon: Users2 },
      { name: 'Contracts & SLA', href: '/contracts', icon: Handshake },
      { name: 'Invoicing', href: '/finance/invoices', icon: Receipt },
    ],
  },
  {
    group: 'Operations',
    key: 'operations',
    items: [
      { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
      { name: 'Assets', href: '/dashboard/assets', icon: Wrench },
      { name: 'Preventive Maintenance', href: '/preventive', icon: CalendarCheck2 },
    ],
  },
  {
    group: 'Management',
    key: 'management',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Organization', href: '/organization', icon: Building2 },
      { name: 'Users & Roles', href: '/users', icon: Users },
    ],
  },
  {
    group: 'Supply',
    key: 'supply',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Boxes },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
    ],
  },
  {
    group: 'System',
    key: 'system',
    items: [
      { name: 'Import', href: '/import', icon: Upload },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                             */
/* ------------------------------------------------------------------ */

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentPath,
  user,
  onLogout,
  mode = 'facility',
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const groups = mode === 'contractor' ? contractorGroups : facilityGroups;

  // Collapsible group state — all expanded by default
  const initialOpen = Object.fromEntries(groups.map((g) => [g.key, true]));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) => {
    if (href === '/dashboard') return currentPath === '/' || currentPath === '/dashboard';
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#080E29]/60 lg:hidden"
        />
      )}

      <aside
        style={{ width: collapsed ? 64 : 240 }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#080E29] text-white transition-[width,transform] duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ---- Logo ---- */}
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-white/10 px-3">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            aria-label="ZemiFix dashboard"
            className={`flex items-center ${collapsed ? 'mx-auto' : 'min-w-0'}`}
          >
            <ZemifixLogo
              variant={collapsed ? 'icon-only' : 'full'}
              size="md"
              theme="light"
            />
          </Link>
          {!collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ---- Navigation ---- */}
        <nav
          aria-label="Main navigation"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-4"
        >
          {groups.map((group) => {
            const isOpen = openGroups[group.key] ?? true;
            const isSingleItem = group.items.length === 1;

            return (
              <section key={group.key} aria-label={group.group} className="mb-4">
                {/* Group label / toggle */}
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => !isSingleItem && toggleGroup(group.key)}
                    className={`mb-1 flex w-full items-center justify-between px-2.5 ${
                      isSingleItem ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
                      {group.group}
                    </span>
                    {!isSingleItem && (
                      <ChevronDown
                        className={`h-3 w-3 text-slate-500 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                      />
                    )}
                  </button>
                )}

                {/* Nav items */}
                {(isSingleItem || isOpen || collapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onCloseMobile}
                          title={collapsed ? item.name : undefined}
                          aria-current={active ? 'page' : undefined}
                          className={`group relative flex min-h-[36px] items-center gap-3 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                            active
                              ? 'bg-[#FF5B00] text-white font-semibold shadow-md shadow-[#FF5B00]/25'
                              : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          } ${collapsed ? 'justify-center px-0' : ''}`}
                        >
                          <Icon
                            aria-hidden="true"
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                            }`}
                          />
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {/* ---- Bottom: user + logout ---- */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'flex-col' : ''}`}>
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
              {initials}
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white">{user.name}</p>
                  <p className="truncate text-[10px] text-slate-400">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}

            {collapsed && (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Collapse toggle (bottom) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
