'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../brand/Logo';
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquareWarning,
  Wrench,
  CalendarCheck2,
  Boxes,
  Truck,
  Receipt,
  BarChart3,
  Building2,
  Users2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const navigationGroups = [
    {
      group: 'Core Operations',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, badge: '42' },
        { name: 'Requests', href: '/requests', icon: MessageSquareWarning, badge: '11' },
        { name: 'Assets & Equipment', href: '/dashboard/assets', icon: Wrench },
        { name: 'Preventive Maint.', href: '/preventive', icon: CalendarCheck2, alertBadge: '3' },
      ],
    },
    {
      group: 'Supply & Finance',
      items: [
        { name: 'Inventory & Stock', href: '/inventory', icon: Boxes },
        { name: 'Procurement', href: '/procurement', icon: Truck },
        { name: 'Finance & Billing', href: '/finance', icon: Receipt },
        { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
      ],
    },
    {
      group: 'Administration',
      items: [
        { name: 'Organization', href: '/organization', icon: Building2 },
        { name: 'Users & Roles', href: '/users', icon: Users2 },
        { name: 'System Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0B1336] text-white transition-all duration-300 ease-in-out border-r border-[#16204E] ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-3.5 border-b border-[#16204E]">
          {collapsed ? (
            <div className="mx-auto">
              <Logo variant="icon" width={32} height={32} />
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-0.5">
              <Logo variant="dark" width={130} height={34} />
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label="Toggle sidebar"
            className="hidden lg:flex h-6.5 w-6.5 items-center justify-center rounded-md text-slate-400 hover:bg-[#16204E] hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Operating Modes Badge */}
        {!collapsed && (
          <div className="shrink-0 px-3 py-1.5 mx-2.5 mt-2 rounded-lg bg-[#070D26] border border-[#16204E] flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Mode:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Facility + Contractor
            </span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 space-y-3 scrollbar-thin scrollbar-thumb-slate-700/50">
          {navigationGroups.map((grp) => (
            <div key={grp.group} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {grp.group}
                </div>
              )}

              {grp.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === '/dashboard' && pathname === '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={collapsed ? item.name : undefined}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#FF5B00] text-white font-semibold shadow-xs shadow-[#FF5B00]/30'
                        : 'text-slate-300 hover:bg-[#16204E] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />

                    {!collapsed && (
                      <span className="flex-1 truncate leading-tight">{item.name}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#16204E] text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {!collapsed && item.alertBadge && (
                      <span className="rounded-full bg-rose-500/90 text-white px-1.5 py-0.2 text-[10px] font-bold">
                        {item.alertBadge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Quick Info */}
        {!collapsed ? (
          <div className="shrink-0 p-2.5 border-t border-[#16204E] bg-[#070D26]/80 text-[11px] text-slate-400">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">ZemiFix CMMS</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#16204E] rounded text-[#FF5B00] font-mono">
                v1.0-RC
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500 truncate">
              Single-Company Enterprise Deployment
            </p>
          </div>
        ) : (
          <div className="shrink-0 p-2 border-t border-[#16204E] text-center">
            <span className="text-[10px] font-mono text-[#FF5B00]">v1.0</span>
          </div>
        )}
      </aside>
    </>
  );
};
