'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Shell } from './Shell';

const standalonePrefixes = ['/login', '/portal', '/pwa', '/request/qr'];

export function ApplicationFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = standalonePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isStandalone) return <>{children}</>;

  return <Shell>{children}</Shell>;
}
