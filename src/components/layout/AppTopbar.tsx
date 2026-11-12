'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
} from 'lucide-react';

export interface AppTopbarBreadcrumb {
  label: string;
  href?: string;
}

export interface AppTopbarUser {
  name: string;
  avatarUrl?: string;
}

export interface AppTopbarProps {
  title: string;
  breadcrumbs?: AppTopbarBreadcrumb[];
  notificationCount?: number;
  user: AppTopbarUser;
  onMenuToggle: () => void;
  onLogout: () => void;
  /** Optional right-side branch selector dropdown */
  branchSelector?: React.ReactNode;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  title,
  breadcrumbs,
  notificationCount = 0,
  user,
  onMenuToggle,
  onLogout,
  branchSelector,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileRef, () => setShowProfile(false));

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const badgeCount = notificationCount > 99 ? '99+' : notificationCount > 0 ? String(notificationCount) : null;

  return (
    <header className="sticky top-0 z-30 flex h-[60px] w-full items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 md:px-6">
      {/* ---- Left side ---- */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Title + breadcrumbs */}
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-0.5 hidden items-center gap-1 sm:flex">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-[11px] text-slate-500 hover:text-[#FF5B00] transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <p className="truncate text-sm font-semibold text-[#080E29]">{title}</p>
        </div>
      </div>

      {/* ---- Right side ---- */}
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        {/* Optional branch selector slot */}
        {branchSelector}

        {/* Search icon button */}
        <button
          type="button"
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#080E29]"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications bell */}
        <button
          type="button"
          aria-label={`Notifications${badgeCount ? ` (${badgeCount} unread)` : ''}`}
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#080E29]"
        >
          <Bell className="h-4 w-4" />
          {badgeCount && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF5B00] px-1 text-[10px] font-bold text-white leading-none">
              {badgeCount}
            </span>
          )}
        </button>

        {/* User avatar + dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            aria-label="Open user menu"
            aria-haspopup="menu"
            aria-expanded={showProfile}
            className="flex h-8 items-center gap-1.5 rounded-md px-1 transition hover:bg-slate-50"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1336] text-[10px] font-semibold text-white">
                {initials}
              </span>
            )}
            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-slate-800 xl:block">
              {user.name}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
          </button>

          {showProfile && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
            >
              <div className="border-b border-slate-100 px-2.5 pb-2.5 pt-1">
                <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
              </div>
              <Link
                href="/users"
                role="menuitem"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                Settings
              </Link>
              <hr className="my-1 border-slate-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfile(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
