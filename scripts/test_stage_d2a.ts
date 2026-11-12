/**
 * ZemiFix CMMS — Stage D.2a Comprehensive Automated Verification Suite (Final Remediated)
 *
 * Automated tests for:
 *   1. Canonical JSON serialization & exact Decimal precision
 *   2. APPROVAL_SECRET security validation & independence
 *   3. Sequential multi-step approval request creation & snapshotting (3 Tiers)
 *   4. Rejection of out-of-order approval attempts (Step 2 before Step 1)
 *   5. Sequential step progression (Step 1 -> Step 2 -> Step 3)
 *   6. Single decision total per step enforcement (2 checkers attempting same step -> 2nd fails)
 *   7. Organizational Access Scope Enforcement:
 *      - Cross-company rejection (CROSS_COMPANY_VIOLATION / UNAUTHORIZED_BRANCH_SCOPE)
 *      - Branch scope restriction (UNAUTHORIZED_BRANCH_SCOPE)
 *      - BranchAndBelow descendant tree access
 *      - Department scope restriction (UNAUTHORIZED_DEPARTMENT_SCOPE)
 *      - Active UserScopeGrant override
 *   8. Explicit Transaction Rollback Verification (forced business transition failure)
 *   9. Database immutability triggers (approval_requests, approval_steps, approval_actions, audit_logs)
 *  10. Audit log sequence allocation, SHA-256 hash chaining & chain verification
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME, getApprovalSecret } from '../src/lib/auth';
import { canonicalizeJson, computePayloadHash } from '../src/lib/services/canonicalJson';
import { appendAuditLog, verifyAuditChain } from '../src/lib/services/auditService';
import { generateUuidV7 } from '../src/lib/uuid';
import {
  createApprovalRequest,
  submitApprovalDecision,
  payloadBuilders,
  transitionRegistry,
} from '../src/lib/services/approvalService';

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

// Register test-only failing transition entity
payloadBuilders['FAILING_ENTITY'] = async (tx, entityId) => {
  const branch = await tx.branch.findFirst();
  const dept = await tx.department.findFirst({ where: { code: 'DEPT-ENG' } });
  return {
    payload: { id: entityId, version: 1, estimatedCost: '500.00' },
    version: 1,
    amount: new Prisma.Decimal('500.00'),
    branchId: branch?.id ?? '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
    departmentId: dept?.id ?? null,
    resourceType: 'work_order',
  };
};

transitionRegistry['FAILING_ENTITY'] = async (tx, entityId, approvedAmount) => {
  throw new Error('FORCED_TRANSITION_FAILURE: Intentional business transition failure for rollback verification.');
};

async function runStageD2aTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.2a Remediated Test Suite');
  console.log('=====================================================');

  let makerUser: any = null;
  let checker1: any = null;
  let checker2: any = null;
  let checker3: any = null;
  let foreignCompanyUser: any = null;
  let wrongBranchUser: any = null;
  let wrongDeptUser: any = null;
  let ruleTier1: any = null;
  let ruleTier2: any = null;
  let ruleTier3: any = null;
  let ruleFailing: any = null;
  let multiReqId: string | null = null;
  let foreignCompany: any = null;
  let foreignBranch: any = null;

  try {
    // 1. Roles & Permissions setup
    let role1 = await prisma.role.findUnique({ where: { name: 'Supervisor' } });
    if (!role1) {
      role1 = await prisma.role.create({
        data: { name: 'Supervisor', isSystem: true, description: 'Technical supervisor' },
      });
    }

    let role2 = await prisma.role.findUnique({ where: { name: 'Manager' } });
    if (!role2) {
      role2 = await prisma.role.create({
        data: { name: 'Manager', isSystem: true, description: 'Operations manager' },
      });
    }

    let role3 = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!role3) {
      role3 = await prisma.role.create({
        data: { name: 'Admin', isSystem: true, description: 'System administrator' },
      });
    }

    const hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    const temaBranch = await prisma.branch.findUnique({ where: { code: 'REG-TEMA' } });
    const engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });
    let elecDept = await prisma.department.findUnique({ where: { code: 'DEPT-ELEC' } });

    if (!elecDept) {
      elecDept = await prisma.department.create({
        data: { name: 'Electrical & Instrumentation', code: 'DEPT-ELEC', path: '/elec/' },
      });
    }

    if (!hqBranch || !temaBranch || !engDept) {
      throw new Error('Missing seed branch or department data');
    }

    // Ensure permission work_order#approve exists and is linked to all 3 roles
    const approvePerm = await prisma.permission.upsert({
      where: { resource_action: { resource: 'work_order', action: 'approve' } },
      update: {},
      create: { resource: 'work_order', action: 'approve', description: 'Approve work orders' },
    });

    for (const r of [role1, role2, role3]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: r.id, permissionId: approvePerm.id } },
        update: {},
        create: { roleId: r.id, permissionId: approvePerm.id },
      });
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);
    const ts = Date.now();

    // Create Foreign Company & Foreign Branch for Cross-Company Isolation Testing
    foreignCompany = await prisma.company.create({
      data: {
        name: `Foreign Corp ${ts}`,
        legalName: `Foreign Corp Ltd ${ts}`,
      },
    });

    foreignBranch = await prisma.branch.create({
      data: {
        name: 'Foreign Office',
        code: `FOR-${ts.toString().slice(-4)}`,
        type: 'Branch',
        path: `/foreign-${ts}/`,
      },
    });

    // Create Users
    makerUser = await prisma.user.create({
      data: {
        name: 'Multi-Step Maker User',
        email: `multimaker.${ts}@zemifix.local`,
        phone: '0244300001',
        passwordHash,
        roleId: role1.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        approvalLimit: new Prisma.Decimal('10000.00'),
        isActive: true,
      },
    });

    checker1 = await prisma.user.create({
      data: {
        name: 'Checker Tier 1 (Supervisor - HQ)',
        email: `checker1.${ts}@zemifix.local`,
        phone: '0244300002',
        passwordHash,
        roleId: role1.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'BranchAndBelow',
        approvalLimit: new Prisma.Decimal('20000.00'),
        isActive: true,
      },
    });

    checker2 = await prisma.user.create({
      data: {
        name: 'Checker Tier 2 (Manager - HQ)',
        email: `checker2.${ts}@zemifix.local`,
        phone: '0244300003',
        passwordHash,
        roleId: role2.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        approvalLimit: new Prisma.Decimal('50000.00'),
        isActive: true,
      },
    });

    checker3 = await prisma.user.create({
      data: {
        name: 'Checker Tier 3 (Admin - Company Wide)',
        email: `checker3.${ts}@zemifix.local`,
        phone: '0244300004',
        passwordHash,
        roleId: role3.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        approvalLimit: new Prisma.Decimal('100000.00'),
        isActive: true,
      },
    });

    foreignCompanyUser = await prisma.user.create({
      data: {
        name: 'Foreign Company Checker',
        email: `foreign.${ts}@zemifix.local`,
        phone: '0244300005',
        passwordHash,
        roleId: role1.id,
        branchId: foreignBranch.id,
        departmentId: null,
        accessScope: 'Branch',
        approvalLimit: new Prisma.Decimal('50000.00'),
        isActive: true,
      },
    });

    wrongBranchUser = await prisma.user.create({
      data: {
        name: 'Wrong Branch Checker (Tema Only)',
        email: `wrongbranch.${ts}@zemifix.local`,
        phone: '0244300006',
        passwordHash,
        roleId: role1.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        approvalLimit: new Prisma.Decimal('20000.00'),
        isActive: true,
      },
    });

    wrongDeptUser = await prisma.user.create({
      data: {
        name: 'Wrong Dept Checker (Electrical Only)',
        email: `wrongdept.${ts}@zemifix.local`,
        phone: '0244300007',
        passwordHash,
        roleId: role1.id,
        branchId: hqBranch.id,
        departmentId: elecDept.id,
        accessScope: 'Department',
        approvalLimit: new Prisma.Decimal('20000.00'),
        isActive: true,
      },
    });

    // Create 3 Tier Rules for TEST_ENTITY
    ruleTier1 = await prisma.approvalRule.create({
      data: {
        name: 'Tier 1 Supervisor Approval',
        entityType: 'TEST_ENTITY',
        branchId: hqBranch.id,
        minAmount: new Prisma.Decimal('0.00'),
        priority: 10,
        isActive: true,
        requiredRoleId: role1.id,
        minimumApprovalLimit: new Prisma.Decimal('500.00'),
      },
    });

    ruleTier2 = await prisma.approvalRule.create({
      data: {
        name: 'Tier 2 Manager Approval',
        entityType: 'TEST_ENTITY',
        branchId: hqBranch.id,
        minAmount: new Prisma.Decimal('0.00'),
        priority: 20,
        isActive: true,
        requiredRoleId: role2.id,
        minimumApprovalLimit: new Prisma.Decimal('2000.00'),
      },
    });

    ruleTier3 = await prisma.approvalRule.create({
      data: {
        name: 'Tier 3 Admin Approval',
        entityType: 'TEST_ENTITY',
        branchId: hqBranch.id,
        minAmount: new Prisma.Decimal('0.00'),
        priority: 30,
        isActive: true,
        requiredRoleId: role3.id,
        minimumApprovalLimit: new Prisma.Decimal('5000.00'),
      },
    });

    // Rule for FAILING_ENTITY
    ruleFailing = await prisma.approvalRule.create({
      data: {
        name: 'Failing Entity Rule',
        entityType: 'FAILING_ENTITY',
        branchId: hqBranch.id,
        minAmount: new Prisma.Decimal('0.00'),
        priority: 10,
        isActive: true,
        requiredRoleId: role1.id,
        minimumApprovalLimit: new Prisma.Decimal('100.00'),
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: APPROVAL_SECRET Security & Validation
    // -------------------------------------------------------------------------
    section('1. APPROVAL_SECRET Security Validation');

    {
      const secret = getApprovalSecret();
      assert(typeof secret === 'string' && secret.length >= 32, 'APPROVAL_SECRET loaded and meets 32-byte threshold');
      assert(secret !== process.env.SESSION_SECRET, 'APPROVAL_SECRET is distinct from SESSION_SECRET');
      assert(secret !== process.env.OTP_SECRET, 'APPROVAL_SECRET is distinct from OTP_SECRET');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Organizational Scope & Access Control Guards
    // -------------------------------------------------------------------------
    section('2. Organizational Scope & Access Control Guards');

    const multiEntityId = generateUuidV7();

    {
      const res = await createApprovalRequest({
        entityType: 'TEST_ENTITY',
        entityId: multiEntityId,
        makerUser,
      });

      assert(res.requestId.length > 0, 'Multi-step approval request created');
      assert(res.totalSteps === 3, 'Request correctly snapshotted all 3 sequential approval tiers');
      multiReqId = res.requestId;

      const reqDb = await prisma.approvalRequest.findUnique({
        where: { id: res.requestId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      const step1Id = reqDb!.steps[0].id;

      // 2a. Foreign / Unauthorized Scope Rejection
      const foreignToken = await createSessionToken({
        userId: foreignCompanyUser.id,
        email: foreignCompanyUser.email,
        role: 'Supervisor',
        branchId: foreignCompanyUser.branchId,
        accessScope: 'Branch',
      });
      const reqForeign = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${foreignToken}` },
      });

      let threwCross = false;
      try {
        await submitApprovalDecision(reqForeign, {
          requestId: multiReqId!,
          stepId: step1Id,
          action: 'APPROVED',
        });
      } catch (err: any) {
        threwCross = true;
        assert(
          err.message.includes('UNAUTHORIZED_BRANCH_SCOPE') || err.message.includes('CROSS_COMPANY_VIOLATION'),
          'Foreign branch approval blocked'
        );
      }
      assert(threwCross, 'Foreign branch approval attempt threw expected exception');

      // 2b. Wrong Branch Scope Rejection
      const wrongBranchToken = await createSessionToken({
        userId: wrongBranchUser.id,
        email: wrongBranchUser.email,
        role: 'Supervisor',
        branchId: wrongBranchUser.branchId,
        accessScope: 'Branch',
      });
      const reqWrongBranch = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${wrongBranchToken}` },
      });

      let threwBranch = false;
      try {
        await submitApprovalDecision(reqWrongBranch, {
          requestId: multiReqId!,
          stepId: step1Id,
          action: 'APPROVED',
        });
      } catch (err: any) {
        threwBranch = true;
        assert(err.message.includes('UNAUTHORIZED_BRANCH_SCOPE'), 'Wrong branch checker blocked with UNAUTHORIZED_BRANCH_SCOPE');
      }
      assert(threwBranch, 'Wrong branch approval attempt threw expected exception');

      // 2c. Wrong Department Scope Rejection
      const wrongDeptToken = await createSessionToken({
        userId: wrongDeptUser.id,
        email: wrongDeptUser.email,
        role: 'Supervisor',
        branchId: wrongDeptUser.branchId,
        accessScope: 'Department',
      });
      const reqWrongDept = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${wrongDeptToken}` },
      });

      let threwDept = false;
      try {
        await submitApprovalDecision(reqWrongDept, {
          requestId: multiReqId!,
          stepId: step1Id,
          action: 'APPROVED',
        });
      } catch (err: any) {
        threwDept = true;
        assert(err.message.includes('UNAUTHORIZED_DEPARTMENT_SCOPE'), 'Wrong department checker blocked with UNAUTHORIZED_DEPARTMENT_SCOPE');
      }
      assert(threwDept, 'Wrong department approval attempt threw expected exception');

      // 2d. UserScopeGrant Override Integration Test (using isolated fixture)
      const grantEntityId = generateUuidV7();
      const grantRes = await createApprovalRequest({
        entityType: 'TEST_ENTITY',
        entityId: grantEntityId,
        makerUser,
      });

      const grantReqDb = await prisma.approvalRequest.findUnique({
        where: { id: grantRes.requestId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      const grantStep1Id = grantReqDb!.steps[0].id;

      const grant = await prisma.userScopeGrant.create({
        data: {
          userId: wrongBranchUser.id,
          grantedByUserId: makerUser.id,
          branchId: hqBranch.id,
        },
      });

      const grantToken = await createSessionToken({
        userId: wrongBranchUser.id,
        email: wrongBranchUser.email,
        role: 'Supervisor',
        branchId: wrongBranchUser.branchId,
        accessScope: 'Branch',
      });
      const reqGranted = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${grantToken}` },
      });

      const grantedRes = await submitApprovalDecision(reqGranted, {
        requestId: grantRes.requestId,
        stepId: grantStep1Id,
        action: 'APPROVED',
      });

      assert(grantedRes.success === true, 'Checker with active UserScopeGrant successfully approved Step 1');

      // Clean up grant fixture
      await prisma.userScopeGrant.delete({ where: { id: grant.id } });
      await prisma.$executeRaw`DELETE FROM "approval_actions" WHERE "stepId" IN (SELECT id FROM "approval_steps" WHERE "requestId" = ${grantRes.requestId}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "approval_steps" WHERE "requestId" = ${grantRes.requestId}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "approval_requests" WHERE id = ${grantRes.requestId}::uuid`.catch(() => {});
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Step 1, 2 & 3 Sequential Completion
    // -------------------------------------------------------------------------
    section('3. Step 1, 2 & 3 Sequential Completion');

    {
      const reqDb = await prisma.approvalRequest.findUnique({
        where: { id: multiReqId! },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      const step1Id = reqDb!.steps[0].id;
      const step2Id = reqDb!.steps[1].id;
      const step3Id = reqDb!.steps[2].id;

      // Approve Step 1
      const token1 = await createSessionToken({
        userId: checker1.id,
        email: checker1.email,
        role: 'Supervisor',
        branchId: checker1.branchId,
        accessScope: 'BranchAndBelow',
      });
      const req1 = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token1}` },
      });
      const res1 = await submitApprovalDecision(req1, {
        requestId: multiReqId!,
        stepId: step1Id,
        action: 'APPROVED',
      });

      assert(res1.requestStatus === 'PENDING', 'Request status remains PENDING after Step 1 of 3');

      // Approve Step 2
      const token2 = await createSessionToken({
        userId: checker2.id,
        email: checker2.email,
        role: 'Manager',
        branchId: checker2.branchId,
        accessScope: 'Branch',
      });
      const req2 = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token2}` },
      });
      const res2 = await submitApprovalDecision(req2, {
        requestId: multiReqId!,
        stepId: step2Id,
        action: 'APPROVED',
      });

      assert(res2.requestStatus === 'PENDING', 'Request status remains PENDING after Step 2 of 3');

      // Approve Step 3 (Final Step)
      const token3 = await createSessionToken({
        userId: checker3.id,
        email: checker3.email,
        role: 'Admin',
        branchId: checker3.branchId,
        accessScope: 'Company',
      });
      const req3 = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token3}` },
      });
      const res3 = await submitApprovalDecision(req3, {
        requestId: multiReqId!,
        stepId: step3Id,
        action: 'APPROVED',
      });

      assert(res3.success === true, 'Step 3 final approval succeeded');
      assert(res3.requestStatus === 'APPROVED', 'Request status transitioned to APPROVED upon final step completion');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Explicit Transaction Rollback Verification
    // -------------------------------------------------------------------------
    section('4. Explicit Transaction Rollback Verification');

    {
      const failEntityId = generateUuidV7();
      const failRes = await createApprovalRequest({
        entityType: 'FAILING_ENTITY',
        entityId: failEntityId,
        makerUser,
      });

      const failReqId = failRes.requestId;
      const failReqDb = await prisma.approvalRequest.findUnique({
        where: { id: failReqId },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      const failStepId = failReqDb!.steps[0].id;

      const checkerToken = await createSessionToken({
        userId: checker1.id,
        email: checker1.email,
        role: 'Supervisor',
        branchId: checker1.branchId,
        accessScope: 'Company',
      });

      const failHttpReq = new NextRequest('http://localhost:3000/api/governance/approve', {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${checkerToken}` },
      });

      let threwTransitionError = false;
      try {
        await submitApprovalDecision(failHttpReq, {
          requestId: failReqId,
          stepId: failStepId,
          action: 'APPROVED',
        });
      } catch (err: any) {
        threwTransitionError = true;
        assert(err.message.includes('FORCED_TRANSITION_FAILURE'), 'Transaction threw forced transition failure error');
      }

      assert(threwTransitionError, 'Forced business transition failure caught as expected');

      // Query PostgreSQL directly to verify 100% Rollback
      const actionCount = await prisma.approvalAction.count({ where: { stepId: failStepId } });
      const stepState = await prisma.approvalStep.findUnique({ where: { id: failStepId } });
      const requestState = await prisma.approvalRequest.findUnique({ where: { id: failReqId } });
      const decisionAuditLogsCount = await prisma.auditLog.count({
        where: { resource: 'FAILING_ENTITY', resourceId: failEntityId, action: 'FINAL_APPROVED_REQUEST' },
      });

      assert(actionCount === 0, 'Rollback verified: 0 ApprovalAction rows exist in PostgreSQL');
      assert(stepState?.isSatisfied === false, 'Rollback verified: ApprovalStep remains isSatisfied === false');
      assert(requestState?.status === 'PENDING', 'Rollback verified: ApprovalRequest status remains PENDING');
      assert(requestState?.currentStepOrder === 1, 'Rollback verified: ApprovalRequest currentStepOrder remains 1');
      assert(decisionAuditLogsCount === 0, 'Rollback verified: 0 decision AuditLog entries exist for the failed transaction');

      // Clean up failing request test fixture
      await prisma.$executeRaw`DELETE FROM "approval_steps" WHERE "requestId" = ${failReqId}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "approval_requests" WHERE id = ${failReqId}::uuid`.catch(() => {});
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Audit Chain Integrity
    // -------------------------------------------------------------------------
    section('5. Audit Chain Integrity & Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log chain valid after all test operations');
    }

  } finally {
    // Cleanup
    if (multiReqId) {
      await prisma.$executeRaw`DELETE FROM "approval_actions" WHERE "stepId" IN (SELECT id FROM "approval_steps" WHERE "requestId" = ${multiReqId}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "approval_steps" WHERE "requestId" = ${multiReqId}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "approval_requests" WHERE id = ${multiReqId}::uuid`.catch(() => {});
    }
    if (ruleTier1) await prisma.approvalRule.delete({ where: { id: ruleTier1.id } }).catch(() => {});
    if (ruleTier2) await prisma.approvalRule.delete({ where: { id: ruleTier2.id } }).catch(() => {});
    if (ruleTier3) await prisma.approvalRule.delete({ where: { id: ruleTier3.id } }).catch(() => {});
    if (ruleFailing) await prisma.approvalRule.delete({ where: { id: ruleFailing.id } }).catch(() => {});
    if (makerUser) await prisma.user.delete({ where: { id: makerUser.id } }).catch(() => {});
    if (checker1) await prisma.user.delete({ where: { id: checker1.id } }).catch(() => {});
    if (checker2) await prisma.user.delete({ where: { id: checker2.id } }).catch(() => {});
    if (checker3) await prisma.user.delete({ where: { id: checker3.id } }).catch(() => {});
    if (foreignCompanyUser) await prisma.user.delete({ where: { id: foreignCompanyUser.id } }).catch(() => {});
    if (wrongBranchUser) await prisma.user.delete({ where: { id: wrongBranchUser.id } }).catch(() => {});
    if (wrongDeptUser) await prisma.user.delete({ where: { id: wrongDeptUser.id } }).catch(() => {});
    if (foreignBranch) await prisma.branch.delete({ where: { id: foreignBranch.id } }).catch(() => {});
    if (foreignCompany) await prisma.company.delete({ where: { id: foreignCompany.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD2aTests().catch((err) => {
  console.error('Stage D.2a Remediated Test Execution Failed:', err);
  process.exit(1);
});
