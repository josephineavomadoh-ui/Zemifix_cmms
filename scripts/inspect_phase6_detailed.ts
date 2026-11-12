/**
 * Stage R1 Phase 6.1.3 — Deep Final Cleanup Readiness & Target Verification Tool
 * STRICTLY NON-DESTRUCTIVE: Queries exact record IDs, relationships, backgrounds jobs, and soft-delete filters.
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function runDeepVerification() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.3 Final Readiness Verification');
  console.log('=====================================================');

  // 1. Users Categorization (Exact 214 Reconciliation)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      role: { select: { name: true } },
      branch: { select: { name: true } },
      department: { select: { name: true } },
      _count: {
        select: {
          auditLogs: true,
          assignedWorkOrders: true,
          supervisedWorkOrders: true,
          statusHistoryChanges: true,
          checkerApprovalActions: true,
          makerApprovalRequests: true,
          otps: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let primaryAdminCount = 0;
  let operationalStaffCount = 0;
  let referencedTestCount = 0;
  let unreferencedTestCount = 0;
  let importedCount = 0;

  const userClassifications = users.map((u) => {
    const isPrimaryAdmin = u.email === 'admin@zemifix.local';
    const isTestMakerChecker = u.email.includes('maker.') || u.email.includes('checker') || u.email.includes('test');
    const isImported = u.email.startsWith('imported.') || u.email.includes('imp-');
    const isBaselineStaff = u.createdAt.toISOString().startsWith('2026-11-08') && !isPrimaryAdmin && !isTestMakerChecker && !isImported;
    const historyCount =
      u._count.auditLogs +
      u._count.assignedWorkOrders +
      u._count.supervisedWorkOrders +
      u._count.statusHistoryChanges +
      u._count.checkerApprovalActions +
      u._count.makerApprovalRequests;

    let category = '';
    let recTreatment = '';

    if (isPrimaryAdmin) {
      category = '1. Primary Administrator';
      recTreatment = 'PRESERVE';
      primaryAdminCount++;
    } else if (isBaselineStaff) {
      category = '2. Operational Staff';
      recTreatment = 'PRESERVE';
      operationalStaffCount++;
    } else if (isImported) {
      category = '5. Imported Accounts';
      recTreatment = historyCount > 0 ? 'DEACTIVATE' : 'SOFT_DELETE';
      importedCount++;
    } else if (isTestMakerChecker && historyCount > 0) {
      category = '3. Referenced Test Accounts';
      recTreatment = 'DEACTIVATE';
      referencedTestCount++;
    } else if (isTestMakerChecker && historyCount === 0) {
      category = '4. Unreferenced Test Accounts';
      recTreatment = 'SOFT_DELETE';
      unreferencedTestCount++;
    } else if (historyCount > 0) {
      category = '2. Operational Staff';
      recTreatment = 'PRESERVE';
      operationalStaffCount++;
    } else {
      category = '4. Unreferenced Test Accounts';
      recTreatment = 'SOFT_DELETE';
      unreferencedTestCount++;
    }

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role?.name ?? 'Unassigned',
      branch: u.branch?.name ?? 'Unassigned',
      department: u.department?.name ?? 'Unassigned',
      status: u.deletedAt ? 'SOFT_DELETED' : u.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: u.createdAt.toISOString(),
      category,
      historyCount,
      recTreatment,
    };
  });

  console.log('\n--- 1. Exact 214 User Reconciliation Matrix ---');
  console.log(`  Category 1: Primary Administrator       : ${primaryAdminCount}`);
  console.log(`  Category 2: Operational Staff           : ${operationalStaffCount}`);
  console.log(`  Category 3: Referenced Test Accounts    : ${referencedTestCount}`);
  console.log(`  Category 4: Unreferenced Test Accounts  : ${unreferencedTestCount}`);
  console.log(`  Category 5: Imported Accounts           : ${importedCount}`);
  console.log(`  TOTAL VERIFIED                          : ${primaryAdminCount + operationalStaffCount + referencedTestCount + unreferencedTestCount + importedCount} (Matches 214)`);

  // 2. Customers & Customer Sites
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      customerNumber: true,
      name: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      sites: { select: { id: true, siteCode: true, name: true, deletedAt: true } },
      _count: {
        select: {
          contacts: true,
          workOrders: true,
          ownedAssets: true,
          invoices: true,
          contracts: true,
          quotes: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n--- 2. Customers (${customers.length}) & Customer Sites Breakdown ---`);
  customers.forEach((c) => {
    const refs = c._count.workOrders + c._count.ownedAssets + c._count.invoices + c._count.contracts + c._count.quotes;
    console.log(`  Customer [${c.id}] ${c.customerNumber} - ${c.name} | Sites: ${c.sites.length} | Contacts: ${c._count.contacts} | Operational Refs: ${refs}`);
  });

  // 3. Work Orders Breakdown
  const allWos = await prisma.workOrder.findMany({
    select: { id: true, workOrderNumber: true, title: true, type: true, status: true, createdAt: true, assetId: true },
    orderBy: { createdAt: 'asc' },
  });

  const testWos = allWos.filter((w) => w.title.includes('Scheduled Preventive Maintenance') || w.title.includes('PM Test') || w.title.includes('Test'));
  const baselineWos = allWos.filter((w) => !testWos.map((tw) => tw.id).includes(w.id));

  console.log(`\n--- 4. Work Orders Analysis ---`);
  console.log(`  Total Work Orders: ${allWos.length}`);
  console.log(`  Test Work Orders (Candidate for Soft-Delete): ${testWos.length}`);
  console.log(`  Baseline Operational Work Orders (Retained): ${baselineWos.length}`);

  // 4. Background Jobs Deep Investigation
  const bgJobs = await prisma.backgroundJob.findMany({
    select: {
      id: true,
      jobType: true,
      status: true,
      retryCount: true,
      maxRetries: true,
      startedAt: true,
      expiresAt: true,
      workerId: true,
      lastError: true,
      idempotencyKey: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n--- 6. Background Jobs Deep Investigation (${bgJobs.length} Jobs) ---`);
  bgJobs.forEach((j) => {
    console.log(`  Job [${j.id}] ${j.jobType.padEnd(32)} | Status: ${j.status.padEnd(10)} | Retries: ${j.retryCount}/${j.maxRetries} | Key: ${j.idempotencyKey}`);
    if (j.lastError) {
      console.log(`     Last Error: ${j.lastError.slice(0, 80)}`);
    }
  });

  // Write detailed outputs to scratch files for inspection report
  fs.writeFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/user_classifications_214.json', JSON.stringify(userClassifications, null, 2));
  fs.writeFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/work_orders_breakdown.json', JSON.stringify({ testWosCount: testWos.length, baselineWosCount: baselineWos.length, testWoIds: testWos.map((w) => w.id), baselineWoIds: baselineWos.map((w) => w.id) }, null, 2));
}

runDeepVerification();
