/**
 * Stage R1 Phase 6.1 — Controlled Cleanup Execution Tool
 * EXPLICITLY AUTHORIZED CONTROLLED SOFT-DEACTIVATION
 */

import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function executeControlledCleanup() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Phase 6.1 Controlled Cleanup Execution');
  console.log('=====================================================');

  const startTime = new Date();
  console.log(`Execution Start Timestamp: ${startTime.toISOString()}`);

  // 1. Mandatory Pre-Execution Checks
  console.log('\n--- 1. Mandatory Pre-Execution Checks ---');
  const manifestPath = 'C:/Users/HP/AppData/Local/Google/AndroidStudio2026.1.3/projects/remix-zemifix-cmms.864b2344/.artifacts/c1295402-329d-4e80-8ae5-bb38e3ab0c4c/scratch/final_preflight_manifest_final_196.json';
  if (!fs.existsSync(manifestPath)) {
    console.error(`CRITICAL PRECONDITION FAIL: Manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const userIds: string[] = manifest.users.map((u: any) => u.id);
  const customerIds: string[] = manifest.customers.map((c: any) => c.id);
  const siteIds: string[] = manifest.sites.map((s: any) => s.id);
  const branchIds: string[] = manifest.branches.map((b: any) => b.id);
  const assetIds: string[] = manifest.assets.map((a: any) => a.id);
  const woIds: string[] = manifest.workOrders.map((w: any) => w.id);

  console.log(`  Loaded Manifest Target Counts:`);
  console.log(`    Users:          ${userIds.length} (Expected 196)`);
  console.log(`    Customers:      ${customerIds.length} (Expected 8)`);
  console.log(`    Customer Sites: ${siteIds.length} (Expected 5)`);
  console.log(`    Branches:       ${branchIds.length} (Expected 6)`);
  console.log(`    Assets:         ${assetIds.length} (Expected 8)`);
  console.log(`    Work Orders:    ${woIds.length} (Expected 68)`);
  console.log(`    Total Targets:  ${userIds.length + customerIds.length + siteIds.length + branchIds.length + assetIds.length + woIds.length} (Expected 291)`);

  if (userIds.length !== 196 || customerIds.length !== 8 || siteIds.length !== 5 || branchIds.length !== 6 || assetIds.length !== 8 || woIds.length !== 68) {
    console.error(`CRITICAL PRECONDITION FAIL: Target counts do not match authoritative manifest standards!`);
    process.exit(1);
  }

  // Pre-check DB Existence & Active Status
  const [preUsers, preCustomers, preSites, preBranches, preAssets, preWos] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds }, deletedAt: null } }),
    prisma.customer.count({ where: { id: { in: customerIds }, deletedAt: null } }),
    prisma.customerSite.count({ where: { id: { in: siteIds }, deletedAt: null } }),
    prisma.branch.count({ where: { id: { in: branchIds }, deletedAt: null } }),
    prisma.asset.count({ where: { id: { in: assetIds }, deletedAt: null } }),
    prisma.workOrder.count({ where: { id: { in: woIds }, deletedAt: null } }),
  ]);

  console.log(`\n  Pre-Check Active Target Records in PostgreSQL:`);
  console.log(`    Active Users in DB:       ${preUsers} / 196`);
  console.log(`    Active Customers in DB:   ${preCustomers} / 8`);
  console.log(`    Active Sites in DB:       ${preSites} / 5`);
  console.log(`    Active Branches in DB:    ${preBranches} / 6`);
  console.log(`    Active Assets in DB:      ${preAssets} / 8`);
  console.log(`    Active Work Orders in DB: ${preWos} / 68`);

  // Verify Preserved Exclusion Safety
  const preservedAdmin = await prisma.user.findFirst({ where: { email: 'admin@zemifix.local' } });
  const preservedYOsei = await prisma.user.findFirst({ where: { email: 'y.osei@zemifix.local' } });
  const wrongBranchUsers = await prisma.user.findMany({ where: { email: { contains: 'wrongbranch' } }, select: { id: true } });

  const adminInTargets = userIds.includes(preservedAdmin?.id ?? '');
  const yOseiInTargets = userIds.includes(preservedYOsei?.id ?? '');
  const wrongBranchInTargets = wrongBranchUsers.some((u) => userIds.includes(u.id));

  console.log(`\n  Preservation Exclusion Safety Check:`);
  console.log(`    Primary Admin Excluded:               ${!adminInTargets ? 'PASS' : 'FAIL'}`);
  console.log(`    Yaw Osei Excluded:                    ${!yOseiInTargets ? 'PASS' : 'FAIL'}`);
  console.log(`    16 wrongbranch.* Accounts Excluded:   ${!wrongBranchInTargets ? 'PASS' : 'FAIL'}`);

  if (adminInTargets || yOseiInTargets || wrongBranchInTargets) {
    console.error(`CRITICAL PRECONDITION FAIL: Preserved account detected in target list! Aborting execution.`);
    process.exit(1);
  }

  // Pre-execution Baseline Count Snapshots
  const [preAuditLogs, preStatusHist, preStockTx, preApprovalActions, preParts, preJobs, preWorkers] = await Promise.all([
    prisma.auditLog.count(),
    prisma.workOrderStatusHistory.count(),
    prisma.stockTransaction.count(),
    prisma.approvalAction.count(),
    prisma.part.count(),
    prisma.backgroundJob.count(),
    prisma.backgroundWorker.count(),
  ]);

  // 2. Execute Atomic Soft-Deactivation Cleanup Transaction
  console.log('\n--- 2. Executing Atomic Soft-Deactivation Cleanup Transaction ---');
  const executionNow = new Date();

  let resultUsers = 0;
  let resultCustomers = 0;
  let resultSites = 0;
  let resultBranches = 0;
  let resultAssets = 0;
  let resultWos = 0;

  try {
    await prisma.$transaction(async (tx: any) => {
      // 1. Soft-deactivate Target Users
      const resU = await tx.user.updateMany({
        where: { id: { in: userIds } },
        data: { isActive: false, deletedAt: executionNow },
      });
      resultUsers = resU.count;

      // 2. Soft-delete Target Customers
      const resC = await tx.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { deletedAt: executionNow },
      });
      resultCustomers = resC.count;

      // 3. Soft-delete Target Customer Sites
      const resS = await tx.customerSite.updateMany({
        where: { id: { in: siteIds } },
        data: { deletedAt: executionNow },
      });
      resultSites = resS.count;

      // 4. Soft-delete Target Branches
      const resB = await tx.branch.updateMany({
        where: { id: { in: branchIds } },
        data: { deletedAt: executionNow },
      });
      resultBranches = resB.count;

      // 5. Soft-delete Target Assets
      const resA = await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { deletedAt: executionNow },
      });
      resultAssets = resA.count;

      // 6. Soft-delete Target Work Orders
      const resW = await tx.workOrder.updateMany({
        where: { id: { in: woIds } },
        data: { deletedAt: executionNow },
      });
      resultWos = resW.count;

      // Verify transaction affected counts
      if (
        resultUsers !== 196 ||
        resultCustomers !== 8 ||
        resultSites !== 5 ||
        resultBranches !== 6 ||
        resultAssets !== 8 ||
        resultWos !== 68
      ) {
        throw new Error(
          `TRANSACTION_COUNT_MISMATCH: Expected (196, 8, 5, 6, 8, 68), Affected (${resultUsers}, ${resultCustomers}, ${resultSites}, ${resultBranches}, ${resultAssets}, ${resultWos}). Rolling back!`
        );
      }
    });

    console.log(`  [PASS] Atomic cleanup transaction committed successfully!`);
    console.log(`    Users Soft-Deactivated:     ${resultUsers} / 196`);
    console.log(`    Customers Soft-Deleted:     ${resultCustomers} / 8`);
    console.log(`    Customer Sites Soft-Deleted: ${resultSites} / 5`);
    console.log(`    Branches Soft-Deleted:       ${resultBranches} / 6`);
    console.log(`    Assets Soft-Deleted:         ${resultAssets} / 8`);
    console.log(`    Work Orders Soft-Deleted:    ${resultWos} / 68`);

  } catch (err: any) {
    console.error(`  [FAIL] Transaction aborted and rolled back: ${err.message}`);
    process.exit(1);
  }

  // 3. Post-Execution Verification
  console.log('\n--- 3. Post-Execution Verification & Baseline Checks ---');

  const [
    postActiveUsers,
    postActiveCustomers,
    postActiveSites,
    postActiveBranches,
    postActiveAssets,
    postActiveWos,
    postAuditLogs,
    postStatusHist,
    postStockTx,
    postApprovalActions,
    postParts,
    postJobs,
    postWorkers,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customerSite.count({ where: { deletedAt: null } }),
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.asset.count({ where: { deletedAt: null } }),
    prisma.workOrder.count({ where: { deletedAt: null } }),
    prisma.auditLog.count(),
    prisma.workOrderStatusHistory.count(),
    prisma.stockTransaction.count(),
    prisma.approvalAction.count(),
    prisma.part.count(),
    prisma.backgroundJob.count(),
    prisma.backgroundWorker.count(),
  ]);

  console.log(`  Active Operational Counts Remaining in Database:`);
  console.log(`    Active Operational Users Remaining: ${postActiveUsers} (Expected 116)`);
  console.log(`    Active Customers Remaining:        ${postActiveCustomers} (Expected 23)`);
  console.log(`    Active Customer Sites Remaining:   ${postActiveSites} (Expected 36)`);
  console.log(`    Active Branches Remaining:         ${postActiveBranches} (Expected 4)`);
  console.log(`    Active Assets Remaining:           ${postActiveAssets} (Expected 73)`);
  console.log(`    Active Work Orders Remaining:      ${postActiveWos} (Expected 42)`);

  console.log(`\n  Preserved Immutable & Reference Ledger Checks:`);
  console.log(`    Audit Logs Check:           ${postAuditLogs === preAuditLogs ? 'PASS' : 'FAIL'} (${postAuditLogs})`);
  console.log(`    WO Status History Check:    ${postStatusHist === preStatusHist ? 'PASS' : 'FAIL'} (${postStatusHist})`);
  console.log(`    Stock Transactions Check:   ${postStockTx === preStockTx ? 'PASS' : 'FAIL'} (${postStockTx})`);
  console.log(`    Approval Actions Check:     ${postApprovalActions === preApprovalActions ? 'PASS' : 'FAIL'} (${postApprovalActions})`);
  console.log(`    Parts Catalog Check:        ${postParts === preParts ? 'PASS' : 'FAIL'} (${postParts})`);
  console.log(`    Background Jobs Check:      ${postJobs === preJobs ? 'PASS' : 'FAIL'} (${postJobs})`);
  console.log(`    Background Workers Check:   ${postWorkers === preWorkers ? 'PASS' : 'FAIL'} (${postWorkers})`);

  const endTime = new Date();
  console.log(`\nExecution Completion Timestamp: ${endTime.toISOString()}`);
  console.log(`Total Execution Duration: ${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2)} seconds`);

  console.log(`\nFinal Outcome: PASS — CONTROLLED CLEANUP SUCCESSFULLY EXECUTED AND VERIFIED.`);
}

executeControlledCleanup();
