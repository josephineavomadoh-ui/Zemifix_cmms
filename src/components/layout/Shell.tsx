'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar navigation */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <TopNav
          collapsed={collapsed}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
