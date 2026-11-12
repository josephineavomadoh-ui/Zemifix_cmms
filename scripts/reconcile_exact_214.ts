/**
 * Exact 214 User Reconciliation Script (Inspection Only)
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function reconcile214() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.12 Exact 214 Reconciliation');
  console.log('=====================================================');

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isActive: true,
      branch: { select: { code: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const corrManifest = JSON.parse(fs.readFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_corrected.json', 'utf-8'));
  const corrManifestIds = new Set(corrManifest.users.map((u: any) => u.id));

  const primaryAdmin = allUsers.filter((u) => u.email === 'admin@zemifix.local');
  const yOsei = allUsers.filter((u) => u.email === 'y.osei@zemifix.local');
  const wrongBranch = allUsers.filter((u) => u.email.includes('wrongbranch'));
  const inManifest = allUsers.filter((u) => corrManifestIds.has(u.id));
  const notInManifest = allUsers.filter((u) => !corrManifestIds.has(u.id));

  console.log(`Total DB users: ${allUsers.length}`);
  console.log(`Primary Admin count: ${primaryAdmin.length}`);
  console.log(`y.osei count: ${yOsei.length}`);
  console.log(`wrongbranch count: ${wrongBranch.length}`);
  console.log(`In Corrected Manifest (Cleanup targets): ${inManifest.length}`);
  console.log(`Not in Manifest (Preserved non-admin + admin): ${notInManifest.length}`);

  console.log(`\nNot in Manifest users:`);
  notInManifest.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
}

reconcile214();
