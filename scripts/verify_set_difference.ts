/**
 * Stage R1 Phase 6.1.13 — Final Set-Difference Verification Tool (Inspection Only)
 */

import fs from 'fs';
import { prisma } from '../src/lib/prisma';

async function verifySetDifference() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.13 Set-Difference Verification');
  console.log('=====================================================');

  const origPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest.json';
  const corrPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_corrected.json';

  const orig = JSON.parse(fs.readFileSync(origPath, 'utf-8'));
  const corr = JSON.parse(fs.readFileSync(corrPath, 'utf-8'));

  const origIds = new Set(orig.users.map((u: any) => u.id));
  const corrIds = new Set(corr.users.map((u: any) => u.id));

  const both = orig.users.filter((u: any) => corrIds.has(u.id));
  const onlyOrig = orig.users.filter((u: any) => !corrIds.has(u.id));
  const onlyCorr = corr.users.filter((u: any) => !origIds.has(u.id));

  console.log(`\n--- 1. Set Difference Report ---`);
  console.log(`  Original Manifest User Count: ${orig.users.length}`);
  console.log(`  Corrected Manifest User Count: ${corr.users.length}`);
  console.log(`  UUIDs Present in Both: ${both.length}`);
  console.log(`  UUIDs Only in Original (Excluded from Corrected): ${onlyOrig.length}`);
  console.log(`  UUIDs Only in Corrected: ${onlyCorr.length}`);

  console.log(`\n--- 2. Details of the 16 Excluded Users ---`);
  for (const u of onlyOrig) {
    const dbUser = await prisma.user.findUnique({
      where: { id: u.id },
      select: { email: true, branch: { select: { code: true } } },
    });
    console.log(`  - UUID: ${u.id} | Email: ${dbUser?.email ?? u.identifier} | Branch: ${dbUser?.branch?.code ?? 'N/A'}`);
  }

  // 3. Final Manifest Integrity Check
  const corrAllIds = [
    ...corr.users.map((u: any) => u.id),
    ...corr.customers.map((c: any) => c.id),
    ...corr.sites.map((s: any) => s.id),
    ...corr.branches.map((b: any) => b.id),
    ...corr.assets.map((a: any) => a.id),
    ...corr.workOrders.map((w: any) => w.id),
  ];
  const uniqueCorrIds = new Set(corrAllIds);

  console.log(`\n--- 3. Corrected Manifest Integrity Summary ---`);
  console.log(`  Users:     ${corr.users.length} (Expected 197)`);
  console.log(`  Customers: ${corr.customers.length} (Expected 8)`);
  console.log(`  Sites:     ${corr.sites.length} (Expected 5)`);
  console.log(`  Branches:  ${corr.branches.length} (Expected 6)`);
  console.log(`  Assets:    ${corr.assets.length} (Expected 8)`);
  console.log(`  WOs:       ${corr.workOrders.length} (Expected 68)`);
  console.log(`  Total:     ${corrAllIds.length} (Expected 292)`);
  console.log(`  Duplicate ID Check: ${uniqueCorrIds.size === corrAllIds.length ? 'PASS (Zero duplicates)' : 'FAIL'}`);
}

verifySetDifference();
