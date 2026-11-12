/**
 * Stage R1 Phase 6.1.4 — Cleanup Target Manifest Generator & Verification Tool
 * STRICTLY NON-DESTRUCTIVE: Queries exact database UUIDs, branch dependencies, background job states, and code paths.
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function generateManifest() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.4 Cleanup Target Manifest Verification');
  console.log('=====================================================');

  // 1. Users Manifest (81 Referenced Test Users + 17 Unreferenced Test Users = 98 Total Target Users)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      role: { select: { name: true } },
      branch: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          auditLogs: true,
          assignedWorkOrders: true,
          supervisedWorkOrders: true,
          statusHistoryChanges: true,
          checkerApprovalActions: true,
          makerApprovalRequests: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const refTestUsers = users.filter((u) => {
    const isTest = u.email.includes('maker.') || u.email.includes('checker') || u.email.includes('test');
    const isPrimaryAdmin = u.email === 'admin@zemifix.local';
    const historyCount = u._count.auditLogs + u._count.assignedWorkOrders + u._count.supervisedWorkOrders + u._count.statusHistoryChanges + u._count.checkerApprovalActions + u._count.makerApprovalRequests;
    return isTest && !isPrimaryAdmin && historyCount > 0;
  });

  const unrefTestUsers = users.filter((u) => {
    const isTestOrImported = u.email.includes('maker.') || u.email.includes('checker') || u.email.includes('test') || u.email.includes('imported');
    const isPrimaryAdmin = u.email === 'admin@zemifix.local';
    const historyCount = u._count.auditLogs + u._count.assignedWorkOrders + u._count.supervisedWorkOrders + u._count.statusHistoryChanges + u._count.checkerApprovalActions + u._count.makerApprovalRequests;
    return (isTestOrImported || historyCount === 0) && !isPrimaryAdmin && !refTestUsers.map((rt) => rt.id).includes(u.id) && u.createdAt.toISOString() > '2026-11-08T12:00:00.000Z';
  });

  console.log(`\n--- 1. Target Users Verification ---`);
  console.log(`  Referenced Test Users Target Count: ${refTestUsers.length}`);
  console.log(`  Unreferenced Test Users Target Count: ${unrefTestUsers.length}`);
  console.log(`  Total User Target Count: ${refTestUsers.length + unrefTestUsers.length}`);

  // 2. Customers (8 Demo) & Sites (8 Demo) Manifest
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      customerNumber: true,
      name: true,
      isActive: true,
      deletedAt: true,
      sites: { select: { id: true, siteCode: true, name: true, deletedAt: true } },
      _count: {
        select: {
          workOrders: true,
          ownedAssets: true,
          invoices: true,
          contracts: true,
          quotes: true,
        },
      },
    },
  });

  const demoCustomers = customers.filter((c) => (c._count.workOrders + c._count.ownedAssets + c._count.invoices + c._count.contracts + c._count.quotes) === 0);
  const demoSites = demoCustomers.flatMap((c) => c.sites.map((s) => ({ siteId: s.id, siteCode: s.siteCode, siteName: s.name, parentCustomerId: c.id, parentCustomerName: c.name })));

  console.log(`\n--- 2. Target Customers & Sites Verification ---`);
  console.log(`  Demo Customers Target Count: ${demoCustomers.length}`);
  console.log(`  Demo Customer Sites Target Count: ${demoSites.length}`);

  // 3. Branches (6 Proposed Test Branches) Verification
  const testBranchCodes = ['FOR-6054', 'FOR-1364', 'FOR-5165', 'FOR-4579', 'FOR-7223', 'NT-cfbc4fab'];
  const branches = await prisma.branch.findMany({
    where: { code: { in: testBranchCodes } },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      parentId: true,
      users: { select: { id: true, email: true } },
      _count: {
        select: {
          users: true,
          physicalAssets: true,
          workOrders: true,
          stores: true,
        },
      },
    },
  });

  console.log(`\n--- 3. Target Test Branches Verification (${branches.length} Branches Found) ---`);
  branches.forEach((b) => {
    console.log(`  Branch [${b.id}] ${b.code} - ${b.name} | Users: ${b._count.users} (${b.users.map((u) => u.email).join(', ')}) | Assets: ${b._count.physicalAssets} | WOs: ${b._count.workOrders} | Stores: ${b._count.stores}`);
  });

  // 4. Work Orders (68) & Assets (2) Manifest
  const allWos = await prisma.workOrder.findMany({
    select: { id: true, workOrderNumber: true, title: true, status: true, createdAt: true, assetId: true },
    orderBy: { createdAt: 'asc' },
  });

  const testWos = allWos.filter((w) => w.title.includes('Scheduled Preventive Maintenance') || w.title.includes('PM Test') || w.title.includes('Test'));
  const testAssetTags = ['AST-S6-1794415881908', 'AST-S6-1794413953861', 'AST-S6-1794413464275', 'AST-S6-1794412443139', 'AST-S6-1794397183588'];
  const testAssets = await prisma.asset.findMany({
    where: { assetTag: { in: testAssetTags } },
    select: { id: true, assetTag: true, name: true, createdAt: true },
  });

  console.log(`\n--- 4. Target Work Orders & Assets Verification ---`);
  console.log(`  Test Work Orders Target Count: ${testWos.length}`);
  console.log(`  Test Assets Target Count: ${testAssets.length}`);

  // 5. Parts (2 Unused Test Parts)
  const unusedParts = await prisma.part.findMany({
    where: {
      stockTransactions: { none: {} },
      stocks: { none: {} },
      workOrderParts: { none: {} },
      name: { contains: 'Test' },
    },
    select: { id: true, partNumber: true, name: true },
  });

  console.log(`\n--- 5. Target Unused Parts Verification (${unusedParts.length} Parts Found) ---`);
  unusedParts.forEach((p) => console.log(`  Part [${p.id}] ${p.partNumber} - ${p.name}`));

  // 6. Background Jobs Safety Investigation
  const runningJobs = await prisma.backgroundJob.findMany({
    where: { status: 'RUNNING' },
    select: { id: true, jobType: true, workerId: true, expiresAt: true, idempotencyKey: true },
  });
  const retryingJobs = await prisma.backgroundJob.findMany({
    where: { status: 'RETRYING' },
    select: { id: true, jobType: true, retryCount: true, expiresAt: true, idempotencyKey: true },
  });

  console.log(`\n--- 6. Background Jobs Safety Investigation ---`);
  console.log(`  Running Jobs Count: ${runningJobs.length}`);
  runningJobs.forEach((j) => console.log(`    Job [${j.id}] ${j.jobType} | Lease Expired: ${j.expiresAt ? new Date(j.expiresAt) < new Date() : false} | Key: ${j.idempotencyKey}`));
  console.log(`  Retrying Jobs Count: ${retryingJobs.length}`);
  retryingJobs.forEach((j) => console.log(`    Job [${j.id}] ${j.jobType} | Retries: ${j.retryCount} | Key: ${j.idempotencyKey}`));

  // Dump detailed manifest JSON to scratch file for complete ID listing
  const manifestData = {
    referencedTestUsers: refTestUsers.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role?.name, branch: u.branch?.name, historyCount: u._count.auditLogs + u._count.assignedWorkOrders })),
    unreferencedTestUsers: unrefTestUsers.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role?.name })),
    demoCustomers: demoCustomers.map((c) => ({ id: c.id, customerNumber: c.customerNumber, name: c.name })),
    demoSites,
    testBranches: branches.map((b) => ({ id: b.id, code: b.code, name: b.name, userIds: b.users.map((u) => u.id) })),
    testWorkOrders: testWos.map((w) => ({ id: w.id, workOrderNumber: w.workOrderNumber, title: w.title, createdAt: w.createdAt })),
    testAssets: testAssets.map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name })),
    unusedParts: unusedParts.map((p) => ({ id: p.id, partNumber: p.partNumber, name: p.name })),
  };

  fs.mkdirSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch', { recursive: true });
  fs.writeFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/cleanup_manifest.json', JSON.stringify(manifestData, null, 2));
}

generateManifest();
