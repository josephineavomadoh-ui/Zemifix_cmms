/**
 * Stage R1 Phase 6.1.16 — Final Manifest Correction Tool (Manifest-Only, Non-Destructive)
 * Removes y.osei from the 197-user target set to yield exactly 196 cleanup users.
 */

import fs from 'fs';
import { prisma } from '../src/lib/prisma';

async function generateFinalManifest196() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.16 Final 196-User Manifest Generation');
  console.log('=====================================================');

  const corrPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_corrected.json';
  const corr = JSON.parse(fs.readFileSync(corrPath, 'utf-8'));

  const yOseiUuid = '01a1c189-8ebc-7730-8b33-6ec70b70174f';

  // Filter out y.osei from users array
  const finalUsers = corr.users.filter((u: any) => u.id !== yOseiUuid);

  console.log(`\n--- 1. User Target Count Correction ---` );
  console.log(`  Previous Corrected Manifest Users: ${corr.users.length}`);
  console.log(`  Removed y.osei@zemifix.local (${yOseiUuid}): ${corr.users.length - finalUsers.length}`);
  console.log(`  New Final Cleanup Target Users Count: ${finalUsers.length}`);

  // Verify against DB existence for all 196 user UUIDs
  const userIds = finalUsers.map((u: any) => u.id);
  const dbUserCount = await prisma.user.count({ where: { id: { in: userIds } } });
  console.log(`  Database Existence Check for 196 Users: ${dbUserCount} / 196`);

  // Verify y.osei is NOT in finalUsers
  const yOseiFound = finalUsers.some((u: any) => u.id === yOseiUuid);
  console.log(`  y.osei is absent from cleanup manifest: ${!yOseiFound ? 'PASS' : 'FAIL'}`);

  // Verify 16 wrongbranch accounts are NOT in finalUsers
  const wrongBranchUsers = await prisma.user.findMany({ where: { email: { contains: 'wrongbranch' } }, select: { id: true } });
  const wrongBranchIds = new Set(wrongBranchUsers.map((u) => u.id));
  const wrongBranchInManifest = finalUsers.some((u: any) => wrongBranchIds.has(u.id));
  console.log(`  16 wrongbranch accounts are absent from cleanup manifest: ${!wrongBranchInManifest ? 'PASS' : 'FAIL'}`);

  // Verify primary admin is NOT in finalUsers
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@zemifix.local' }, select: { id: true } });
  const adminInManifest = finalUsers.some((u: any) => u.id === adminUser?.id);
  console.log(`  Primary administrator is absent from cleanup manifest: ${!adminInManifest ? 'PASS' : 'FAIL'}`);

  // Duplicate ID check across all 291 records
  const allFinalIds = [
    ...userIds,
    ...corr.customers.map((c: any) => c.id),
    ...corr.sites.map((s: any) => s.id),
    ...corr.branches.map((b: any) => b.id),
    ...corr.assets.map((a: any) => a.id),
    ...corr.workOrders.map((w: any) => w.id),
  ];
  const uniqueIds = new Set(allFinalIds);
  console.log(`  Total Manifest Records: ${allFinalIds.length} (Expected 291)`);
  console.log(`  Duplicate ID Check across all 291 records: ${uniqueIds.size === allFinalIds.length ? 'PASS (Zero duplicates)' : 'FAIL'}`);

  // Save new final manifest
  const finalManifest = {
    manifestVersion: '1.2-final',
    generationTimestamp: new Date().toISOString(),
    databaseIdentifier: 'zemifix_dev',
    recordCounts: {
      users: finalUsers.length,
      customers: corr.customers.length,
      sites: corr.sites.length,
      branches: corr.branches.length,
      assets: corr.assets.length,
      workOrders: corr.workOrders.length,
    },
    users: finalUsers,
    customers: corr.customers,
    sites: corr.sites,
    branches: corr.branches,
    assets: corr.assets,
    workOrders: corr.workOrders,
  };

  const finalPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_final_196.json';
  fs.writeFileSync(finalPath, JSON.stringify(finalManifest, null, 2));
  console.log(`\n  Saved Final Manifest to: ${finalPath}`);
}

generateFinalManifest196();
