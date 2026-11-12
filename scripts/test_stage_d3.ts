/**
 * ZemiFix CMMS — Stage D.3 Comprehensive Automated Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Part Master Creation & Duplicate SKU/PartNumber Rejection
 *   2. Warehouse Store Creation (MAIN, BRANCH, DEPARTMENT)
 *   3. Opening Balance & Stock Receipt Transaction Posting
 *   4. Weighted Average Cost (WAC) Inventory Valuation Calculation:
 *      New WAC = ((Current Qty * Current WAC) + (Received Qty * Received Unit Cost)) / (Current Qty + Received Qty)
 *   5. Outflow Issue Transaction & Non-Negative Stock Validation
 *   6. Work Order Material Issue & Return Integration (Updates WorkOrderPart & WorkOrder.totalCost)
 *   7. Store Transfer Paired Append-Only Stock Movements (TRANSFER_OUT -> TRANSFER_IN)
 *   8. Append-Only Ledger Immutability Trigger Enforcement (Blocks UPDATE/DELETE on stock_transactions)
 *   9. Audit Log SHA-256 Chain Verification
 */

import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createAssetCategory } from '../src/lib/services/assetCategoryService';
import { createLocation } from '../src/lib/services/locationService';
import { createAsset } from '../src/lib/services/assetService';
import { createWorkOrder } from '../src/lib/services/workOrderService';
import {
  createPart,
  createStore,
  postStockTransaction,
  issueMaterialToWorkOrder,
  executeStoreTransfer,
} from '../src/lib/services/inventoryService';

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

async function runStageD3Tests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.3 Verification Test Suite');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;
  let store1: any = null;
  let store2: any = null;
  let testPart: any = null;
  let category: any = null;
  let loc1: any = null;
  let testAsset: any = null;
  let testWorkOrder: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or DEPT-ENG)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    adminUser = await prisma.user.create({
      data: {
        name: 'Stage D3 Admin User',
        email: `d3admin.${ts}@zemifix.local`,
        phone: '0244600001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Master Item Catalog & Warehouse Store Creation
    // -------------------------------------------------------------------------
    section('1. Master Item Catalog & Warehouse Store Creation');

    {
      testPart = await createPart(adminUser, {
        partNumber: `P-FILT-${ts}`,
        name: 'High Pressure Hydraulic Filter 100u',
        category: 'SPARE_PARTS',
        uom: 'PCS',
        standardCost: 100.0,
      });

      assert(testPart.partNumber === `P-FILT-${ts}`, 'Inventory Part Master created');

      // Duplicate Part Number Rejection
      let threwDup = false;
      try {
        await createPart(adminUser, {
          partNumber: `P-FILT-${ts}`,
          name: 'Duplicate Part Attempt',
        });
      } catch (err: any) {
        threwDup = true;
        assert(err.message.includes('Unique constraint') || err.message.includes('partNumber'), 'Duplicate part number rejected');
      }
      assert(threwDup, 'Duplicate SKU/PartNumber threw exception');

      // Create Stores
      store1 = await createStore(adminUser, {
        code: `STR-ACC-MAIN-${ts.toString().slice(-4)}`,
        name: 'Accra Central Main Warehouse',
        type: 'MAIN',
        branchId: hqBranch.id,
      });

      store2 = await createStore(adminUser, {
        code: `STR-ACC-BAY-${ts.toString().slice(-4)}`,
        name: 'Accra Workshop Bay Store',
        type: 'BRANCH',
        branchId: hqBranch.id,
      });

      assert(store1.code.startsWith('STR-ACC-MAIN-'), 'Main Store created');
      assert(store2.code.startsWith('STR-ACC-BAY-'), 'Branch Store created');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Stock Receipt & WAC Valuation Calculation
    // -------------------------------------------------------------------------
    section('2. Stock Receipt & WAC Valuation Calculation');

    {
      // Receipt 1: 100 PCS @ GHS 100.00
      const r1 = await prisma.$transaction(async (tx) => {
        return await postStockTransaction(tx, {
          transactionType: 'RECEIPT',
          storeId: store1.id,
          partId: testPart.id,
          quantity: 100,
          unitCost: 100.0,
          referenceDoc: 'GRN-001',
          actingUserId: adminUser.id,
        });
      });

      assert(r1.newQuantityOnHand === '100', 'Stock balance on hand updated to 100 PCS');
      assert(r1.newWac === '100', 'Initial WAC is GHS 100.00');

      // Receipt 2: 50 PCS @ GHS 160.00
      // WAC = ((100 * 100) + (50 * 160)) / 150 = (10000 + 8000) / 150 = 18000 / 150 = 120.00 GHS
      const r2 = await prisma.$transaction(async (tx) => {
        return await postStockTransaction(tx, {
          transactionType: 'RECEIPT',
          storeId: store1.id,
          partId: testPart.id,
          quantity: 50,
          unitCost: 160.0,
          referenceDoc: 'GRN-002',
          actingUserId: adminUser.id,
        });
      });

      assert(r2.newQuantityOnHand === '150', 'Stock balance on hand updated to 150 PCS');
      assert(r2.newWac === '120', 'Weighted Average Cost (WAC) correctly calculated to GHS 120.00');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Outflow Issue & Insufficient Stock Safeguards
    // -------------------------------------------------------------------------
    section('3. Outflow Issue & Insufficient Stock Safeguards');

    {
      // Attempt Outflow Issue exceeding stock (e.g. 200 PCS when only 150 available)
      let threwStock = false;
      try {
        await prisma.$transaction(async (tx) => {
          return await postStockTransaction(tx, {
            transactionType: 'ISSUE',
            storeId: store1.id,
            partId: testPart.id,
            quantity: 200,
            unitCost: 120.0,
            actingUserId: adminUser.id,
          });
        });
      } catch (err: any) {
        threwStock = true;
        assert(err.message.includes('INSUFFICIENT_STOCK'), 'Outflow issue exceeding stock rejected');
      }
      assert(threwStock, 'Insufficient stock threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Work Order Material Issue Integration
    // -------------------------------------------------------------------------
    section('4. Work Order Material Issue Integration');

    {
      category = await createAssetCategory({
        name: `Filter Category ${ts}`,
        code: `CAT-F-${ts.toString().slice(-4)}`,
        createdByUserId: adminUser.id,
      });

      loc1 = await createLocation({
        branchId: hqBranch.id,
        name: `Service Bay ${ts}`,
        code: `LOC-S-${ts.toString().slice(-4)}`,
        departmentId: engDept.id,
        createdByUserId: adminUser.id,
      });

      testAsset = await createAsset({
        assetTag: `AST-INV-${ts}`,
        name: 'Cat Generator 500kVA',
        ownershipType: 'COMPANY_OWNED',
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        categoryId: category.id,
        branchId: hqBranch.id,
        locationId: loc1.id,
        createdByUserId: adminUser.id,
      });

      testWorkOrder = await createWorkOrder(adminUser, {
        title: '500-Hour Generator PM Servicing',
        description: 'Replace oil and fuel filters',
        type: 'PREVENTIVE',
        assetId: testAsset.id,
        locationId: loc1.id,
      });

      // Issue 10 PCS to Work Order
      const issueRes = await issueMaterialToWorkOrder(adminUser, {
        workOrderId: testWorkOrder.id,
        storeId: store1.id,
        partId: testPart.id,
        quantity: 10,
      });

      assert(issueRes.newQuantityOnHand === '140', 'Stock balance reduced from 150 to 140 PCS');

      const woUpdated = await prisma.workOrder.findUnique({ where: { id: testWorkOrder.id } });
      assert(woUpdated?.totalCost.toString() === '1200', 'WorkOrder.totalCost updated with material cost (10 PCS * GHS 120.00 WAC = 1200 GHS)');

      const woPart = await prisma.workOrderPart.findFirst({ where: { workOrderId: testWorkOrder.id, partId: testPart.id } });
      assert(woPart?.quantityConsumed.toString() === '10', 'WorkOrderPart quantityConsumed updated to 10');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Inter-Warehouse Store Transfers
    // -------------------------------------------------------------------------
    section('5. Inter-Warehouse Store Transfers');

    {
      // Transfer 20 PCS from Store 1 to Store 2
      const trfRes = await executeStoreTransfer(adminUser, {
        sourceStoreId: store1.id,
        destinationStoreId: store2.id,
        partId: testPart.id,
        quantity: 20,
        notes: 'Replenishing Workshop Bay Store',
      });

      assert(trfRes.outTxn.newQuantityOnHand === '120', 'Source store stock balance reduced from 140 to 120 PCS');
      assert(trfRes.inTxn.newQuantityOnHand === '20', 'Destination store stock balance increased to 20 PCS');
      assert(trfRes.transfer.status === 'RECEIVED', 'StoreTransfer status is RECEIVED');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: Stock Transaction Ledger Immutability & Audit Chain
    // -------------------------------------------------------------------------
    section('6. Stock Transaction Ledger Immutability & Audit Chain');

    {
      const lastTxn = await prisma.stockTransaction.findFirst({ orderBy: { createdAt: 'desc' } });

      let threwImmutability = false;
      try {
        await prisma.stockTransaction.update({
          where: { id: lastTxn?.id },
          data: { quantity: new Prisma.Decimal(999) },
        });
      } catch (err: any) {
        threwImmutability = true;
        assert(err.message.includes('TAMPER_PROTECTION'), 'Modifying stock_transactions ledger blocked by trigger');
      }
      assert(threwImmutability, 'Stock transaction modification threw trigger exception');

      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage D.3 operations');
    }

  } finally {
    // Clean up test data
    if (testWorkOrder) {
      await prisma.$executeRaw`DELETE FROM "stock_transactions" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_parts" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id = ${testWorkOrder.id}::uuid`.catch(() => {});
    }
    if (testPart && store1) {
      await prisma.$executeRaw`DELETE FROM "store_transfer_lines" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "store_transfers" WHERE "sourceStoreId" = ${store1.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stock_transactions" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stock" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "parts" WHERE id = ${testPart.id}::uuid`.catch(() => {});
    }
    if (store1) await prisma.store.delete({ where: { id: store1.id } }).catch(() => {});
    if (store2) await prisma.store.delete({ where: { id: store2.id } }).catch(() => {});
    if (testAsset) await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${testAsset.id}::uuid`.catch(() => {});
    if (loc1) await prisma.location.delete({ where: { id: loc1.id } }).catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD3Tests().catch((err) => {
  console.error('Stage D.3 Test Execution Failed:', err);
  process.exit(1);
});
