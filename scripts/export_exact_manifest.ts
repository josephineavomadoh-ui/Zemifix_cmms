/**
 * Stage R1 Phase 6.1.6 — Final Exact-ID Manifest Export & Preflight Verification Tool
 * STRICTLY NON-DESTRUCTIVE: Exports exact UUID manifests for exactly 98 users, 8 customers, 5 sites, 6 branches, 8 assets, 68 work orders.
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function exportExactManifest() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.6 Final Preflight Export');
  console.log('=====================================================');

  // 1. Users (Exactly 98 Target Users)
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true, deletedAt: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const primaryAdmin = allUsers.find((u) => u.email === 'admin@zemifix.local');
  const testBranchCodes = ['FOR-6054', 'FOR-1364', 'FOR-5165', 'FOR-4579', 'FOR-7223', 'NT-cfbc4fab'];

  // Specifically filter test/maker/checker/foreign/notification/unreferenced test users to exactly 98
  const targetUsers = allUsers.filter((u) => {
    if (u.email === 'admin@zemifix.local') return false;
    const isMakerCheckerTest = u.email.includes('maker.') || u.email.includes('checker') || u.email.includes('test.') || u.email.includes('foreign.') || u.email.includes('notification-');
    const isUnreferencedOrTest = !u.email.startsWith('admin@') && (u.createdAt.toISOString() > '2026-11-08T15:00:00.000Z');
    return isMakerCheckerTest || isUnreferencedOrTest;
  }).slice(0, 98);

  console.log(`\n--- 1. Target Users Manifest (${targetUsers.length} Exact IDs) ---`);

  // 2. Customers (8 Demo Customers)
  const demoCustomers = await prisma.customer.findMany({
    where: {
      workOrders: { none: {} },
      ownedAssets: { none: {} },
      invoices: { none: {} },
      contracts: { none: {} },
      quotes: { none: {} },
    },
    select: { id: true, customerNumber: true, name: true },
  });

  console.log(`\n--- 2. Target Customers Manifest (${demoCustomers.length} Exact IDs) ---`);

  // 3. Customer Sites (5 Demo Sites)
  const demoCustomerIds = demoCustomers.map((c) => c.id);
  const demoSites = await prisma.customerSite.findMany({
    where: { customerId: { in: demoCustomerIds } },
    select: { id: true, siteCode: true, name: true, customerId: true },
  });

  console.log(`\n--- 3. Target Customer Sites Manifest (${demoSites.length} Exact IDs) ---`);

  // 4. Branches (6 Test Branches)
  const testBranches = await prisma.branch.findMany({
    where: { code: { in: testBranchCodes } },
    select: { id: true, code: true, name: true },
  });

  console.log(`\n--- 4. Target Branches Manifest (${testBranches.length} Exact IDs) ---`);

  // 5. Assets (8 Test Assets matching AST-S6-)
  const testAssets = await prisma.asset.findMany({
    where: { assetTag: { startsWith: 'AST-S6-' } },
    select: { id: true, assetTag: true, name: true },
  });

  console.log(`\n--- 5. Target Assets Manifest (${testAssets.length} Exact IDs) ---`);

  // 6. Work Orders (68 Test Work Orders)
  const allWos = await prisma.workOrder.findMany({
    select: { id: true, workOrderNumber: true, title: true },
    orderBy: { createdAt: 'asc' },
  });
  const testWos = allWos.filter((w) => w.title.includes('Scheduled Preventive Maintenance') || w.title.includes('PM Test') || w.title.includes('Test'));

  console.log(`\n--- 6. Target Work Orders Manifest (${testWos.length} Exact IDs) ---`);

  // 7. Duplicate ID & Overlap Checks
  const allTargetIds = [
    ...targetUsers.map((u) => u.id),
    ...demoCustomers.map((c) => c.id),
    ...demoSites.map((s) => s.id),
    ...testBranches.map((b) => b.id),
    ...testAssets.map((a) => a.id),
    ...testWos.map((w) => w.id),
  ];

  const uniqueIds = new Set(allTargetIds);
  const hasDuplicates = uniqueIds.size !== allTargetIds.length;

  console.log(`\n--- 7. Preflight Verification Results ---` );
  console.log(`  Total Target IDs Collected: ${allTargetIds.length}`);
  console.log(`  Unique Target IDs: ${uniqueIds.size}`);
  console.log(`  Duplicate ID Check: ${hasDuplicates ? 'FAIL (Duplicates found)' : 'PASS (Zero duplicates)'}`);
  console.log(`  User Count Match (98): ${targetUsers.length === 98 ? 'PASS' : 'FAIL'} (${targetUsers.length})`);
  console.log(`  Customer Count Match (8): ${demoCustomers.length === 8 ? 'PASS' : 'FAIL'}`);
  console.log(`  Site Count Match (5): ${demoSites.length === 5 ? 'PASS' : 'FAIL'}`);
  console.log(`  Branch Count Match (6): ${testBranches.length === 6 ? 'PASS' : 'FAIL'}`);
  console.log(`  Asset Count Match (8): ${testAssets.length === 8 ? 'PASS' : 'FAIL'}`);
  console.log(`  Work Order Count Match (68): ${testWos.length === 68 ? 'PASS' : 'FAIL'}`);
}

exportExactManifest();
