'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/lib/auth-context';
import {
  Menu,
  Search,
  Bell,
  Building,
  ChevronDown,
  ShieldCheck,
  User,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';

interface TopNavProps {
  onOpenMobile: () => void;
  collapsed: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobile }) => {
  const { user, selectedBranch, setSelectedBranch, logout } = useAuth();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/organization/branches')
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) setBranches(res.data);
      })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'ZF';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-6 backdrop-blur-md">
      {/* Left Area: Mobile menu & Quick search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches, departments, staff..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#FF5B00] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#FF5B00]"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hidden md:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Area: Branch Selector, Approvals, Alerts, User Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition-colors"
          >
            <Building className="h-3.5 w-3.5 text-[#0B1336]" />
            <span className="hidden md:inline text-slate-500">Branch:</span>
            <span className="max-w-[120px] md:max-w-[160px] truncate text-[#0B1336] font-semibold">
              {selectedBranch}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showBranchMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 pb-2 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Scoped Branch
              </div>
              <div className="max-h-60 overflow-y-auto pt-1">
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBranch(b.name);
                        setShowBranchMenu(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50 ${
                        selectedBranch === b.name
                          ? 'font-bold text-[#FF5B00] bg-orange-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="truncate">{b.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {b.code} ({b.type})
                        </div>
                      </div>
                      {selectedBranch === b.name && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5B00]" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-500">Loading branches...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dual-Control Approval Trigger */}
        <div
          title="Dual-Control Approval Queue"
          className="relative flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
        >
          <ShieldCheck className="h-4 w-4 text-[#FF5B00]" />
          <span className="hidden sm:inline">Dual-Control</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            0
          </span>
        </div>

        {/* Notifications */}
        <button
          title="System Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B1336] text-xs font-bold text-white shadow-xs">
              {initials}
            </div>
            <div className="hidden text-left xl:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || 'Staff User'}
              </div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5">
                {user?.role?.name || 'Administrator'}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden xl:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name || 'Staff User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                    Scope: {user?.accessScope || 'Company'}
                  </span>
                  <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
              <div className="pt-1 text-xs text-slate-700">
                <Link
                  href="/users"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Staff Directory
                </Link>
                <Link
                  href="/organization"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <Building className="h-4 w-4 text-slate-400" />
                  Organization Tree
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
