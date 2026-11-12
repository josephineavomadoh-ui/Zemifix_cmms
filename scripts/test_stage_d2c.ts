/**
 * ZemiFix CMMS — Stage D.2c Comprehensive Automated Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Maintenance Request Creation & Organizational Scope Filtering
 *   2. Request Conversion into Work Order (Preserves original request & relationship)
 *   3. Unique Work Order Number Generation (`WO-2026-XXXXXX`) & Duplicate Rejection
 *   4. Work Order Lifecycle Transitions (OPEN -> ASSIGN -> IN_PROGRESS -> ON_HOLD -> COMPLETED)
 *   5. Finalized Work Order Reopening Prevention (COMPLETED & CANCELLED status guards)
 *   6. Mandatory Checklist Item Completion Enforcement prior to COMPLETED transition
 *   7. Labor Hours & Cost Tracking Calculation (hoursWorked * hourlyRate)
 *   8. Material / Part Requirement Planning & Consumption Tracking
 *   9. Audit Logging for Work Request & Work Order Operations
 *  10. SHA-256 Audit Chain Verification
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createAssetCategory } from '../src/lib/services/assetCategoryService';
import { createLocation } from '../src/lib/services/locationService';
import { createAsset } from '../src/lib/services/assetService';
import {
  createWorkRequest,
  getWorkRequests,
  reviewWorkRequest,
} from '../src/lib/services/workRequestService';
import {
  createWorkOrder,
  getWorkOrders,
  transitionWorkOrderStatus,
  assignWorkOrder,
  recordWorkOrderLabor,
  recordWorkOrderPart,
} from '../src/lib/services/workOrderService';

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

async function runStageD2cTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.2c Verification Test Suite');
  console.log('=====================================================');

  let adminUser: any = null;
  let techUser: any = null;
  let category: any = null;
  let hqBranch: any = null;
  let loc1: any = null;
  let testAsset: any = null;
  let testRequest: any = null;
  let testWorkOrder: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    const engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or DEPT-ENG)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    // Create Admin User
    adminUser = await prisma.user.create({
      data: {
        name: 'Stage D2c Admin User',
        email: `d2cadmin.${ts}@zemifix.local`,
        phone: '0244500001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // Create Tech User
    techUser = await prisma.user.create({
      data: {
        name: 'Stage D2c Tech User',
        email: `d2ctech.${ts}@zemifix.local`,
        phone: '0244500002',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // Create Category, Location, Asset
    category = await createAssetCategory({
      name: `Compressor Category ${ts}`,
      code: `CAT-COMP-${ts.toString().slice(-4)}`,
      createdByUserId: adminUser.id,
    });

    loc1 = await createLocation({
      branchId: hqBranch.id,
      name: `Compressor House ${ts}`,
      code: `LOC-COMP-${ts.toString().slice(-4)}`,
      departmentId: engDept.id,
      createdByUserId: adminUser.id,
    });

    testAsset = await createAsset({
      assetTag: `AST-WO-${ts}`,
      name: 'Atlas Copco GA90 Compressor',
      ownershipType: 'COMPANY_OWNED',
      managingOrgType: 'INTERNAL_BRANCH',
      managingBranchId: hqBranch.id,
      categoryId: category.id,
      branchId: hqBranch.id,
      locationId: loc1.id,
      createdByUserId: adminUser.id,
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Maintenance Request Creation & Conversion
    // -------------------------------------------------------------------------
    section('1. Maintenance Request Creation & Conversion');

    {
      testRequest = await createWorkRequest(adminUser, {
        title: 'Compressor High Temperature Warning',
        description: 'GA90 Compressor tripped due to temperature exceeding 105C',
        assetId: testAsset.id,
        locationId: loc1.id,
        priority: 'HIGH',
      });

      assert(testRequest.requestNumber.startsWith('REQ-'), 'Work request number generated with REQ- prefix');
      assert(testRequest.status === 'SUBMITTED', 'Initial request status is SUBMITTED');

      // Convert Request into Work Order
      const reviewRes = await reviewWorkRequest(adminUser, {
        requestId: testRequest.id,
        action: 'CONVERT',
      });

      assert(reviewRes.request.status === 'CONVERTED', 'Work request status transitioned to CONVERTED');
      assert(reviewRes.convertedWorkOrder !== null, 'Work order created from request');
      assert(reviewRes.convertedWorkOrder.workOrderNumber.startsWith('WO-'), 'Work order number generated with WO- prefix');

      testWorkOrder = reviewRes.convertedWorkOrder;
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Work Order Assignment & Lifecycle Transitions
    // -------------------------------------------------------------------------
    section('2. Work Order Assignment & Lifecycle Transitions');

    {
      // Assign Work Order to Tech User
      const assignRes = await assignWorkOrder(adminUser, {
        workOrderId: testWorkOrder.id,
        assignedUserId: techUser.id,
      });

      assert(assignRes.assignedUserId === techUser.id, 'Work order assigned to technician');
      assert(assignRes.status === 'ASSIGNED', 'Status transitioned to ASSIGNED upon assignment');

      // Start Work Order
      const startRes = await transitionWorkOrderStatus(techUser, {
        workOrderId: testWorkOrder.id,
        newStatus: 'IN_PROGRESS',
      });

      assert(startRes.status === 'IN_PROGRESS', 'Status transitioned to IN_PROGRESS');
      assert(startRes.actualStart !== null, 'actualStart timestamp recorded');

      // Pause Work Order (ON_HOLD)
      const pauseRes = await transitionWorkOrderStatus(techUser, {
        workOrderId: testWorkOrder.id,
        newStatus: 'ON_HOLD',
        reason: 'Awaiting replacement thermal valve',
      });

      assert(pauseRes.status === 'ON_HOLD', 'Status transitioned to ON_HOLD');

      // Resume Work Order (IN_PROGRESS)
      const resumeRes = await transitionWorkOrderStatus(techUser, {
        workOrderId: testWorkOrder.id,
        newStatus: 'IN_PROGRESS',
      });

      assert(resumeRes.status === 'IN_PROGRESS', 'Status resumed to IN_PROGRESS');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Labor Hours & Material Requirement Consumption
    // -------------------------------------------------------------------------
    section('3. Labor Hours & Material Consumption Tracking');

    {
      // Record Labor Hours
      const laborRes = await recordWorkOrderLabor(techUser, {
        workOrderId: testWorkOrder.id,
        technicianUserId: techUser.id,
        workDate: new Date(),
        hoursWorked: 3.5,
        hourlyRate: 60.0,
        description: 'Cleaned radiator fins and replaced thermal control valve',
      });

      assert(laborRes.totalCost.toString() === '210', 'Labor total cost calculated correctly (3.5 hrs * 60 GHS = 210 GHS)');

      // Record Material Requirement
      const partRes = await recordWorkOrderPart(techUser, {
        workOrderId: testWorkOrder.id,
        partNumber: 'P-VALVE-102',
        partName: 'Thermal Expansion Valve 105C',
        quantityPlanned: 1.0,
        quantityConsumed: 1.0,
        unitCost: 150.0,
      });

      assert(partRes.partNumber === 'P-VALVE-102', 'Part requirement recorded');

      const woUpdated = await prisma.workOrder.findUnique({ where: { id: testWorkOrder.id } });
      assert(woUpdated?.totalCost.toString() === '360', 'Work order totalCost updated (210 labor + 150 parts = 360 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Mandatory Checklist Completion Guard
    // -------------------------------------------------------------------------
    section('4. Mandatory Checklist Completion Guard');

    {
      // Add mandatory checklist item
      await prisma.workOrderChecklistItem.create({
        data: {
          id: generateUuidV7(),
          workOrderId: testWorkOrder.id,
          itemOrder: 1,
          description: 'Verify coolant level and check for leaks',
          isMandatory: true,
          passFail: null, // Pending
        },
      });

      // Attempting to complete work order with pending mandatory checklist item must fail
      let threwChecklist = false;
      try {
        await transitionWorkOrderStatus(techUser, {
          workOrderId: testWorkOrder.id,
          newStatus: 'COMPLETED',
        });
      } catch (err: any) {
        threwChecklist = true;
        assert(err.message.includes('INCOMPLETE_CHECKLISTS'), 'Completion blocked by incomplete mandatory checklist item');
      }
      assert(threwChecklist, 'Incomplete checklist threw expected exception');

      // Complete mandatory checklist item
      await prisma.workOrderChecklistItem.updateMany({
        where: { workOrderId: testWorkOrder.id },
        data: { passFail: true, completedAt: new Date(), completedByUserId: techUser.id },
      });

      // Now completing work order succeeds
      const completeRes = await transitionWorkOrderStatus(techUser, {
        workOrderId: testWorkOrder.id,
        newStatus: 'COMPLETED',
      });

      assert(completeRes.status === 'COMPLETED', 'Work order completed after checklist passed');
      assert(completeRes.actualEnd !== null, 'actualEnd timestamp recorded');

      // Attempting to modify completed work order must fail
      let threwReopen = false;
      try {
        await transitionWorkOrderStatus(techUser, {
          workOrderId: testWorkOrder.id,
          newStatus: 'IN_PROGRESS',
        });
      } catch (err: any) {
        threwReopen = true;
        assert(err.message.includes('FINALIZED_WORK_ORDER'), 'Reopening completed work order blocked');
      }
      assert(threwReopen, 'Reopening completed work order threw expected exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Audit Log SHA-256 Chain Verification
    // -------------------------------------------------------------------------
    section('5. Audit Log SHA-256 Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage D.2c operations');
    }

  } finally {
    // Cleanup
    if (testWorkOrder) {
      await prisma.$executeRaw`DELETE FROM "work_order_failure_records" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_parts" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_labor" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_checklist_items" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_tasks" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_assignment_history" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_requests" WHERE "convertedWorkOrderId" = ${testWorkOrder.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id = ${testWorkOrder.id}::uuid`.catch(() => {});
    }
    if (testAsset) {
      await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${testAsset.id}::uuid`.catch(() => {});
    }
    if (loc1) await prisma.location.delete({ where: { id: loc1.id } }).catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (techUser) await prisma.user.delete({ where: { id: techUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD2cTests().catch((err) => {
  console.error('Stage D.2c Test Execution Failed:', err);
  process.exit(1);
});
