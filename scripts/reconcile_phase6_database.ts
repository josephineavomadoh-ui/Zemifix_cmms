/**
 * Stage R1 Phase 6.1.2 — Final Cleanup Reconciliation Tool
 * NON-DESTRUCTIVE: Queries exact details for all 214 users, 31 customers, 41 sites, 10 branches, 5 departments, 22 parts, 24 stores, 54 import batches, 14 background jobs, 36 workers.
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function runReconciliation() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Phase 6.1.2 Final Reconciliation');
  console.log('=====================================================');

  // 1. Reconcile Users (214 Users)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
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

  const userReconciliation = users.map((u) => {
    const isCoreAdmin = u.email === 'admin@zemifix.local';
    const isTestMakerChecker = u.email.includes('maker') || u.email.includes('checker') || u.email.includes('test');
    const isImported = u.email.includes('import') || u.email.includes('sample');
    const hasHistoryRefs =
      u._count.auditLogs > 0 ||
      u._count.assignedWorkOrders > 0 ||
      u._count.supervisedWorkOrders > 0 ||
      u._count.statusHistoryChanges > 0 ||
      u._count.checkerApprovalActions > 0 ||
      u._count.makerApprovalRequests > 0;

    let recTreatment = 'Preserve Active';
    if (isCoreAdmin) {
      recTreatment = 'Preserve Active (Core Admin)';
    } else if (hasHistoryRefs) {
      recTreatment = 'Deactivate (isActive: false) — Referenced in History';
    } else if (isTestMakerChecker || isImported) {
      recTreatment = 'Soft-Delete (deletedAt: now)';
    }

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role?.name ?? 'Unassigned',
      branch: u.branch?.name ?? 'Unassigned',
      department: u.department?.name ?? 'Unassigned',
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      historyRefsCount: u._count.auditLogs + u._count.assignedWorkOrders + u._count.supervisedWorkOrders + u._count.statusHistoryChanges + u._count.checkerApprovalActions + u._count.makerApprovalRequests,
      isTestMakerChecker,
      recTreatment,
    };
  });

  console.log(`\n--- 1. Users Reconciled (${userReconciliation.length} Total) ---`);
  console.log(`  Core Admin Account: 1 (admin@zemifix.local)`);
  console.log(`  Users with Historical References (Audit/WO/Approvals): ${userReconciliation.filter((u) => u.historyRefsCount > 0).length}`);
  console.log(`  Unreferenced Test/Imported Accounts: ${userReconciliation.filter((u) => u.historyRefsCount === 0 && !u.email.includes('admin@zemifix.local')).length}`);

  // 2. Reconcile Customers (31) & Sites (41)
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      customerNumber: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          sites: true,
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

  const customerReconciliation = customers.map((c) => {
    const hasRefs = c._count.workOrders > 0 || c._count.ownedAssets > 0 || c._count.invoices > 0 || c._count.contracts > 0 || c._count.quotes > 0;
    return {
      id: c.id,
      customerNumber: c.customerNumber,
      name: c.name,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      sitesCount: c._count.sites,
      contactsCount: c._count.contacts,
      operationalRefs: c._count.workOrders + c._count.ownedAssets + c._count.invoices + c._count.contracts + c._count.quotes,
      recTreatment: hasRefs ? 'Soft-Delete / Retain Historical' : 'Eligible for Soft-Delete',
    };
  });

  console.log(`\n--- 2. Customers Reconciled (${customerReconciliation.length} Total) ---`);
  console.log(`  Customers Referenced in Work Orders/Assets: ${customerReconciliation.filter((c) => c.operationalRefs > 0).length}`);
  console.log(`  Unreferenced Demo Customers: ${customerReconciliation.filter((c) => c.operationalRefs === 0).length}`);

  // 3. Reconcile Branches (10) & Departments (5)
  const branches = await prisma.branch.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
      parentId: true,
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

  const depts = await prisma.department.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: {
        select: {
          users: true,
          workOrders: true,
        },
      },
    },
  });

  console.log(`\n--- 3. Branches (${branches.length}) & Departments (${depts.length}) Reconciled ---`);
  branches.forEach((b) => {
    console.log(`  Branch [${b.id}] ${b.code} - ${b.name} (${b.type}) | Users: ${b._count.users}, Physical Assets: ${b._count.physicalAssets}, WOs: ${b._count.workOrders}, Stores: ${b._count.stores}`);
  });

  depts.forEach((d) => {
    console.log(`  Department [${d.id}] ${d.code} - ${d.name} | Users: ${d._count.users}, WOs: ${d._count.workOrders}`);
  });

  // 4. Reconcile Inventory (22 Parts, 24 Stores, 3 Stock, 55 Stock Transactions)
  const parts = await prisma.part.findMany({
    select: {
      id: true,
      partNumber: true,
      name: true,
      _count: { select: { stocks: true, stockTransactions: true, workOrderParts: true } },
    },
  });

  const stores = await prisma.store.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      _count: { select: { stocks: true, stockTransactions: true } },
    },
  });

  console.log(`\n--- 4. Inventory Reconciled (${parts.length} Parts, ${stores.length} Stores) ---`);
  console.log(`  Parts with Immutable Stock Transactions: ${parts.filter((p) => p._count.stockTransactions > 0).length}`);
  console.log(`  Unused Test Parts: ${parts.filter((p) => p._count.stockTransactions === 0).length}`);
  console.log(`  Stores with Active Stock / Transactions: ${stores.filter((s) => s._count.stockTransactions > 0).length}`);

  // 5. Reconcile Imports (54 Batches)
  const importBatches = await prisma.importBatch.findMany({
    select: { id: true, fileName: true, entityType: true, status: true, totalRows: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n--- 5. Import Batches Reconciled (${importBatches.length} Total) ---`);
  console.log(`  Completed Imports: ${importBatches.filter((b) => b.status === 'COMPLETED').length}`);
  console.log(`  Failed / Retried / Cancelled: ${importBatches.filter((b) => b.status !== 'COMPLETED').length}`);

  // 6. Reconcile Background Jobs (14) & Workers (36)
  const backgroundJobs = await prisma.backgroundJob.findMany({
    select: { id: true, jobType: true, status: true, retryCount: true, createdAt: true, completedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const workers = await prisma.backgroundWorker.findMany({
    select: { id: true, workerId: true, status: true, lastHeartbeatAt: true },
    orderBy: { lastHeartbeatAt: 'desc' },
  });

  console.log(`\n--- 6. Background Jobs (${backgroundJobs.length}) & Workers (${workers.length}) Reconciled ---`);
  backgroundJobs.forEach((j) => {
    console.log(`  Job [${j.id}] ${j.jobType} | Status: ${j.status} | Retries: ${j.retryCount} | Created: ${j.createdAt.toISOString()}`);
  });

  // Write out user and customer reconciliation arrays to scratch files
  fs.mkdirSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch', { recursive: true });
  fs.writeFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/user_reconciliation.json', JSON.stringify(userReconciliation, null, 2));
  fs.writeFileSync('C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/customer_reconciliation.json', JSON.stringify(customerReconciliation, null, 2));
}

runReconciliation();
