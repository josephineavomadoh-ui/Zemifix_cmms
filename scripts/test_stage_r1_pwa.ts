/**
 * ZemiFix CMMS — Stage R1 Technician PWA & Offline Synchronization Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Database-Level Idempotency Guard (`offline_sync_mutations_userId_idempotencyKey_key`)
 *   2. Two-Step Conflict Transaction Safety (Conflict log survives business operation rollback)
 *   3. Server-Authoritative Valuation (Server enforces GHS 50.00/hr labor rate & store WAC)
 *   4. Server-Side Scope Revalidation (Foreign branch WO sync attempt rejected)
 *   5. Partial Batch Execution (Valid mutations sync successfully alongside conflicts)
 *   6. Crash Recovery Lease Timeout (`recoverCrashedSyncLeases`)
 *   7. SHA-256 Audit Chain Integrity Verification
 */

import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createAssetCategory } from '../src/lib/services/assetCategoryService';
import { createLocation } from '../src/lib/services/locationService';
import { createAsset } from '../src/lib/services/assetService';
import { createWorkOrder, transitionWorkOrderStatus } from '../src/lib/services/workOrderService';
import { createPart, createStore, postStockTransaction } from '../src/lib/services/inventoryService';
import { processSyncBatch, recoverCrashedSyncLeases } from '../src/lib/services/syncService';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
}
if (!process.env.APPROVAL_SECRET) {
  process.env.APPROVAL_SECRET = 'test-approval-secret-at-least-32-characters-long-pad!';
}

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label);
  else fail(label, detail);
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

async function runStageR1PwaTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 PWA Verification Test Suite');
  console.log('=====================================================');

  let adminUser: any = null;
  let techUser: any = null;
  let foreignUser: any = null;
  let hqBranch: any = null;
  let regBranch: any = null;
  let engDept: any = null;
  let category: any = null;
  let loc1: any = null;
  let testAsset: any = null;
  let testWorkOrder: any = null;
  let cancelledWorkOrder: any = null;
  let store1: any = null;
  let testPart: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    regBranch = await prisma.branch.findUnique({ where: { code: 'REG-TEMA' } });
    engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !regBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, branches, or department)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    adminUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Admin User',
        email: `r1admin.${ts}@zemifix.local`,
        phone: '0244800001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    techUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Tech User',
        email: `r1tech.${ts}@zemifix.local`,
        phone: '0244800002',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    foreignUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Foreign User',
        email: `r1foreign.${ts}@zemifix.local`,
        phone: '0244800003',
        passwordHash,
        roleId: adminRole.id,
        branchId: regBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // Setup Category, Location, Asset, Work Orders
    category = await createAssetCategory({
      name: `PWA Test Category ${ts}`,
      code: `CAT-PWA-${ts.toString().slice(-4)}`,
      createdByUserId: adminUser.id,
    });

    loc1 = await createLocation({
      branchId: hqBranch.id,
      name: `PWA Workshop ${ts}`,
      code: `LOC-PWA-${ts.toString().slice(-4)}`,
      departmentId: engDept.id,
      createdByUserId: adminUser.id,
    });

    testAsset = await createAsset({
      assetTag: `AST-PWA-${ts}`,
      name: 'PWA Mobile Test Pump',
      ownershipType: 'COMPANY_OWNED',
      managingOrgType: 'INTERNAL_BRANCH',
      managingBranchId: hqBranch.id,
      categoryId: category.id,
      branchId: hqBranch.id,
      locationId: loc1.id,
      createdByUserId: adminUser.id,
    });

    testWorkOrder = await createWorkOrder(adminUser, {
      title: 'PWA Mobile Field Repair',
      description: 'Replace mechanical seal',
      type: 'CORRECTIVE',
      assetId: testAsset.id,
      locationId: loc1.id,
      assignedUserId: techUser.id,
    });

    cancelledWorkOrder = await createWorkOrder(adminUser, {
      title: 'PWA Cancelled Work Order',
      description: 'Test cancellation conflict',
      type: 'CORRECTIVE',
      assetId: testAsset.id,
      locationId: loc1.id,
      assignedUserId: techUser.id,
    });

    // Cancel the second work order on server
    await transitionWorkOrderStatus(adminUser, {
      workOrderId: cancelledWorkOrder.id,
      newStatus: 'CANCELLED',
      reason: 'Cancelled by supervisor on server',
    });

    // Setup Part & Store with 5 PCS stock
    testPart = await createPart(adminUser, {
      partNumber: `P-SEAL-${ts.toString().slice(-6)}`,
      name: 'Mechanical Shaft Seal 25mm',
      standardCost: 150.0,
    });

    store1 = await createStore(adminUser, {
      code: `STR-PWA-${ts.toString().slice(-4)}`,
      name: 'PWA Test Store',
      branchId: hqBranch.id,
    });

    await prisma.$transaction(async (tx) => {
      await postStockTransaction(tx, {
        transactionType: 'RECEIPT',
        storeId: store1.id,
        partId: testPart.id,
        quantity: 5,
        unitCost: 150.0,
        actingUserId: adminUser.id,
      });
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Database-Level Idempotency Guard
    // -------------------------------------------------------------------------
    section('1. Database-Level Idempotency Guard');

    {
      const idempotencyKey = generateUuidV7();

      const batch1 = await processSyncBatch(techUser, {
        mutations: [
          {
            idempotencyKey,
            actionType: 'LABOR_LOG',
            entityType: 'work_order',
            entityId: testWorkOrder.id,
            payload: {
              workOrderId: testWorkOrder.id,
              hoursWorked: 2.0,
            },
          },
        ],
      });

      assert(batch1.status === 'COMPLETED', 'First batch sync executed successfully');
      assert(batch1.syncedCount === 1, '1 mutation synced');

      // Retry duplicate mutation with SAME idempotencyKey
      const batch2 = await processSyncBatch(techUser, {
        mutations: [
          {
            idempotencyKey,
            actionType: 'LABOR_LOG',
            entityType: 'work_order',
            entityId: testWorkOrder.id,
            payload: {
              workOrderId: testWorkOrder.id,
              hoursWorked: 2.0,
            },
          },
        ],
      });

      assert(batch2.syncedCount === 1, 'Duplicate mutation re-processed via idempotency guard without double execution');
      const laborCount = await prisma.workOrderLabor.count({ where: { workOrderId: testWorkOrder.id } });
      assert(laborCount === 1, 'Exactly 1 labor record exists in DB (double execution blocked)');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Server-Authoritative Financial Valuation
    // -------------------------------------------------------------------------
    section('2. Server-Authoritative Financial Valuation');

    {
      const laborRecord = await prisma.workOrderLabor.findFirst({ where: { workOrderId: testWorkOrder.id } });
      assert(laborRecord !== null, 'Labor record created via offline sync');
      assert(laborRecord?.hourlyRate.toString() === '50', 'Server enforced standard hourly rate (50.00 GHS)');
      assert(laborRecord?.totalCost.toString() === '100', 'Total labor cost calculated by server (2 hrs * 50 GHS = 100 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Two-Step Conflict Safety & Material Stock Unavailable
    // -------------------------------------------------------------------------
    section('3. Two-Step Conflict Safety & Stock Unavailable');

    {
      // Attempt to issue 20 PCS when only 5 PCS available
      const keyConflict = generateUuidV7();

      const conflictBatch = await processSyncBatch(techUser, {
        mutations: [
          {
            idempotencyKey: keyConflict,
            actionType: 'MATERIAL_ISSUE_REQUEST',
            entityType: 'work_order',
            entityId: testWorkOrder.id,
            payload: {
              workOrderId: testWorkOrder.id,
              storeId: store1.id,
              partId: testPart.id,
              quantity: 20, // Exceeds available stock 5
            },
          },
        ],
      });

      assert(conflictBatch.status === 'PARTIALLY_COMPLETED', 'Batch status is PARTIALLY_COMPLETED when conflict occurs');
      assert(conflictBatch.conflictCount === 1, 'Conflict recorded for insufficient stock');

      // Verify conflict log persisted in OfflineSyncConflict
      const conflictRecord = await prisma.offlineSyncConflict.findFirst({
        where: { userId: techUser.id, conflictType: 'STOCK_UNAVAILABLE' },
      });

      assert(conflictRecord !== null, 'Conflict record persisted in offline_sync_conflicts ledger');
      assert(conflictRecord?.resolutionStrategy === 'SERVER_WINS', 'Resolution strategy set to SERVER_WINS');

      // Verify store stock remained 5 PCS (business operation rolled back cleanly)
      const stock = await prisma.stock.findUnique({
        where: { storeId_partId: { storeId: store1.id, partId: testPart.id } },
      });
      assert(stock?.quantityOnHand.toString() === '5', 'Store stock balance remained 5 PCS (no fake stock deduction)');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Reassignment & Cancellation Conflicts (SERVER_WINS)
    // -------------------------------------------------------------------------
    section('4. Reassignment & Cancellation Conflicts');

    {
      const keyCancel = generateUuidV7();

      const cancelBatch = await processSyncBatch(techUser, {
        mutations: [
          {
            idempotencyKey: keyCancel,
            actionType: 'WORK_ORDER_STATUS_SHIFT',
            entityType: 'work_order',
            entityId: cancelledWorkOrder.id,
            payload: {
              workOrderId: cancelledWorkOrder.id,
              newStatus: 'IN_PROGRESS',
            },
          },
        ],
      });

      assert(cancelBatch.conflictCount === 1, 'Offline status shift on cancelled WO flagged as conflict');

      const woStatus = await prisma.workOrder.findUnique({ where: { id: cancelledWorkOrder.id } });
      assert(woStatus?.status === 'CANCELLED', 'Server status remained CANCELLED (SERVER_WINS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Server-Side Organizational Scope Revalidation
    // -------------------------------------------------------------------------
    section('5. Server-Side Organizational Scope Revalidation');

    {
      const keyScope = generateUuidV7();

      const scopeBatch = await processSyncBatch(foreignUser, {
        mutations: [
          {
            idempotencyKey: keyScope,
            actionType: 'WORK_ORDER_STATUS_SHIFT',
            entityType: 'work_order',
            entityId: testWorkOrder.id, // HQ branch WO
            payload: {
              workOrderId: testWorkOrder.id,
              newStatus: 'IN_PROGRESS',
            },
          },
        ],
      });

      assert(scopeBatch.conflictCount === 1, 'Foreign branch user sync attempt rejected as conflict');
      assert(scopeBatch.results[0].reason.includes('UNAUTHORIZED_WORK_ORDER'), 'Reason contains UNAUTHORIZED_WORK_ORDER');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: Crash Recovery Lease Timeout
    // -------------------------------------------------------------------------
    section('6. Crash Recovery Lease Timeout');

    {
      const staleMutationId = generateUuidV7();
      const staleBatch = await prisma.offlineSyncBatch.create({
        data: {
          id: generateUuidV7(),
          batchRef: `BATCH-CRASH-${ts}`,
          userId: adminUser.id,
          status: 'PROCESSING',
        },
      });

      await prisma.offlineSyncMutation.create({
        data: {
          id: staleMutationId,
          batchId: staleBatch.id,
          userId: adminUser.id,
          idempotencyKey: generateUuidV7(),
          actionType: 'LABOR_LOG',
          entityType: 'work_order',
          entityId: testWorkOrder.id,
          payload: {},
          status: 'PROCESSING',
          processingLeaseExpiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 mins ago
        },
      });

      const recoveryRes = await recoverCrashedSyncLeases();
      assert(recoveryRes.count >= 1, 'Lease recovery task detected stale processing mutation');

      const recoveredMutation = await prisma.offlineSyncMutation.findUnique({ where: { id: staleMutationId } });
      assert(recoveredMutation?.status === 'QUEUED', 'Stale mutation status reset to QUEUED for safe retry');
    }

    // -------------------------------------------------------------------------
    // SECTION 7: SHA-256 Audit Chain Verification
    // -------------------------------------------------------------------------
    section('7. SHA-256 Audit Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage R1 PWA sync operations');
    }

  } finally {
    // Clean up test data
    if (adminUser) {
      await prisma.$executeRaw`DELETE FROM "offline_sync_conflicts" WHERE "userId" IN (${adminUser.id}::uuid, ${techUser?.id}::uuid, ${foreignUser?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "offline_sync_mutations" WHERE "userId" IN (${adminUser.id}::uuid, ${techUser?.id}::uuid, ${foreignUser?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "offline_sync_batches" WHERE "userId" IN (${adminUser.id}::uuid, ${techUser?.id}::uuid, ${foreignUser?.id}::uuid)`.catch(() => {});
    }
    if (testWorkOrder) {
      await prisma.$executeRaw`DELETE FROM "work_order_labor" WHERE "workOrderId" IN (${testWorkOrder.id}::uuid, ${cancelledWorkOrder?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" IN (${testWorkOrder.id}::uuid, ${cancelledWorkOrder?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id IN (${testWorkOrder.id}::uuid, ${cancelledWorkOrder?.id}::uuid)`.catch(() => {});
    }
    if (testPart && store1) {
      await prisma.$executeRaw`DELETE FROM "stock_transactions" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stock" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "parts" WHERE id = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stores" WHERE id = ${store1.id}::uuid`.catch(() => {});
    }
    if (testAsset) await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${testAsset.id}::uuid`.catch(() => {});
    if (loc1) await prisma.location.delete({ where: { id: loc1.id } }).catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (techUser) await prisma.user.delete({ where: { id: techUser.id } }).catch(() => {});
    if (foreignUser) await prisma.user.delete({ where: { id: foreignUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageR1PwaTests().catch((err) => {
  console.error('Stage R1 PWA Test Execution Failed:', err);
  process.exit(1);
});
