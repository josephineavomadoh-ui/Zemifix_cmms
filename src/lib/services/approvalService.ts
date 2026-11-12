import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getCurrentUser, AuthenticatedUser, getApprovalSecret } from '../auth';
import { computePayloadHash } from './canonicalJson';
import { appendAuditLog } from './auditService';
import { generateUuidV7 } from '../uuid';
import { notifyStaff } from './notificationService';

// Entity-Specific Payload Builder Registry
export type PayloadBuilder = (
  tx: any,
  entityId: string
) => Promise<{
  payload: Record<string, unknown>;
  version: number;
  amount: Prisma.Decimal;
  branchId: string;
  departmentId?: string | null;
  resourceType: string;
}>;

export const payloadBuilders: Record<string, PayloadBuilder> = {
  // Test entity builder for Stage D.2a isolation
  TEST_ENTITY: async (tx, entityId) => {
    const branch = await tx.branch.findFirst();
    const dept = await tx.department.findFirst({ where: { code: 'DEPT-ENG' } });
    return {
      payload: { id: entityId, version: 1, estimatedCost: '1000.00' },
      version: 1,
      amount: new Prisma.Decimal('1000.00'),
      branchId: branch?.id ?? '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
      departmentId: dept?.id ?? null,
      resourceType: 'work_order',
    };
  },
};

// Entity-Specific Business Transition Registry
export type BusinessTransitionHandler = (
  tx: any,
  entityId: string,
  approvedAmount: Prisma.Decimal
) => Promise<{ updatedCount: number }>;

export const transitionRegistry: Record<string, BusinessTransitionHandler> = {
  TEST_ENTITY: async (tx, entityId, approvedAmount) => {
    return { updatedCount: 1 };
  },
};

/**
 * Validates organizational access scope inside the transaction.
 * Evaluates Company isolation, Branch hierarchy, Department scope, and UserScopeGrant overrides.
 */
export async function validateCheckerOrganizationalScope(
  tx: any,
  checker: {
    id: string;
    branchId: string;
    departmentId?: string | null;
    accessScope: string;
    branch: { id: string; path: string };
    scopeGrants: Array<{
      userId?: string;
      branchId?: string | null;
      departmentId?: string | null;
      expiresAt?: Date | null;
    }>;
  },
  entityBranchId: string,
  entityDepartmentId?: string | null
): Promise<boolean> {
  const now = new Date();

  // 1. Fetch entity branch context inside transaction
  const entityBranch = await tx.branch.findUnique({
    where: { id: entityBranchId },
    select: { id: true, path: true },
  });

  if (!entityBranch) {
    throw new Error('TARGET_BRANCH_NOT_FOUND: Target entity branch does not exist.');
  }

  // A. Company Realm Check — Cross-Company Rejection via root path prefix
  const checkerRoot = checker.branch.path.split('/').filter(Boolean)[0];
  const entityRoot = entityBranch.path.split('/').filter(Boolean)[0];
  if (checkerRoot && entityRoot && checkerRoot !== entityRoot) {
    throw new Error('CROSS_COMPANY_VIOLATION: Checker and target entity belong to different company realms.');
  }

  // Extract active non-expired UserScopeGrants for this checker
  const activeGrants = checker.scopeGrants.filter((g) => {
    if (g.userId && g.userId !== checker.id) return false; // Grant belongs to another user
    if (g.expiresAt && g.expiresAt <= now) return false; // Expired grant
    return true;
  });

  const grantedBranchIds = new Set(
    activeGrants.map((g) => g.branchId).filter((id): id is string => Boolean(id))
  );

  const grantedDeptIds = new Set(
    activeGrants.map((g) => g.departmentId).filter((id): id is string => Boolean(id))
  );

  // B. Scope Evaluation
  const scope = checker.accessScope;

  if (scope === 'Company') {
    return true;
  }

  if (scope === 'BranchAndBelow') {
    const isDescendant = entityBranch.path.startsWith(checker.branch.path);
    const isGranted = grantedBranchIds.has(entityBranch.id);
    if (!isDescendant && !isGranted) {
      throw new Error('UNAUTHORIZED_BRANCH_SCOPE: Entity branch is outside checker BranchAndBelow tree.');
    }
    return true;
  }

  if (scope === 'Branch') {
    const isAssigned = entityBranch.id === checker.branchId;
    const isGranted = grantedBranchIds.has(entityBranch.id);
    if (!isAssigned && !isGranted) {
      throw new Error('UNAUTHORIZED_BRANCH_SCOPE: Entity branch is outside checker assigned branch.');
    }
    return true;
  }

  if (scope === 'Department') {
    if (entityDepartmentId) {
      const isAssignedDept = entityDepartmentId === checker.departmentId;
      const isGrantedDept = grantedDeptIds.has(entityDepartmentId);
      if (!isAssignedDept && !isGrantedDept) {
        throw new Error('UNAUTHORIZED_DEPARTMENT_SCOPE: Entity department does not match checker department.');
      }
    } else {
      const isAssignedBranch = entityBranch.id === checker.branchId;
      const isGrantedBranch = grantedBranchIds.has(entityBranch.id);
      if (!isAssignedBranch && !isGrantedBranch) {
        throw new Error('UNAUTHORIZED_BRANCH_SCOPE: Entity branch is outside checker scope.');
      }
    }
    return true;
  }

  if (scope === 'Own') {
    const isAssignedBranch = entityBranch.id === checker.branchId;
    const isGrantedBranch = grantedBranchIds.has(entityBranch.id);
    if (!isAssignedBranch && !isGrantedBranch) {
      throw new Error('UNAUTHORIZED_OWN_SCOPE: Entity branch is outside checker own scope.');
    }
    return true;
  }

  throw new Error(`UNSUPPORTED_ACCESS_SCOPE: Access scope "${scope}" is not supported.`);
}

// 1. Create Approval Request
export async function createApprovalRequest(params: {
  entityType: string;
  entityId: string;
  makerUser: AuthenticatedUser;
  previousRequestId?: string;
}): Promise<{ requestId: string; totalSteps: number }> {
  const secret = getApprovalSecret();
  const builder = payloadBuilders[params.entityType];

  if (!builder) {
    throw new Error(`UNSUPPORTED_ENTITY_TYPE: No payload builder registered for "${params.entityType}".`);
  }

  return await prisma.$transaction(async (tx: any) => {
    const entityData = await builder(tx, params.entityId);
    const payloadHash = computePayloadHash(entityData.payload, secret);
    const now = new Date();

    // If resubmitting, verify previous request was REJECTED
    let version = 1;
    if (params.previousRequestId) {
      const prev = await tx.approvalRequest.findUnique({
        where: { id: params.previousRequestId },
      });
      if (!prev || prev.status !== 'REJECTED' || prev.entityType !== params.entityType || prev.entityId !== params.entityId) {
        throw new Error('INVALID_RESUBMISSION: Previous request is not an eligible rejected request for this entity.');
      }
      version = prev.version + 1;
    }

    // Deterministic Rule Resolution: Branch specific > Company wide, Priority ASC
    const matchedRules = await tx.approvalRule.findMany({
      where: {
        entityType: params.entityType,
        isActive: true,
        AND: [
          { OR: [{ branchId: entityData.branchId }, { branchId: null }] },
          { minAmount: { lte: entityData.amount } },
          { OR: [{ maxAmount: null }, { maxAmount: { gte: entityData.amount } }] },
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
      orderBy: [{ branchId: 'desc' }, { priority: 'asc' }],
    });

    if (matchedRules.length === 0) {
      throw new Error('NO_APPROVAL_RULE_FOUND: No active approval rule matches the request parameters.');
    }

    // Deduplicate rules by requiredRoleId if same tier, preserving priority order
    const rulesToSnapshot: typeof matchedRules = [];
    const seenRoles = new Set<string>();

    for (const rule of matchedRules) {
      if (!seenRoles.has(rule.requiredRoleId)) {
        seenRoles.add(rule.requiredRoleId);
        rulesToSnapshot.push(rule);
      }
    }

    const totalSteps = rulesToSnapshot.length;
    const requestId = generateUuidV7();

    // Insert Request
    await tx.approvalRequest.create({
      data: {
        id: requestId,
        entityType: params.entityType,
        entityId: params.entityId,
        version,
        makerUserId: params.makerUser.id,
        requestAmount: entityData.amount,
        status: 'PENDING',
        currentStepOrder: 1,
        totalSteps,
        payloadHash,
        previousRequestId: params.previousRequestId ?? null,
      },
    });

    // Snapshot all required sequential steps
    for (let i = 0; i < rulesToSnapshot.length; i++) {
      const rule = rulesToSnapshot[i];
      await tx.approvalStep.create({
        data: {
          id: generateUuidV7(),
          requestId,
          stepOrder: i + 1,
          name: rule.name,
          requiredRoleId: rule.requiredRoleId,
          minimumApprovalLimit: rule.minimumApprovalLimit,
        },
      });
    }

    const approvers = await tx.user.findMany({
      where: {
        id: { not: params.makerUser.id },
        roleId: { in: rulesToSnapshot.map((rule) => rule.requiredRoleId) },
        branchId: entityData.branchId,
        ...(entityData.departmentId
          ? { OR: [{ departmentId: entityData.departmentId }, { departmentId: null }] }
          : {}),
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    for (const approver of approvers) {
      await notifyStaff(tx, {
        recipientUserId: approver.id,
        eventType: 'APPROVAL_REQUESTED',
        eventKey: `approval-requested:${requestId}:${approver.id}`,
        variables: { entityType: params.entityType.replace(/_/g, ' ').toLowerCase() },
        context: { branchId: entityData.branchId, departmentId: entityData.departmentId },
        link: '/dashboard',
      });
    }

    // Append Audit Log
    await appendAuditLog(tx, {
      actorUserId: params.makerUser.id,
      action: 'CREATED_APPROVAL_REQUEST',
      resource: params.entityType,
      resourceId: params.entityId,
      payload: { requestId, version, amount: entityData.amount.toString(), payloadHash, totalSteps },
    });

    return { requestId, totalSteps };
  });
}

// 2. Submit Approval Decision
export async function submitApprovalDecision(
  req: NextRequest,
  params: {
    requestId: string;
    stepId: string;
    action: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }
): Promise<{ success: boolean; requestStatus: string }> {
  // 1. Derive Checker from Server Session
  const sessionUser = await getCurrentUser(req);
  if (!sessionUser) {
    throw new Error('UNAUTHORIZED: Authentication required.');
  }

  const secret = getApprovalSecret();

  return await prisma.$transaction(async (tx: any) => {
    // Re-fetch Checker User from PostgreSQL inside transaction with full relations
    const checker = await tx.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
        branch: true,
        scopeGrants: true,
      },
    });

    if (!checker || !checker.isActive || checker.deletedAt !== null) {
      throw new Error('UNAUTHORIZED_CHECKER: Checker account is inactive or deleted.');
    }

    // Lock ApprovalRequest FOR UPDATE
    const [lockedRequest] = await tx.$queryRaw<Array<{
      id: string;
      entityType: string;
      entityId: string;
      makerUserId: string;
      requestAmount: string;
      status: string;
      currentStepOrder: number;
      totalSteps: number;
      payloadHash: string;
    }>>`
      SELECT id, "entityType", "entityId", "makerUserId",
             "requestAmount"::text, status, "currentStepOrder", "totalSteps", "payloadHash"
        FROM "approval_requests"
       WHERE id = ${params.requestId}::uuid
         AND status = 'PENDING'
      FOR UPDATE
    `;

    if (!lockedRequest) {
      throw new Error('FINALIZED_REQUEST: Approval request is finalized or no longer pending.');
    }

    // Prevent Self-Approval
    if (lockedRequest.makerUserId === checker.id) {
      throw new Error('MAKER_CHECKER_VIOLATION: Maker cannot approve their own request.');
    }

    // Fetch Live Business Payload via Builder & Verify Hash
    const builder = payloadBuilders[lockedRequest.entityType];
    if (!builder) {
      throw new Error(`MISSING_PAYLOAD_BUILDER: No builder registered for "${lockedRequest.entityType}".`);
    }

    const liveData = await builder(tx, lockedRequest.entityId);
    const liveHash = computePayloadHash(liveData.payload, secret);

    if (liveHash !== lockedRequest.payloadHash) {
      throw new Error('STALE_APPROVAL_REQUEST: Target business record was modified after request creation.');
    }

    // Validate Organizational Access Scope against Target Entity Branch & Department
    await validateCheckerOrganizationalScope(
      tx,
      checker,
      liveData.branchId,
      liveData.departmentId ?? null
    );

    // Lock Active Approval Step
    const currentStep = await tx.approvalStep.findUnique({ where: { id: params.stepId } });
    if (!currentStep || currentStep.requestId !== lockedRequest.id || currentStep.stepOrder !== lockedRequest.currentStepOrder) {
      throw new Error(`INVALID_STEP: Action submitted for an inactive step. Complete step ${lockedRequest.currentStepOrder} first.`);
    }

    // Validate Checker Authority (Role, Permission, Approval Limit)
    const hasRole = checker.roleId === currentStep.requiredRoleId;
    const hasPermission = checker.role.permissions.some(
      (rp) => rp.permission.resource === liveData.resourceType && rp.permission.action === 'approve'
    );

    const checkerLimit = checker.approvalLimit ? new Prisma.Decimal(checker.approvalLimit) : new Prisma.Decimal('0.00');
    const stepMinLimit = new Prisma.Decimal(currentStep.minimumApprovalLimit);
    const reqAmount = new Prisma.Decimal(lockedRequest.requestAmount);

    if (!hasRole || !hasPermission || checkerLimit.lt(stepMinLimit) || checkerLimit.lt(reqAmount)) {
      throw new Error('INSUFFICIENT_APPROVAL_AUTHORITY: Checker lacks role, permission, or limit.');
    }

    // Handle Rejection
    if (params.action === 'REJECTED') {
      const actionUuid = generateUuidV7();
      await tx.$executeRaw`
        INSERT INTO "approval_actions" ("id", "stepId", "checkerUserId", "action", "rejectionReason", "actionTimestamp")
        VALUES (${actionUuid}::uuid, ${currentStep.id}::uuid, ${checker.id}::uuid, 'REJECTED'::"ApprovalActionType", ${params.rejectionReason ?? 'Rejected'}, NOW())
      `;

      await tx.approvalRequest.update({
        where: { id: lockedRequest.id },
        data: { status: 'REJECTED' },
      });

      await appendAuditLog(tx, {
        actorUserId: checker.id,
        action: 'REJECTED_APPROVAL_REQUEST',
        resource: lockedRequest.entityType,
        resourceId: lockedRequest.entityId,
        payload: { requestId: lockedRequest.id, stepOrder: currentStep.stepOrder, rejectionReason: params.rejectionReason },
      });

      await notifyStaff(tx, {
        recipientUserId: lockedRequest.makerUserId,
        eventType: 'APPROVAL_DECIDED',
        eventKey: `approval-decision:${lockedRequest.id}:REJECTED`,
        variables: {
          entityType: lockedRequest.entityType.replace(/_/g, ' ').toLowerCase(),
          decision: 'rejected',
        },
        context: { branchId: liveData.branchId, departmentId: liveData.departmentId },
        link: '/dashboard',
      });

      return { success: true, requestStatus: 'REJECTED' };
    }

    // Handle Approval Step
    const actionUuid = generateUuidV7();
    await tx.$executeRaw`
      INSERT INTO "approval_actions" ("id", "stepId", "checkerUserId", "action", "actionTimestamp")
      VALUES (${actionUuid}::uuid, ${currentStep.id}::uuid, ${checker.id}::uuid, 'APPROVED'::"ApprovalActionType", NOW())
    `;

    await tx.approvalStep.update({
      where: { id: currentStep.id },
      data: { isSatisfied: true, satisfiedAt: new Date() },
    });

    const isLastStep = lockedRequest.currentStepOrder === lockedRequest.totalSteps;
    const nextStatus = isLastStep ? 'APPROVED' : 'PENDING';

    await tx.approvalRequest.update({
      where: { id: lockedRequest.id },
      data: {
        status: nextStatus,
        ...(isLastStep ? {} : { currentStepOrder: lockedRequest.currentStepOrder + 1 }),
      },
    });

    // Dispatch Final Business Transition if Last Step
    if (isLastStep) {
      const handler = transitionRegistry[lockedRequest.entityType];
      if (!handler) {
        throw new Error(`MISSING_TRANSITION_HANDLER: No transition handler registered for "${lockedRequest.entityType}".`);
      }
      const { updatedCount } = await handler(tx, lockedRequest.entityId, reqAmount);
      if (updatedCount !== 1) {
        throw new Error(`TRANSITION_FAILED: Expected exactly 1 record updated, got ${updatedCount}.`);
      }
    }

    // Write Audit Entry
    await appendAuditLog(tx, {
      actorUserId: checker.id,
      action: isLastStep ? 'FINAL_APPROVED_REQUEST' : 'APPROVED_APPROVAL_STEP',
      resource: lockedRequest.entityType,
      resourceId: lockedRequest.entityId,
      payload: { requestId: lockedRequest.id, stepOrder: currentStep.stepOrder, isFinal: isLastStep },
    });

    if (isLastStep) {
      await notifyStaff(tx, {
        recipientUserId: lockedRequest.makerUserId,
        eventType: 'APPROVAL_DECIDED',
        eventKey: `approval-decision:${lockedRequest.id}:APPROVED`,
        variables: {
          entityType: lockedRequest.entityType.replace(/_/g, ' ').toLowerCase(),
          decision: 'approved',
        },
        context: { branchId: liveData.branchId, departmentId: liveData.departmentId },
        link: '/dashboard',
      });
    } else {
      const nextStep = await tx.approvalStep.findUnique({
        where: {
          requestId_stepOrder: {
            requestId: lockedRequest.id,
            stepOrder: lockedRequest.currentStepOrder + 1,
          },
        },
        select: { requiredRoleId: true },
      });
      if (nextStep) {
        const nextApprovers = await tx.user.findMany({
          where: {
            id: { not: lockedRequest.makerUserId },
            roleId: nextStep.requiredRoleId,
            branchId: liveData.branchId,
            ...(liveData.departmentId
              ? { OR: [{ departmentId: liveData.departmentId }, { departmentId: null }] }
              : {}),
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        });
        for (const approver of nextApprovers) {
          await notifyStaff(tx, {
            recipientUserId: approver.id,
            eventType: 'APPROVAL_REQUESTED',
            eventKey: `approval-step-requested:${lockedRequest.id}:${lockedRequest.currentStepOrder + 1}:${approver.id}`,
            variables: { entityType: lockedRequest.entityType.replace(/_/g, ' ').toLowerCase() },
            context: { branchId: liveData.branchId, departmentId: liveData.departmentId },
            link: '/dashboard',
          });
        }
      }
    }

    return { success: true, requestStatus: nextStatus };
  });
}
