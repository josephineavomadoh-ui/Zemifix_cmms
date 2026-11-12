/**
 * Stage R1 Phase 6.1.17 — Final Cleanup Readiness Preflight Tool (Non-Destructive)
 * 1. Creates fresh custom backup of zemifix_dev and verifies TOC.
 * 2. Loads final_preflight_manifest_final_196.json and validates exact existence and counts.
 */

import { execSync } from 'child_process';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function runPreflightReadiness() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.17 Final Cleanup Readiness Preflight');
  console.log('=====================================================');

  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${backupDir}/zemifix_dev_pre_cleanup_preflight_${timestamp}.dump`;

  // Task 1: Fresh Database Backup & Verification
  console.log('\n--- TASK 1: Fresh Database Backup & Verification ---');
  try {
    execSync(`pg_dump -h localhost -U postgres -d zemifix_dev -F c -f ${backupFile}`, { env });
    const stats = fs.statSync(backupFile);
    console.log(`  [PASS] Backup created successfully: ${backupFile}`);
    console.log(`  [PASS] Backup file size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

    const listOutput = execSync(`pg_restore --list ${backupFile}`, { env }).toString();
    const tocEntries = listOutput.split('\n').filter((l) => l.trim() && !l.startsWith(';'));
    console.log(`  [PASS] pg_restore --list verified: ${tocEntries.length} TOC entries loaded.`);
  } catch (err: any) {
    console.error(`  [FAIL] Backup creation failed: ${err.message}`);
    process.exit(1);
  }

  // Task 3: Final Manifest Dry-Run Validation
  console.log('\n--- TASK 3: Final Manifest Dry-Run Validation ---');
  const manifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_final_196.json';
  if (!fs.existsSync(manifestPath)) {
    console.error(`  [FAIL] Final manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const userIds = manifest.users.map((u: any) => u.id);
  const customerIds = manifest.customers.map((c: any) => c.id);
  const siteIds = manifest.sites.map((s: any) => s.id);
  const branchIds = manifest.branches.map((b: any) => b.id);
  const assetIds = manifest.assets.map((a: any) => a.id);
  const woIds = manifest.workOrders.map((w: any) => w.id);

  console.log(`  Manifest Target Counts:`);
  console.log(`    Users:       ${userIds.length} (Expected 196)`);
  console.log(`    Customers:   ${customerIds.length} (Expected 8)`);
  console.log(`    Sites:       ${siteIds.length} (Expected 5)`);
  console.log(`    Branches:    ${branchIds.length} (Expected 6)`);
  console.log(`    Assets:      ${assetIds.length} (Expected 8)`);
  console.log(`    Work Orders: ${woIds.length} (Expected 68)`);
  console.log(`    Total:       ${userIds.length + customerIds.length + siteIds.length + branchIds.length + assetIds.length + woIds.length} (Expected 291)`);

  const [dbUsers, dbCustomers, dbSites, dbBranches, dbAssets, dbWos] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds } } }),
    prisma.customer.count({ where: { id: { in: customerIds } } }),
    prisma.customerSite.count({ where: { id: { in: siteIds } } }),
    prisma.branch.count({ where: { id: { in: branchIds } } }),
    prisma.asset.count({ where: { id: { in: assetIds } } }),
    prisma.workOrder.count({ where: { id: { in: woIds } } }),
  ]);

  console.log(`\n  Database Existence Check against Manifest:`);
  console.log(`    Users found in DB:       ${dbUsers} / ${userIds.length}`);
  console.log(`    Customers found in DB:   ${dbCustomers} / ${customerIds.length}`);
  console.log(`    Sites found in DB:       ${dbSites} / ${siteIds.length}`);
  console.log(`    Branches found in DB:    ${dbBranches} / ${branchIds.length}`);
  console.log(`    Assets found in DB:      ${dbAssets} / ${assetIds.length}`);
  console.log(`    Work Orders found in DB: ${dbWos} / ${woIds.length}`);

  const allValid =
    dbUsers === 196 &&
    dbCustomers === 8 &&
    dbSites === 5 &&
    dbBranches === 6 &&
    dbAssets === 8 &&
    dbWos === 68;

  console.log(`\n  Preflight Readiness Status: ${allValid ? 'PASS (READY FOR AUTHORIZATION)' : 'BLOCKED'}`);
}

runPreflightReadiness();
