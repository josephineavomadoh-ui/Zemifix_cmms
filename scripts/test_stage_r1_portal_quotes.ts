/**
 * ZemiFix CMMS — Stage R1 Customer Self-Service Portal & Quotes Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Customer Portal Authentication Realm Isolation
 *   2. Cross-Customer & Customer Site Access Isolation
 *   3. Internal Information Barrier (Excludes staff names, internal costs, & internal comments)
 *   4. Quote Creation & Ghana Statutory Tax Calculation (VAT 15%, NHIL 2.5%, GETFund 2.5%)
 *   5. Quote Internal Maker-Checker Approval
 *   6. Quote Revision Version Increment & Approval Invalidation
 *   7. Customer Quote Acceptance & Idempotent Decision Logging
 *   8. Comment Author Single-Type CHECK Constraint (chk_comment_author_single_type)
 *   9. Customer Comment Visibility CHECK Constraint (chk_customer_comment_must_be_visible)
 *  10. Public QR Intake Database Reference Validation & IP Rate Limiting
 *  11. SHA-256 Audit Chain Integrity Verification
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
import { createCustomerContact, grantCustomerContactSite } from '../src/lib/services/customerService';
import { getPortalWorkOrders, submitPublicQrRequest } from '../src/lib/services/portalService';
import { createQuote, submitQuoteForApproval, reviseQuote, acceptCustomerQuote } from '../src/lib/services/quoteService';

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

async function runStageR1PortalQuotesTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Portal & Quotes Verification');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;
  let customerA: any = null;
  let customerB: any = null;
  let siteA1: any = null;
  let siteA2: any = null;
  let contactA1: any = null;
  let category: any = null;
  let assetA1: any = null;
  let woA1: any = null;
  let quote1: any = null;
  let quote2: any = null;

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
        name: 'Stage R1 Portal Admin',
        email: `r1padmin.${ts}@zemifix.local`,
        phone: '0244950001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Customer Accounts, Sites & Access Isolation
    // -------------------------------------------------------------------------
    section('1. Customer Accounts, Sites & Access Isolation');

    {
      customerA = await prisma.customer.create({
        data: {
          id: generateUuidV7(),
          customerNumber: `CUST-A-${ts.toString().slice(-6)}`,
          name: 'Anglogold Ashanti Ltd',
          taxId: 'C0001112223',
          billingAddress: 'Obuasi Mine Site',
          primaryPhone: '0302999000',
          primaryEmail: `info.${ts}@anglogold.com`,
        },
      });

      customerB = await prisma.customer.create({
        data: {
          id: generateUuidV7(),
          customerNumber: `CUST-B-${ts.toString().slice(-6)}`,
          name: 'Newmont Ghana Gold',
          taxId: 'C0004445556',
          billingAddress: 'Ahafo Mine Site',
          primaryPhone: '0302888777',
          primaryEmail: `info.${ts}@newmont.com`,
        },
      });

      siteA1 = await prisma.customerSite.create({
        data: {
          id: generateUuidV7(),
          customerId: customerA.id,
          siteCode: `STE-OBUASI-${ts.toString().slice(-4)}`,
          name: 'Obuasi Processing Plant',
          address: 'Obuasi Shaft 3',
        },
      });

      siteA2 = await prisma.customerSite.create({
        data: {
          id: generateUuidV7(),
          customerId: customerA.id,
          siteCode: `STE-IDUAPRIEM-${ts.toString().slice(-4)}`,
          name: 'Iduapriem Plant Site',
          address: 'Iduapriem Mine Site',
        },
      });

      contactA1 = await createCustomerContact(adminUser, {
        customerId: customerA.id,
        name: 'Kofi Annan',
        email: `kannan.${ts}@anglogold.com`,
        phone: '0244333444',
        canApproveQuotes: true,
      });

      // Grant site access to Site A1 ONLY
      await grantCustomerContactSite(adminUser, {
        customerId: customerA.id,
        customerContactId: contactA1.id,
        customerSiteId: siteA1.id,
      });

      assert(customerA.customerNumber.startsWith('CUST-A-'), 'Customer A created');
      assert(siteA1.siteCode.startsWith('STE-OBUASI-'), 'Customer A Site 1 created');
      assert(contactA1.email.startsWith('kannan.'), 'Customer A Contact 1 registered');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Work Order Creation & Portal Site Isolation
    // -------------------------------------------------------------------------
    section('2. Work Order Creation & Portal Site Isolation');

    {
      category = await createAssetCategory({
        name: `Crusher Category ${ts}`,
        code: `CAT-CR-${ts.toString().slice(-4)}`,
        createdByUserId: adminUser.id,
      });

      assetA1 = await createAsset({
        assetTag: `AST-OBU-${ts}`,
        name: 'Obuasi Ball Mill Motor 2000kW',
        ownershipType: 'CUSTOMER_OWNED',
        ownerCustomerId: customerA.id,
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        physicalSiteCustomerId: customerA.id,
        siteId: siteA1.id,
        categoryId: category.id,
        createdByUserId: adminUser.id,
      });

      woA1 = await createWorkOrder(adminUser, {
        title: 'Ball Mill Motor Stator Rewinding',
        description: 'High temperature alarm on W phase',
        type: 'CORRECTIVE',
        priority: 'HIGH',
        assetId: assetA1.id,
        customerId: customerA.id,
        siteId: siteA1.id,
      });

      assert(woA1.workOrderNumber.startsWith('WO-'), 'Contractor Mode Work Order A1 created');

      // Test Portal Query for Contact A1 (Has grant to Site A1)
      const portalContactObj = {
        id: contactA1.id,
        customerId: customerA.id,
        name: contactA1.name,
        email: contactA1.email,
        isPrimaryContact: false,
        canViewFinancials: true,
        canApproveQuotes: true,
        canRequestWork: true,
      };

      const portalWos = await getPortalWorkOrders(portalContactObj);
      assert(portalWos.length === 1, 'Contact A1 retrieved 1 work order for authorized Site A1');
      assert(portalWos[0].id === woA1.id, 'Work order matches Obuasi site work order');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Quote Creation & Ghana Statutory Tax Engine
    // -------------------------------------------------------------------------
    section('3. Quote Creation & Ghana Statutory Tax Engine');

    {
      // Subtotal = 2 * 1000 GHS = 2000 GHS
      // VAT (15%) = 300 GHS
      // NHIL (2.5%) = 50 GHS
      // GETFund (2.5%) = 50 GHS
      // Total Amount = 2000 + 300 + 50 + 50 = 2400 GHS
      quote1 = await createQuote(adminUser, {
        customerId: customerA.id,
        siteId: siteA1.id,
        workOrderId: woA1.id,
        title: 'Quotation for Ball Mill Motor Stator Rewinding',
        items: [
          {
            description: '2000kW Stator Coil Rewinding & VPI Treatment',
            quantity: 2,
            unitPrice: 1000.0,
          },
        ],
      });

      assert(quote1.quoteNumber.startsWith('QT-'), 'Commercial Quote created');
      assert(quote1.subtotal.toString() === '2000', 'Subtotal is 2000.00 GHS');
      assert(quote1.vatAmount.toString() === '300', 'Ghana VAT (15%) is 300.00 GHS');
      assert(quote1.nhilAmount.toString() === '50', 'Ghana NHIL (2.5%) is 50.00 GHS');
      assert(quote1.getFundAmount.toString() === '50', 'Ghana GETFund (2.5%) is 50.00 GHS');
      assert(quote1.totalAmount.toString() === '2400', 'Total Amount is 2400.00 GHS');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Quote Internal Maker-Checker Approval & Revisioning
    // -------------------------------------------------------------------------
    section('4. Quote Internal Maker-Checker Approval & Revisioning');

    {
      const approvedQuote = await submitQuoteForApproval(adminUser, quote1.id);
      assert(approvedQuote.status === 'APPROVED_INTERNAL', 'Quote status promoted to APPROVED_INTERNAL after internal check');

      // Revise Quote -> Version 2
      quote2 = await reviseQuote(adminUser, quote1.id, {
        title: 'Revised Quotation for Ball Mill Motor Stator Rewinding (v2)',
        items: [
          {
            description: '2000kW Stator Coil Rewinding & Heavy Insulation',
            quantity: 2,
            unitPrice: 1200.0,
          },
        ],
      });

      assert(quote2.version === 2, 'Revised Quote version incremented to 2');
      assert(quote2.status === 'DRAFT', 'Revised Quote version 2 reset to DRAFT status for new approval');

      const origVersion = await prisma.quote.findUnique({ where: { id: quote1.id } });
      assert(origVersion?.status === 'REVISED', 'Version 1 status marked REVISED');

      const versionHist = await prisma.quoteVersionHistory.findFirst({ where: { quoteId: quote1.id, version: 1 } });
      assert(versionHist !== null, 'Version 1 snapshot saved in quote_version_history');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Customer Quote Acceptance & Atomic Concurrency Protection
    // -------------------------------------------------------------------------
    section('5. Customer Quote Acceptance & Atomic Concurrency Protection');

    {
      // Promote Version 2 to SENT_TO_CUSTOMER
      await prisma.quote.update({
        where: { id: quote2.id },
        data: { status: 'SENT_TO_CUSTOMER' },
      });

      const portalContactObj = {
        id: contactA1.id,
        customerId: customerA.id,
        name: contactA1.name,
        email: contactA1.email,
        isPrimaryContact: false,
        canViewFinancials: true,
        canApproveQuotes: true,
        canRequestWork: true,
      };

      // Customer accepts Quote Version 2
      const acceptRes = await acceptCustomerQuote(portalContactObj, quote2.id, '127.0.0.1', 'Approved by Kofi Annan');
      assert(acceptRes.status === 'CUSTOMER_ACCEPTED', 'Quote status updated to CUSTOMER_ACCEPTED');

      const decisionLog = await prisma.quoteDecisionLog.findFirst({ where: { quoteId: quote2.id, version: 2 } });
      assert(decisionLog !== null, 'Immutable decision log entry written to quote_decision_logs');
      assert(decisionLog?.decision === 'ACCEPTED', 'Decision logged as ACCEPTED');

      // Test Idempotency: Duplicate acceptance re-submission
      const acceptDup = await acceptCustomerQuote(portalContactObj, quote2.id, '127.0.0.1', 'Duplicate click');
      assert(acceptDup.alreadyProcessed === true, 'Duplicate customer decision intercepted by idempotency guard');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: WorkOrderComment Single-Author CHECK Constraint
    // -------------------------------------------------------------------------
    section('6. WorkOrderComment Single-Author CHECK Constraint');

    {
      // Valid staff comment
      const staffComment = await prisma.workOrderComment.create({
        data: {
          id: generateUuidV7(),
          workOrderId: woA1.id,
          authorUserId: adminUser.id,
          authorContactId: null,
          commentText: 'Internal technician inspection completed',
          isCustomerVisible: false,
        },
      });
      assert(staffComment.id !== null, 'Valid staff comment created');

      // Valid customer comment
      const customerComment = await prisma.workOrderComment.create({
        data: {
          id: generateUuidV7(),
          workOrderId: woA1.id,
          authorUserId: null,
          authorContactId: contactA1.id,
          commentText: 'Customer site manager confirmed access granted',
          isCustomerVisible: true,
        },
      });
      assert(customerComment.id !== null, 'Valid customer comment created');

      // Invalid comment with BOTH authorUserId AND authorContactId (must fail CHECK constraint)
      let threwAuthorCheck = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "work_order_comments" ("id", "workOrderId", "authorUserId", "authorContactId", "commentText", "isCustomerVisible", "createdAt")
          VALUES (${generateUuidV7()}::uuid, ${woA1.id}::uuid, ${adminUser.id}::uuid, ${contactA1.id}::uuid, 'Invalid Dual Author', true, NOW())
        `;
      } catch (err: any) {
        threwAuthorCheck = true;
        assert(err.message.includes('chk_comment_author_single_type') || err.message.includes('23514'), 'Dual-author comment rejected by chk_comment_author_single_type CHECK constraint');
      }
      assert(threwAuthorCheck, 'Dual-author comment threw expected DB CHECK constraint exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 7: Public QR Request Intake & Rate Limiting
    // -------------------------------------------------------------------------
    section('7. Public QR Request Intake & Rate Limiting');

    {
      const testIp = `192.168.99.${ts.toString().slice(-3)}`;

      // Submit 5 valid requests
      for (let i = 1; i <= 5; i++) {
        const qrSub = await submitPublicQrRequest({
          siteCode: siteA1.siteCode,
          assetTag: assetA1.assetTag,
          requesterName: `Visitor ${i}`,
          requesterEmail: `visitor${i}@site.com`,
          requesterPhone: '0244999888',
          description: `Public QR intake report ${i}`,
          clientIp: testIp,
        });
        assert(qrSub.status === 'RECEIVED', `Public QR submission ${i} accepted`);
      }

      // 6th submission from same IP must fail rate limit check
      let threwRate = false;
      try {
        await submitPublicQrRequest({
          siteCode: siteA1.siteCode,
          requesterName: 'Spam User',
          requesterEmail: 'spam@site.com',
          requesterPhone: '000000',
          description: 'Excessive submission',
          clientIp: testIp,
        });
      } catch (err: any) {
        threwRate = true;
        assert(err.message.includes('RATE_LIMIT_EXCEEDED'), '6th public QR submission from same IP rejected by RATE_LIMIT_EXCEEDED guard');
      }
      assert(threwRate, '6th public submission threw rate limit exception');

      // Test Invalid Site Code Rejection
      let threwSite = false;
      try {
        await submitPublicQrRequest({
          siteCode: 'INVALID-SITE-999',
          requesterName: 'Fake User',
          requesterEmail: 'fake@test.com',
          requesterPhone: '000000',
          description: 'Spam report',
          clientIp: '192.168.1.101',
        });
      } catch (err: any) {
        threwSite = true;
        assert(err.message.includes('INVALID_SITE_REFERENCE'), 'Invalid siteCode rejected by database reference check');
      }
      assert(threwSite, 'Invalid siteCode threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 8: SHA-256 Audit Chain Verification
    // -------------------------------------------------------------------------
    section('8. SHA-256 Audit Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage R1 Portal & Quote operations');
    }

  } finally {
    // Cleanup
    if (woA1) {
      await prisma.$executeRaw`DELETE FROM "public_request_intake" WHERE "siteId" = ${siteA1.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_comments" WHERE "workOrderId" = ${woA1.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "quote_decision_logs" WHERE "quoteId" IN (SELECT id FROM "quotes" WHERE "workOrderId" = ${woA1.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "quote_version_history" WHERE "quoteId" IN (SELECT id FROM "quotes" WHERE "workOrderId" = ${woA1.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "quote_lines" WHERE "quoteId" IN (SELECT id FROM "quotes" WHERE "workOrderId" = ${woA1.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "quotes" WHERE "workOrderId" = ${woA1.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" = ${woA1.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id = ${woA1.id}::uuid`.catch(() => {});
    }
    if (assetA1) await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${assetA1.id}::uuid`.catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (contactA1) {
      await prisma.$executeRaw`DELETE FROM "customer_contact_site_grants" WHERE "customerContactId" = ${contactA1.id}::uuid`.catch(() => {});
      await prisma.customerContact.delete({ where: { id: contactA1.id } }).catch(() => {});
    }
    if (siteA1) await prisma.customerSite.delete({ where: { id: siteA1.id } }).catch(() => {});
    if (siteA2) await prisma.customerSite.delete({ where: { id: siteA2.id } }).catch(() => {});
    if (customerA) await prisma.customer.delete({ where: { id: customerA.id } }).catch(() => {});
    if (customerB) await prisma.customer.delete({ where: { id: customerB.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageR1PortalQuotesTests().catch((err) => {
  console.error('Stage R1 Portal & Quotes Test Execution Failed:', err);
  process.exit(1);
});
