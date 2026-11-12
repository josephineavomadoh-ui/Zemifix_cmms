import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyStaff } from './notificationService';

export async function getScopedWorkRequestFilter(user: AuthenticatedUser) {
  const now = new Date();
  if (!user || !user.accessScope || typeof user.accessScope !== 'string') {
    throw new Error('UNAUTHORIZED_ACCESS_SCOPE: Missing or invalid access scope on user context.');
  }

  const accessScope = user.accessScope;

  const grants = await prisma.userScopeGrant.findMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { branchId: true, departmentId: true },
  });

  const grantedBranchIds = grants.map((g) => g.branchId).filter((id): id is string => Boolean(id));
  const grantedDeptIds = grants.map((g) => g.departmentId).filter((id): id is string => Boolean(id));

  const userBranch = user.branchId
    ? await prisma.branch.findUnique({ where: { id: user.branchId }, select: { path: true } })
    : null;

  if (accessScope === 'Company') {
    return {};
  }

  if (accessScope === 'BranchAndBelow') {
    if (!userBranch || !userBranch.path) {
      throw new Error('UNAUTHORIZED_BRANCH_SCOPE: User has no valid branch path assigned.');
    }

    const userBranchPathPrefix = userBranch.path.endsWith('/') ? userBranch.path : `${userBranch.path}/`;

    let grantedBranchPaths: string[] = [];
    if (grantedBranchIds.length > 0) {
      const gBranches = await prisma.branch.findMany({
        where: { id: { in: grantedBranchIds } },
        select: { path: true },
      });
      grantedBranchPaths = gBranches.map((b) => (b.path.endsWith('/') ? b.path : `${b.path}/`));
    }

    const pathOrConditions = [
      { branch: { path: { startsWith: userBranchPathPrefix } } },
      ...grantedBranchPaths.map((p) => ({ branch: { path: { startsWith: p } } })),
    ];

    return {
      OR: pathOrConditions,
    };
  }

  if (accessScope === 'Branch') {
    const validBranchIds = [user.branchId, ...grantedBranchIds].filter((id): id is string => Boolean(id));
    if (validBranchIds.length === 0) {
      return { id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      branchId: { in: validBranchIds },
    };
  }

  if (accessScope === 'Department') {
    const validDeptIds = [user.departmentId, ...grantedDeptIds].filter((id): id is string => Boolean(id));
    if (validDeptIds.length === 0) {
      return { id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      departmentId: { in: validDeptIds },
    };
  }

  if (accessScope === 'Own') {
    return {
      requesterUserId: user.id,
    };
  }

  throw new Error(`UNSUPPORTED_ACCESS_SCOPE: Access scope "${accessScope}" is unknown.`);
}

export async function createWorkRequest(
  user: AuthenticatedUser,
  params: {
    title: string;
    description: string;
    assetId?: string | null;
    locationId?: string | null;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    let branchId = user.branchId;
    let departmentId = user.departmentId ?? null;

    if (params.assetId) {
      const asset = await tx.asset.findUnique({ where: { id: params.assetId } });
      if (!asset || asset.deletedAt !== null) {
        throw new Error('ASSET_NOT_FOUND: Target asset does not exist or is deleted.');
      }
      if (asset.branchId) branchId = asset.branchId;
    }

    if (params.locationId) {
      const loc = await tx.location.findUnique({ where: { id: params.locationId } });
      if (!loc || loc.deletedAt !== null) {
        throw new Error('LOCATION_NOT_FOUND: Target location does not exist.');
      }
      branchId = loc.branchId;
      if (loc.departmentId) departmentId = loc.departmentId;
    }

    const ts = Date.now();
    const requestNumber = `REQ-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;
    const requestId = generateUuidV7();

    const request = await tx.workRequest.create({
      data: {
        id: requestId,
        requestNumber,
        title: params.title,
        description: params.description,
        assetId: params.assetId ?? null,
        locationId: params.locationId ?? null,
        branchId,
        departmentId,
        requesterUserId: user.id,
        priority: params.priority ?? 'MEDIUM',
        status: 'SUBMITTED',
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_WORK_REQUEST',
      resource: 'work_request',
      resourceId: request.id,
      payload: { requestNumber, title: params.title, priority: params.priority },
    });

    const [branch, department] = await Promise.all([
      tx.branch.findUnique({ where: { id: branchId }, select: { managerUserId: true } }),
      departmentId
        ? tx.department.findUnique({ where: { id: departmentId }, select: { headUserId: true } })
        : Promise.resolve(null),
    ]);
    const recipients = [...new Set([branch?.managerUserId, department?.headUserId].filter(
      (id): id is string => Boolean(id && id !== user.id)
    ))];
    for (const recipientUserId of recipients) {
      await notifyStaff(tx, {
        recipientUserId,
        eventType: 'WORK_REQUEST_NEW',
        eventKey: `work-request-new:${request.id}`,
        variables: { requestNumber, title: request.title },
        context: { branchId: request.branchId, departmentId: request.departmentId },
        link: '/requests',
      });
    }

    return request;
  });
}

export async function getWorkRequests(user: AuthenticatedUser) {
  const scopeFilter = await getScopedWorkRequestFilter(user);

  return await prisma.workRequest.findMany({
    where: {
      ...scopeFilter,
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      location: { select: { name: true, code: true } },
      branch: { select: { name: true, code: true } },
      requesterUser: { select: { name: true, email: true } },
      convertedWorkOrder: { select: { id: true, workOrderNumber: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewWorkRequest(
  user: AuthenticatedUser,
  params: {
    requestId: string;
    action: 'APPROVE' | 'REJECT' | 'CONVERT';
    rejectionReason?: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const request = await tx.workRequest.findUnique({
      where: { id: params.requestId },
    });

    if (!request) throw new Error('WORK_REQUEST_NOT_FOUND: Maintenance request does not exist.');
    if (request.status === 'CONVERTED' || request.status === 'REJECTED') {
      throw new Error('FINALIZED_REQUEST: Request is already finalized.');
    }

    if (params.action === 'REJECT') {
      const updated = await tx.workRequest.update({
        where: { id: request.id },
        data: { status: 'REJECTED', rejectionReason: params.rejectionReason ?? 'Rejected by manager' },
      });

      await appendAuditLog(tx, {
        actorUserId: user.id,
        action: 'REJECTED_WORK_REQUEST',
        resource: 'work_request',
        resourceId: request.id,
        payload: { rejectionReason: params.rejectionReason },
      });

      await notifyStaff(tx, {
        recipientUserId: request.requesterUserId,
        eventType: 'WORK_REQUEST_DECIDED',
        eventKey: `work-request-decision:${request.id}:REJECTED`,
        variables: { requestNumber: request.requestNumber, decision: 'rejected' },
        context: { branchId: request.branchId, departmentId: request.departmentId },
        link: '/requests',
      });

      return { request: updated, convertedWorkOrder: null };
    }

    if (params.action === 'CONVERT' || params.action === 'APPROVE') {
      const ts = Date.now();
      const woNumber = `WO-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;
      const woId = generateUuidV7();

      const wo = await tx.workOrder.create({
        data: {
          id: woId,
          workOrderNumber: woNumber,
          title: request.title,
          description: request.description,
          type: 'CORRECTIVE',
          priority: request.priority,
          status: 'OPEN',
          assetId: request.assetId,
          locationId: request.locationId,
          branchId: request.branchId,
          departmentId: request.departmentId,
          supervisorUserId: user.id,
        },
      });

      const updatedRequest = await tx.workRequest.update({
        where: { id: request.id },
        data: {
          status: 'CONVERTED',
          convertedWorkOrderId: wo.id,
        },
      });

      const statusHistUuid = generateUuidV7();
      await tx.$executeRaw`
        INSERT INTO "work_order_status_history" ("id", "workOrderId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
        VALUES (${statusHistUuid}::uuid, ${wo.id}::uuid, 'DRAFT'::"WorkOrderStatus", 'OPEN'::"WorkOrderStatus", ${user.id}::uuid, 'Converted from maintenance request', NOW())
      `;

      await appendAuditLog(tx, {
        actorUserId: user.id,
        action: 'CONVERTED_WORK_REQUEST_TO_WORK_ORDER',
        resource: 'work_request',
        resourceId: request.id,
        payload: { workOrderNumber: woNumber, workOrderId: wo.id },
      });

      await notifyStaff(tx, {
        recipientUserId: request.requesterUserId,
        eventType: 'WORK_REQUEST_DECIDED',
        eventKey: `work-request-decision:${request.id}:CONVERTED`,
        variables: { requestNumber: request.requestNumber, decision: 'approved' },
        context: { branchId: request.branchId, departmentId: request.departmentId },
        link: '/requests',
      });

      return { request: updatedRequest, convertedWorkOrder: wo };
    }

    throw new Error('INVALID_ACTION: Unsupported review action.');
  });
}
