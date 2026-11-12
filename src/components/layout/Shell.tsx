'use client';

/**
 * Shell — application wrapper for authenticated routes.
 *
 * Delegates to AppShell which implements the new ZemiFix design system
 * (AppSidebar + AppTopbar). Kept as a thin wrapper so existing imports
 * of `Shell` across the codebase continue to work without changes.
 */

import React from 'react';
import { AppShell } from './AppShell';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  return <AppShell>{children}</AppShell>;
};
