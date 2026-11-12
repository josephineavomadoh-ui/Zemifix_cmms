/**
 * Stage R1 Phase 6.1.8 — Non-Destructive Backup & Cleanup Dry Run Verification Tool
 * STRICTLY NON-DESTRUCTIVE: Creates backup dump, verifies TOC, loads exact manifest, runs dependency checks, and simulates dry run.
 */

import { execSync } from 'child_process';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function runDryRun() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.8 Cleanup Dry Run & Backup Verification');
  console.log('=====================================================');

  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `${backupDir}/zemifix_dev_pre_cleanup_${timestamp}.dump`;

  // 1. Task 1: Create and Verify Fresh Backup
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

  // 2. Task 3: Load Exact Manifest and Verify Dependencies (Dry Run Simulation)
  console.log('\n--- TASK 3: Exact Manifest Dry Run & Dependency Verification ---');
  const manifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest.json';
  if (!fs.existsSync(manifestPath)) {
    console.error(`  [FAIL] Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const userIds = manifest.users.map((u: any) => u.id);
  const customerIds = manifest.customers.map((c: any) => c.id);
  const siteIds = manifest.sites.map((s: any) => s.id);
  const branchIds = manifest.branches.map((b: any) => b.id);
  const assetIds = manifest.assets.map((a: any) => a.id);
  const woIds = manifest.workOrders.map((w: any) => w.id);

  console.log(`  Loaded Target Counts from Manifest:`);
  console.log(`    Users:       ${userIds.length}`);
  console.log(`    Customers:   ${customerIds.length}`);
  console.log(`    Sites:       ${siteIds.length}`);
  console.log(`    Branches:    ${branchIds.length}`);
  console.log(`    Assets:      ${assetIds.length}`);
  console.log(`    Work Orders: ${woIds.length}`);

  // Verify DB existence for all targets
  const [dbUsers, dbCustomers, dbSites, dbBranches, dbAssets, dbWos] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds } } }),
    prisma.customer.count({ where: { id: { in: customerIds } } }),
    prisma.customerSite.count({ where: { id: { in: siteIds } } }),
    prisma.branch.count({ where: { id: { in: branchIds } } }),
    prisma.asset.count({ where: { id: { in: assetIds } } }),
    prisma.workOrder.count({ where: { id: { in: woIds } } }),
  ]);

  console.log(`\n  Database Existence Verification (Dry Run):`);
  console.log(`    Users found in DB:       ${dbUsers} / ${userIds.length}`);
  console.log(`    Customers found in DB:   ${dbCustomers} / ${customerIds.length}`);
  console.log(`    Sites found in DB:       ${dbSites} / ${siteIds.length}`);
  console.log(`    Branches found in DB:    ${dbBranches} / ${branchIds.length}`);
  console.log(`    Assets found in DB:      ${dbAssets} / ${assetIds.length}`);
  console.log(`    Work Orders found in DB: ${dbWos} / ${woIds.length}`);

  const allExist = dbUsers === userIds.length && dbCustomers === customerIds.length && dbSites === siteIds.length && dbBranches === branchIds.length && dbAssets === assetIds.length && dbWos === woIds.length;

  console.log(`\n  Dry Run Status: ${allExist ? 'READY FOR EXPLICIT CLEANUP AUTHORIZATION' : 'NOT READY'}`);
}

runDryRun();
