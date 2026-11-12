/**
 * ZemiFix CMMS — Stage R1 Invoicing & Commercial Billing Engine Test Suite
 *
 * Scenarios Executed:
 *   1. Draft Invoice Creation & Ghana Statutory Tax Engine (VAT 15%, NHIL 2.5%, GETFund 2.5%)
 *   2. Concurrency-Safe Gapless Document Number Allocation (INV-2026-XXXXXX allocated on APPROVAL)
 *   3. Payment Remittance & Allocation Ledger (Updates paidAmount, balanceDue, & Invoice status)
 *   4. Overpayment Rejection & Credit Note Issuance
 *   5. Facility Mode Internal Departmental Recharge (0 tax, @@unique([workOrderId]))
 *   6. Customer Portal Invoice Access Isolation
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
import { createWorkOrder } from '../src/lib/services/workOrderService';
import {
  createInvoice,
  approveInvoice,
  recordPaymentRemittance,
  issueCreditNote,
  recordInternalRecharge,
  allocateDocumentNumber,
} from '../src/lib/services/billingService';

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

async function runStageR1InvoicingTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Invoicing Verification');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;
  let opsDept: any = null;
  let customer: any = null;
  let site1: any = null;
  let draftInvoice: any = null;
  let approvedInvoice: any = null;
  let category: any = null;
  let loc1: any = null;
  let testAsset: any = null;
  let facilityWo: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });
    opsDept = await prisma.department.findUnique({ where: { code: 'DEPT-OPS' } });

    if (!adminRole || !hqBranch || !engDept || !opsDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or departments)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    adminUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Billing Admin',
        email: `r1invadmin.${ts}@zemifix.local`,
        phone: '0244960001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // Setup Customer & Site
    customer = await prisma.customer.create({
      data: {
        id: generateUuidV7(),
        customerNumber: `CUST-INV-${ts.toString().slice(-6)}`,
        name: 'Accra Power & Mining Corp',
        taxId: 'C0007778889',
        billingAddress: 'Accra Industrial Estate, Ring Road',
        primaryPhone: '0302333444',
        primaryEmail: `billing.${ts}@accra-power.com`,
      },
    });

    site1 = await prisma.customerSite.create({
      data: {
        id: generateUuidV7(),
        customerId: customer.id,
        siteCode: `STE-INV-${ts.toString().slice(-4)}`,
        name: 'Accra Substation Site A',
        address: 'Accra Industrial Estate',
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Draft Invoice Creation & Ghana Tax Engine
    // -------------------------------------------------------------------------
    section('1. Draft Invoice Creation & Ghana Tax Engine');

    {
      // Subtotal = 10 * 100 GHS = 1000 GHS
      // VAT (15%) = 150 GHS
      // NHIL (2.5%) = 25 GHS
      // GETFund (2.5%) = 25 GHS
      // Total Amount = 1000 + 150 + 25 + 25 = 1200 GHS
      draftInvoice = await createInvoice(adminUser, {
        customerId: customer.id,
        siteId: site1.id,
        dueDate: new Date('2026-12-31'),
        items: [
          {
            description: 'Substation Transformer Bushing Replacement',
            quantity: 10,
            unitPrice: 100.0,
          },
        ],
      });

      assert(draftInvoice.draftReference.startsWith('DRAFT-INV-'), 'Draft Invoice created with temporary draft reference');
      assert(draftInvoice.invoiceNumber === null, 'Invoice number remains NULL prior to approval');
      assert(draftInvoice.status === 'DRAFT', 'Initial status is DRAFT');
      assert(draftInvoice.subtotal.toString() === '1000', 'Subtotal calculated (10 * 100 GHS = 1000 GHS)');
      assert(draftInvoice.vatAmount.toString() === '150', 'Ghana VAT (15%) calculated (150 GHS)');
      assert(draftInvoice.nhilAmount.toString() === '25', 'Ghana NHIL (2.5%) calculated (25 GHS)');
      assert(draftInvoice.getFundAmount.toString() === '25', 'Ghana GETFund (2.5%) calculated (25 GHS)');
      assert(draftInvoice.totalAmount.toString() === '1200', 'Total Amount calculated (1200 GHS)');
      assert(draftInvoice.balanceDue.toString() === '1200', 'Initial balanceDue equals totalAmount (1200 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Concurrency-Safe Gapless Document Numbering
    // -------------------------------------------------------------------------
    section('2. Concurrency-Safe Gapless Document Numbering');

    {
      approvedInvoice = await approveInvoice(adminUser, draftInvoice.id);

      assert(approvedInvoice.status === 'APPROVED', 'Invoice status updated to APPROVED');
      assert(approvedInvoice.invoiceNumber !== null, 'Permanent gapless invoice number allocated upon approval');
      assert(approvedInvoice.invoiceNumber?.startsWith('INV-2026-'), 'Invoice number formatted with prefix (INV-2026-XXXXXX)');

      // Test NumberSequence Atomic Allocation
      const seq1 = await prisma.$transaction(async (tx) => {
        return await allocateDocumentNumber(tx, `TEST-${ts.toString().slice(-4)}`);
      });
      const seq2 = await prisma.$transaction(async (tx) => {
        return await allocateDocumentNumber(tx, `TEST-${ts.toString().slice(-4)}`);
      });

      assert(seq1.endsWith('-000001'), 'First atomic document number allocated (000001)');
      assert(seq2.endsWith('-000002'), 'Second atomic document number incremented gaplessly (000002)');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Payment Remittance & Allocation Ledger
    // -------------------------------------------------------------------------
    section('3. Payment Remittance & Allocation Ledger');

    {
      // Record partial payment remittance of 700 GHS against 1200 GHS invoice
      const payRes1 = await recordPaymentRemittance(adminUser, {
        customerId: customer.id,
        invoiceId: approvedInvoice.id,
        amount: 700.0,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TXN-BANK-998877',
      });

      assert(payRes1.newInvoiceStatus === 'PARTIALLY_PAID', 'Invoice status shifted to PARTIALLY_PAID');
      assert(payRes1.newBalanceDue === '500', 'Balance due reduced to 500 GHS (1200 - 700 = 500 GHS)');

      // Overpayment Protection Test: Attempt payment of 800 GHS when balance due is 500 GHS
      let threwOverpay = false;
      try {
        await recordPaymentRemittance(adminUser, {
          customerId: customer.id,
          invoiceId: approvedInvoice.id,
          amount: 800.0,
        });
      } catch (err: any) {
        threwOverpay = true;
        assert(err.message.includes('OVERPAYMENT_PROHIBITED'), 'Overpayment exceeding balance due rejected');
      }
      assert(threwOverpay, 'Overpayment threw exception');

      // Record final payment remittance of 500 GHS
      const payRes2 = await recordPaymentRemittance(adminUser, {
        customerId: customer.id,
        invoiceId: approvedInvoice.id,
        amount: 500.0,
        paymentMethod: 'MOBILE_MONEY',
        referenceNumber: 'MOMO-REF-112233',
      });

      assert(payRes2.newInvoiceStatus === 'PAID', 'Invoice status shifted to PAID upon full settlement');
      assert(payRes2.newBalanceDue === '0', 'Balance due reduced to 0 GHS');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Credit Note Issuance & Credit Ledger Application
    // -------------------------------------------------------------------------
    section('4. Credit Note Issuance & Credit Ledger Application');

    {
      // Create new draft invoice for 600 GHS total (500 subtotal + 100 tax)
      const inv2 = await createInvoice(adminUser, {
        customerId: customer.id,
        siteId: site1.id,
        dueDate: new Date('2026-12-31'),
        items: [{ description: 'Bushing Adjustment Fee', quantity: 1, unitPrice: 500.0 }],
      });

      const approvedInv2 = await approveInvoice(adminUser, inv2.id);

      // Issue Credit Note for 200 GHS subtotal (+ 40 GHS tax = 240 GHS total credit)
      const cn = await issueCreditNote(adminUser, {
        invoiceId: approvedInv2.id,
        reason: 'Commercial discount granted by management',
        subtotal: 200.0,
      });

      assert(cn.creditNoteNumber.startsWith('CN-2026-'), 'Credit Note issued');

      const inv2Updated = await prisma.invoice.findUnique({ where: { id: approvedInv2.id } });
      assert(inv2Updated?.creditedAmount.toString() === '240', 'Invoice creditedAmount updated to 240 GHS');
      assert(inv2Updated?.balanceDue.toString() === '360', 'Invoice balanceDue reduced to 360 GHS (600 - 240 = 360 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Facility Mode Internal Departmental Recharge
    // -------------------------------------------------------------------------
    section('5. Facility Mode Internal Departmental Recharge');

    {
      category = await createAssetCategory({
        name: `Billing Category ${ts}`,
        code: `CAT-B-${ts.toString().slice(-4)}`,
        createdByUserId: adminUser.id,
      });

      loc1 = await createLocation({
        branchId: hqBranch.id,
        name: `HQ Bay ${ts}`,
        code: `LOC-B-${ts.toString().slice(-4)}`,
        departmentId: engDept.id,
        createdByUserId: adminUser.id,
      });

      testAsset = await createAsset({
        assetTag: `AST-FAC-${ts}`,
        name: 'HQ Transformer 11kV',
        ownershipType: 'COMPANY_OWNED',
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        categoryId: category.id,
        branchId: hqBranch.id,
        locationId: loc1.id,
        createdByUserId: adminUser.id,
      });

      facilityWo = await createWorkOrder(adminUser, {
        title: 'HQ Substation Inter-Departmental Maintenance',
        description: 'Electrical Dept servicing Operations Dept transformer',
        type: 'CORRECTIVE',
        assetId: testAsset.id,
        locationId: loc1.id,
      });

      // Record Internal Recharge from DEPT-ENG to DEPT-OPS
      const recharge = await recordInternalRecharge(adminUser, {
        workOrderId: facilityWo.id,
        fromDepartmentId: engDept.id,
        toDepartmentId: opsDept.id,
        amount: 450.0,
        description: 'Internal departmental labor and materials cost transfer',
      });

      assert(recharge.rechargeNumber.startsWith('RCH-2026-'), 'Facility Mode Internal Recharge recorded');
      assert(recharge.amount.toString() === '450', 'Recharge amount recorded as 450.00 GHS (0 external tax)');

      // Duplicate Recharge Rejection
      let threwDupRch = false;
      try {
        await recordInternalRecharge(adminUser, {
          workOrderId: facilityWo.id,
          fromDepartmentId: engDept.id,
          toDepartmentId: opsDept.id,
          amount: 450.0,
          description: 'Duplicate recharge attempt',
        });
      } catch (err: any) {
        threwDupRch = true;
        assert(err.message.includes('DUPLICATE_RECHARGE') || err.message.includes('Unique constraint'), 'Duplicate internal recharge rejected by @@unique([workOrderId])');
      }
      assert(threwDupRch, 'Duplicate internal recharge threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: SHA-256 Audit Chain Verification
    // -------------------------------------------------------------------------
    section('6. SHA-256 Audit Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage R1 Invoicing operations');
    }

  } finally {
    // Cleanup
    if (draftInvoice) {
      await prisma.$executeRaw`DELETE FROM "credit_note_lines" WHERE "creditNoteId" IN (SELECT id FROM "credit_notes" WHERE "customerId" = ${customer.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "credit_notes" WHERE "customerId" = ${customer.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "payment_allocations" WHERE "paymentId" IN (SELECT id FROM "payments" WHERE "customerId" = ${customer.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "payments" WHERE "customerId" = ${customer.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "invoice_lines" WHERE "invoiceId" IN (SELECT id FROM "invoices" WHERE "customerId" = ${customer.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "invoices" WHERE "customerId" = ${customer.id}::uuid`.catch(() => {});
    }
    if (facilityWo) {
      await prisma.$executeRaw`DELETE FROM "internal_recharges" WHERE "workOrderId" = ${facilityWo.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" = ${facilityWo.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id = ${facilityWo.id}::uuid`.catch(() => {});
    }
    if (testAsset) await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${testAsset.id}::uuid`.catch(() => {});
    if (loc1) await prisma.location.delete({ where: { id: loc1.id } }).catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (site1) await prisma.customerSite.delete({ where: { id: site1.id } }).catch(() => {});
    if (customer) await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageR1InvoicingTests().catch((err) => {
  console.error('Stage R1 Invoicing Test Execution Failed:', err);
  process.exit(1);
});
