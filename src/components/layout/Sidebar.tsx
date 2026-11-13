'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../brand/Logo';
import { useAuth } from '@/src/lib/auth-context';
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileInput,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users2,
  Wrench,
  MessageSquareWarning,
  Handshake,
  CircleDollarSign,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navigationGroups = [
  {
    group: 'Workspace',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'Maintenance',
    items: [
      { name: 'Work orders', href: '/work-orders', icon: ClipboardList },
      { name: 'Schedule', href: '/work-orders/calendar', icon: CalendarDays },
      { name: 'Service requests', href: '/requests', icon: MessageSquareWarning },
      { name: 'Preventive plans', href: '/preventive', icon: CalendarCheck2 },
      { name: 'Assets', href: '/assets', icon: Wrench },
      { name: 'Asset register', href: '/dashboard/assets', icon: Boxes },
      { name: 'Locations', href: '/dashboard/assets/locations', icon: Building2 },
      { name: 'Categories', href: '/dashboard/assets/categories', icon: PackageSearch },
    ],
  },
  {
    group: 'Customers & service',
    items: [
      { name: 'Customers', href: '/customers', icon: Users2 },
      { name: 'Contracts', href: '/contracts', icon: Handshake },
      { name: 'Quotes', href: '/quotes', icon: FileText },
      { name: 'SLA policies', href: '/sla/policies', icon: ShieldCheck },
      { name: 'SLA breaches', href: '/sla/breaches', icon: Activity },
    ],
  },
  {
    group: 'Supply & finance',
    items: [
      { name: 'Inventory', href: '/inventory', icon: Boxes },
      { name: 'Stores', href: '/inventory/stores', icon: Building2 },
      { name: 'Stock transactions', href: '/inventory/transactions', icon: FileText },
      { name: 'Reorder queue', href: '/inventory/reorder', icon: PackageSearch },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
      { name: 'Requisitions', href: '/procurement/requisitions', icon: FileInput },
      { name: 'Purchase orders', href: '/procurement/purchase-orders', icon: ClipboardList },
      { name: 'Suppliers', href: '/procurement/vendors', icon: HardHat },
      { name: 'Finance', href: '/finance', icon: CircleDollarSign },
      { name: 'Invoices', href: '/finance/invoices', icon: Receipt },
    ],
  },
  {
    group: 'Administration',
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Import data', href: '/import', icon: FileInput },
      { name: 'Workers', href: '/workers', icon: HardHat },
      { name: 'Organization', href: '/organization', icon: Building2 },
      { name: 'Users & roles', href: '/users', icon: Users2 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#080E29]/55 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#080E29] text-white transition-[width,transform] duration-200 ${
          collapsed ? 'w-[76px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            aria-label="ZemiFix dashboard"
            className={collapsed ? 'mx-auto' : 'min-w-0'}
          >
            <Logo
              variant={collapsed ? 'icon' : 'dark'}
              width={collapsed ? 36 : 138}
              height={collapsed ? 36 : 54}
            />
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav
          aria-label="Main navigation"
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2.5 py-5"
        >
          {navigationGroups.map((group) => (
            <section key={group.group} aria-label={group.group}>
              {!collapsed && (
                <h2 className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {group.group}
                </h2>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) ||
                    (item.href === '/dashboard' && pathname === '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={collapsed ? item.name : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group relative flex min-h-9 items-center gap-3 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#FF5B00] text-white font-semibold shadow-md shadow-[#FF5B00]/25'
                          : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {user?.name
                ? user.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'ZF'}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{user?.name || 'Staff account'}</p>
                  <p className="truncate text-[10px] text-slate-400">{user?.role?.name || 'ZemiFix workspace'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
