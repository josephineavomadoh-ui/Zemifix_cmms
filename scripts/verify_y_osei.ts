/**
 * Stage R1 Phase 6.1.14 — Final y.osei Membership Verification Tool (Inspection Only)
 */

import fs from 'fs';
import { prisma } from '../src/lib/prisma';

async function verifyYOsei() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.14 y.osei Verification');
  console.log('=====================================================');

  const uuid = '01a1c189-8ebc-7730-8b33-6ec70b70174f';
  const origPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest.json';
  const corrPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_corrected.json';

  const orig = JSON.parse(fs.readFileSync(origPath, 'utf-8'));
  const corr = JSON.parse(fs.readFileSync(corrPath, 'utf-8'));

  const inOrig = orig.users.some((u: any) => u.id === uuid);
  const inCorr = corr.users.some((u: any) => u.id === uuid);

  const dbUser = await prisma.user.findUnique({
    where: { id: uuid },
    select: { email: true, branch: { select: { code: true, name: true } } },
  });

  console.log(`\n--- 1. Membership Check for UUID ${uuid} ---`);
  console.log(`  Is in Original Manifest (213 users)? ${inOrig}`);
  console.log(`  Is in Corrected Manifest (197 users)? ${inCorr}`);
  console.log(`  Exists in PostgreSQL? ${Boolean(dbUser)}`);
  console.log(`  Email: ${dbUser?.email ?? 'N/A'}`);
  console.log(`  Branch: ${dbUser?.branch?.code ?? 'N/A'} (${dbUser?.branch?.name ?? 'N/A'})`);

  // 2. Set Difference Re-evaluation
  const origIds = new Set(orig.users.map((u: any) => u.id));
  const corrIds = new Set(corr.users.map((u: any) => u.id));
  const removedIds = orig.users.filter((u: any) => !corrIds.has(u.id));

  console.log(`\n--- 2. Set Difference Re-evaluation ---`);
  console.log(`  Original Manifest Users: ${orig.users.length}`);
  console.log(`  Corrected Manifest Users: ${corr.users.length}`);
  console.log(`  Total UUIDs Removed from Original to Corrected: ${removedIds.length}`);

  console.log(`  List of Removed UUIDs (${removedIds.length}):`);
  for (const r of removedIds) {
    const u = await prisma.user.findUnique({ where: { id: r.id }, select: { email: true } });
    console.log(`    - ${r.id} (${u?.email ?? r.identifier})`);
  }

  // 3. Final Arithmetic Reconciliation
  const totalDbUsers = await prisma.user.count();
  const cleanupTargets = corr.users.length;
  const preservedNonAdmin = removedIds.length;
  const adminCount = await prisma.user.count({ where: { email: 'admin@zemifix.local' } });

  console.log(`\n--- 3. Final Arithmetic Reconciliation ---`);
  console.log(`  Cleanup Targets (Corrected Manifest): ${cleanupTargets}`);
  console.log(`  Preserved Non-Admin Accounts (Removed from Manifest): ${preservedNonAdmin}`);
  console.log(`  Preserved Administrator: ${adminCount}`);
  console.log(`  Sum: ${cleanupTargets} + ${preservedNonAdmin} + ${adminCount} = ${cleanupTargets + preservedNonAdmin + adminCount}`);
  console.log(`  Total DB Users: ${totalDbUsers}`);
  console.log(`  Reconciliation Status: ${cleanupTargets + preservedNonAdmin + adminCount === totalDbUsers ? 'EXACT MATCH' : 'MISMATCH'}`);
}

verifyYOsei();
