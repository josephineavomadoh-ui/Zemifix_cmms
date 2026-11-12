/**
 * ZemiFix CMMS — Stage D.4 Comprehensive Automated Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Vendor Master Registration & Duplicate Code Rejection
 *   2. Purchase Requisition Creation & Line Item Total Calculation
 *   3. RFQ Creation & Multiple Vendor Quotation Submission
 *   4. Purchase Order Issuance with Ghana Statutory Taxes (15% VAT, 2.5% NHIL, 2.5% GETFund)
 *   5. Goods Received Note (GRN) Posting & Mandatory Stage D.3 Inventory Stock Receipt Integration
 *   6. Stock Balance & Weighted Average Cost (WAC) Update Verification upon GRN Receipt
 *   7. Supplier Return & Stage D.3 RETURN_OUT Inventory Stock Deduction Integration
 *   8. Audit Log SHA-256 Chain Verification
 */

import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createPart, createStore } from '../src/lib/services/inventoryService';
import { createVendor } from '../src/lib/services/vendorService';
import {
  createPurchaseRequisition,
  createRfq,
  createPurchaseOrder,
  postGoodsReceivedNote,
  createSupplierReturn,
} from '../src/lib/services/procurementService';

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

async function runStageD4Tests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.4 Verification Test Suite');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;
  let vendor1: any = null;
  let vendor2: any = null;
  let store1: any = null;
  let testPart: any = null;
  let requisition: any = null;
  let rfq: any = null;
  let po: any = null;
  let grnResult: any = null;

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
        name: 'Stage D4 Admin User',
        email: `d4admin.${ts}@zemifix.local`,
        phone: '0244700001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Vendor Master Registration & Duplicate Prevention
    // -------------------------------------------------------------------------
    section('1. Vendor Master Registration & Duplicate Prevention');

    {
      vendor1 = await createVendor(adminUser, {
        code: `VEND-${ts.toString().slice(-6)}`,
        registeredName: 'Ghana Industrial Supplies Ltd',
        email: `sales.${ts}@ghana-supplies.com`,
        phone: '0244100200',
        address: 'Accra Industrial Estate, Ring Road',
        taxId: 'C0001234567',
        vatRegistered: true,
      });

      assert(vendor1.code.startsWith('VEND-'), 'Vendor master record registered successfully');

      vendor2 = await createVendor(adminUser, {
        code: `VEND-ALT-${ts.toString().slice(-4)}`,
        registeredName: 'Tema Heavy Machinery Tools',
        email: `info.${ts}@tema-tools.com`,
        phone: '0200300400',
        address: 'Tema Heavy Industrial Area',
      });

      assert(vendor2.registeredName === 'Tema Heavy Machinery Tools', 'Second vendor registered successfully');

      // Duplicate Vendor Code Rejection
      let threwDup = false;
      try {
        await createVendor(adminUser, {
          code: vendor1.code,
          registeredName: 'Duplicate Vendor Code Attempt',
          email: 'dup@test.com',
          phone: '0244000000',
          address: 'Accra',
        });
      } catch (err: any) {
        threwDup = true;
        assert(err.message.includes('Unique constraint') || err.message.includes('code'), 'Duplicate vendor code rejected');
      }
      assert(threwDup, 'Duplicate vendor code threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Master Inventory Part & Store Setup
    // -------------------------------------------------------------------------
    section('2. Master Inventory Part & Store Setup');

    {
      testPart = await createPart(adminUser, {
        partNumber: `P-BEAR-${ts.toString().slice(-6)}`,
        name: 'SKF 6205 Heavy Roller Bearing',
        category: 'SPARE_PARTS',
        uom: 'PCS',
        standardCost: 80.0,
      });

      store1 = await createStore(adminUser, {
        code: `STR-D4-${ts.toString().slice(-4)}`,
        name: 'D4 Central Receiving Store',
        type: 'MAIN',
        branchId: hqBranch.id,
      });

      assert(testPart.partNumber.startsWith('P-BEAR-'), 'Inventory part created for D.4 procurement testing');
      assert(store1.code.startsWith('STR-D4-'), 'Warehouse receiving store created');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Purchase Requisition & RFQ Quotations
    // -------------------------------------------------------------------------
    section('3. Purchase Requisition & RFQ Quotations');

    {
      requisition = await createPurchaseRequisition(adminUser, {
        justification: 'Quarterly replenishment of SKF Roller Bearings for conveyor line PMs',
        priority: 'HIGH',
        items: [
          {
            partId: testPart.id,
            description: 'SKF 6205 Heavy Roller Bearing',
            quantity: 50,
            estimatedUnitPrice: 80.0,
          },
        ],
      });

      assert(requisition.requisitionNumber.startsWith('PR-'), 'Purchase Requisition created');
      assert(requisition.estimatedTotal.toString() === '4000', 'Requisition estimatedTotal calculated (50 * 80 GHS = 4000 GHS)');

      // Create RFQ with multiple vendors
      rfq = await createRfq(adminUser, {
        title: 'RFQ - SKF Roller Bearings 50 PCS',
        requisitionId: requisition.id,
        vendorIds: [vendor1.id, vendor2.id],
      });

      assert(rfq.rfqNumber.startsWith('RFQ-'), 'Request for Quotation (RFQ) created for multiple vendors');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Purchase Order Issuance with Ghana Statutory Taxes
    // -------------------------------------------------------------------------
    section('4. Purchase Order Issuance with Ghana Statutory Taxes');

    {
      // Subtotal = 50 PCS * 80 GHS = 4000.00 GHS
      // VAT (15%) = 600.00 GHS
      // NHIL (2.5%) = 100.00 GHS
      // GETFund (2.5%) = 100.00 GHS
      // Total Amount = 4000 + 600 + 100 + 100 = 4800.00 GHS
      po = await createPurchaseOrder(adminUser, {
        vendorId: vendor1.id,
        requisitionId: requisition.id,
        deliveryAddress: 'Accra Main Store, Industrial Area',
        items: [
          {
            partId: testPart.id,
            description: 'SKF 6205 Heavy Roller Bearing',
            quantityOrdered: 50,
            unitPrice: 80.0,
          },
        ],
      });

      assert(po.poNumber.startsWith('PO-'), 'Purchase Order issued');
      assert(po.subtotal.toString() === '4000', 'PO Subtotal is 4000.00 GHS');
      assert(po.vatAmount.toString() === '600', 'Ghana VAT (15%) calculated correctly (600.00 GHS)');
      assert(po.nhilAmount.toString() === '100', 'Ghana NHIL (2.5%) calculated correctly (100.00 GHS)');
      assert(po.getFundAmount.toString() === '100', 'Ghana GETFund (2.5%) calculated correctly (100.00 GHS)');
      assert(po.totalAmount.toString() === '4800', 'PO Total Amount calculated correctly (4800.00 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Goods Received Note (GRN) & Mandatory Stage D.3 Inventory Integration
    // -------------------------------------------------------------------------
    section('5. GRN Posting & Stage D.3 Inventory Stock Receipt Integration');

    {
      const poItem = po.items[0];

      // Post GRN for 50 accepted PCS @ GHS 80.00
      grnResult = await postGoodsReceivedNote(adminUser, {
        poId: po.id,
        storeId: store1.id,
        invoiceReference: `INV-VEND-${ts.toString().slice(-4)}`,
        notes: 'Full delivery received in good condition',
        items: [
          {
            poItemId: poItem.id,
            partId: testPart.id,
            quantityReceived: 50,
            quantityAccepted: 50,
            quantityRejected: 0,
            unitCost: 80.0,
          },
        ],
      });

      assert(grnResult.grn.grnNumber.startsWith('GRN-'), 'Goods Received Note (GRN) posted');
      assert(grnResult.poStatus === 'RECEIVED', 'PO status updated to RECEIVED upon full receipt');

      // Verify Stage D.3 Inventory Stock Balance & WAC
      const stock = await prisma.stock.findUnique({
        where: { storeId_partId: { storeId: store1.id, partId: testPart.id } },
      });

      assert(stock !== null, 'Store stock record created in Stage D.3 inventory ledger');
      assert(stock?.quantityOnHand.toString() === '50', 'Stock quantityOnHand automatically updated to 50 PCS via GRN posting');
      assert(stock?.averageUnitCost.toString() === '80', 'Stock WAC averageUnitCost updated to GHS 80.00');

      // Verify StockTransaction ledger entry created with transactionType = RECEIPT
      const txn = await prisma.stockTransaction.findFirst({
        where: { storeId: store1.id, partId: testPart.id, transactionType: 'RECEIPT' },
      });

      assert(txn !== null, 'Append-only RECEIPT transaction recorded in stock_transactions ledger');
      assert(txn?.referenceDoc === grnResult.grn.grnNumber, 'Ledger transaction linked to GRN reference');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: Supplier Returns & Inventory RETURN_OUT Stock Deduction
    // -------------------------------------------------------------------------
    section('6. Supplier Returns & Stage D.3 RETURN_OUT Integration');

    {
      // Return 5 damaged PCS back to vendor
      const returnRes = await createSupplierReturn(adminUser, {
        grnId: grnResult.grn.id,
        reason: '5 bearings rejected due to packaging seal failure',
        items: [
          {
            partId: testPart.id,
            quantityReturned: 5,
            unitCost: 80.0,
          },
        ],
      });

      assert(returnRes.returnNumber.startsWith('RET-SUP-'), 'Supplier Return recorded');

      // Verify Stage D.3 Inventory Stock Balance reduced from 50 to 45 PCS
      const stockAfterReturn = await prisma.stock.findUnique({
        where: { storeId_partId: { storeId: store1.id, partId: testPart.id } },
      });

      assert(stockAfterReturn?.quantityOnHand.toString() === '45', 'Stock quantityOnHand reduced to 45 PCS after RETURN_OUT');

      // Verify RETURN_OUT transaction recorded
      const returnTxn = await prisma.stockTransaction.findFirst({
        where: { storeId: store1.id, partId: testPart.id, transactionType: 'RETURN_OUT' },
      });

      assert(returnTxn !== null, 'RETURN_OUT transaction recorded in stock_transactions ledger');
    }

    // -------------------------------------------------------------------------
    // SECTION 7: Audit Log SHA-256 Chain Verification
    // -------------------------------------------------------------------------
    section('7. Audit Log SHA-256 Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage D.4 operations');
    }

  } finally {
    // Cleanup
    if (grnResult) {
      await prisma.$executeRaw`DELETE FROM "supplier_return_items" WHERE "returnId" IN (SELECT id FROM "supplier_returns" WHERE "grnId" = ${grnResult.grn.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "supplier_returns" WHERE "grnId" = ${grnResult.grn.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "goods_received_note_items" WHERE "grnId" = ${grnResult.grn.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "goods_received_notes" WHERE id = ${grnResult.grn.id}::uuid`.catch(() => {});
    }
    if (po) {
      await prisma.$executeRaw`DELETE FROM "purchase_order_items" WHERE "poId" = ${po.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "purchase_orders" WHERE id = ${po.id}::uuid`.catch(() => {});
    }
    if (rfq) {
      await prisma.$executeRaw`DELETE FROM "rfq_vendors" WHERE "rfqId" = ${rfq.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "rfqs" WHERE id = ${rfq.id}::uuid`.catch(() => {});
    }
    if (requisition) {
      await prisma.$executeRaw`DELETE FROM "purchase_requisition_items" WHERE "requisitionId" = ${requisition.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "purchase_requisitions" WHERE id = ${requisition.id}::uuid`.catch(() => {});
    }
    if (testPart && store1) {
      await prisma.$executeRaw`DELETE FROM "stock_transactions" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stock" WHERE "partId" = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "parts" WHERE id = ${testPart.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "stores" WHERE id = ${store1.id}::uuid`.catch(() => {});
    }
    if (vendor1) await prisma.vendor.delete({ where: { id: vendor1.id } }).catch(() => {});
    if (vendor2) await prisma.vendor.delete({ where: { id: vendor2.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD4Tests().catch((err) => {
  console.error('Stage D.4 Test Execution Failed:', err);
  process.exit(1);
});
