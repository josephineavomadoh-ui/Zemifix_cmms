import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyStaff, notifyCustomerContact } from './notificationService';

export async function getScopedWorkOrderFilter(user: AuthenticatedUser) {
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
    return { deletedAt: null };
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
      deletedAt: null,
      OR: pathOrConditions,
    };
  }

  if (accessScope === 'Branch') {
    const validBranchIds = [user.branchId, ...grantedBranchIds].filter((id): id is string => Boolean(id));
    if (validBranchIds.length === 0) {
      return { deletedAt: null, id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      deletedAt: null,
      branchId: { in: validBranchIds },
    };
  }

  if (accessScope === 'Department') {
    const validDeptIds = [user.departmentId, ...grantedDeptIds].filter((id): id is string => Boolean(id));
    if (validDeptIds.length === 0) {
      return { deletedAt: null, id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      deletedAt: null,
      departmentId: { in: validDeptIds },
    };
  }

  if (accessScope === 'Own') {
    return {
      deletedAt: null,
      OR: [
        { assignedUserId: user.id },
        { supervisorUserId: user.id },
      ],
    };
  }

  throw new Error(`UNSUPPORTED_ACCESS_SCOPE: Access scope "${accessScope}" is unknown.`);
}

export async function createWorkOrder(
  user: AuthenticatedUser,
  params: {
    title: string;
    description: string;
    type?: 'CORRECTIVE' | 'PREVENTIVE' | 'EMERGENCY' | 'INSPECTION' | 'GENERAL';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';
    assetId?: string | null;
    locationId?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
    supervisorUserId?: string | null;
    assignedUserId?: string | null;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
    estimatedHours?: number;
    estimatedCost?: number;
    customerId?: string | null;
    siteId?: string | null;
    contractId?: string | null;
    slaPolicyId?: string | null;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    let branchId = params.branchId ?? user.branchId;
    let departmentId = params.departmentId ?? user.departmentId ?? null;

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

    // SLA & Contract Snapshot Logic
    let activeSlaPolicyId = params.slaPolicyId ?? null;
    if (params.contractId && params.customerId) {
      const contract = await tx.customerContract.findUnique({
        where: { id: params.contractId },
        include: { contractSites: true },
      });
      if (contract) {
        if (!activeSlaPolicyId) activeSlaPolicyId = contract.slaPolicyId;
      }
    }

    let slaRespTarget: number | null = null;
    let slaResTarget: number | null = null;
    let slaSnapshotPolicyId: string | null = null;
    let slaSnapshotCalendarId: string | null = null;
    let slaSnapshotCalendarVersion: number | null = null;
    let slaSnapshotCalendarData: any = null;

    if (activeSlaPolicyId) {
      const policy = await tx.slaPolicy.findUnique({
        where: { id: activeSlaPolicyId },
        include: { calendar: true, rules: true },
      });

      if (policy) {
        const priority = params.priority ?? 'MEDIUM';
        const rule = policy.rules.find((r: any) => r.priority === priority);

        slaRespTarget = rule?.responseTargetMinutes ?? 60;
        slaResTarget = rule?.resolutionTargetMinutes ?? 480;
        slaSnapshotPolicyId = policy.id;
        slaSnapshotCalendarId = policy.calendarId;
        slaSnapshotCalendarVersion = policy.calendar?.version ?? 1;
        slaSnapshotCalendarData = policy.calendar ?? {};
      }
    }

    const ts = Date.now();
    const woNumber = `WO-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;
    const woUuid = generateUuidV7();

    const initialStatus = params.assignedUserId ? 'ASSIGNED' : 'OPEN';

    const wo = await tx.workOrder.create({
      data: {
        id: woUuid,
        workOrderNumber: woNumber,
        title: params.title,
        description: params.description,
        type: params.type ?? 'CORRECTIVE',
        priority: params.priority ?? 'MEDIUM',
        status: initialStatus,
        assetId: params.assetId ?? null,
        locationId: params.locationId ?? null,
        branchId,
        departmentId,
        supervisorUserId: params.supervisorUserId ?? user.id,
        assignedUserId: params.assignedUserId ?? null,
        plannedStart: params.plannedStart ?? null,
        plannedEnd: params.plannedEnd ?? null,
        estimatedHours: new Prisma.Decimal(params.estimatedHours ?? 0),
        estimatedCost: new Prisma.Decimal(params.estimatedCost ?? 0),
        customerId: params.customerId ?? null,
        siteId: params.siteId ?? null,
        contractId: params.contractId ?? null,
        slaPolicyId: activeSlaPolicyId,
        slaResponseTargetMinutes: slaRespTarget,
        slaResolutionTargetMinutes: slaResTarget,
        slaSnapshotPolicyId,
        slaSnapshotCalendarId,
        slaSnapshotCalendarVersion,
        slaSnapshotCalendarData,
        slaCycle: 1,
      },
    });

    const statusHistUuid = generateUuidV7();
    await tx.$executeRaw`
      INSERT INTO "work_order_status_history" ("id", "workOrderId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
      VALUES (${statusHistUuid}::uuid, ${wo.id}::uuid, 'DRAFT'::"WorkOrderStatus", ${initialStatus}::"WorkOrderStatus", ${user.id}::uuid, 'Work order created', NOW())
    `;

    if (params.assignedUserId) {
      const assignHistUuid = generateUuidV7();
      await tx.$executeRaw`
        INSERT INTO "work_order_assignment_history" ("id", "workOrderId", "assignedUserId", "assignedByUserId", "assignedAt")
        VALUES (${assignHistUuid}::uuid, ${wo.id}::uuid, ${params.assignedUserId}::uuid, ${user.id}::uuid, NOW())
      `;
    }

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_WORK_ORDER',
      resource: 'work_order',
      resourceId: wo.id,
      payload: { workOrderNumber: woNumber, title: params.title, type: params.type, priority: params.priority },
    });

    if (wo.assignedUserId) {
      await notifyStaff(tx, {
        recipientUserId: wo.assignedUserId,
        eventType: 'WORK_ORDER_ASSIGNED',
        eventKey: `work-order-assigned:${wo.id}:${wo.createdAt.toISOString()}`,
        variables: { workOrderNumber: wo.workOrderNumber, title: wo.title },
        context: { branchId: wo.branchId, departmentId: wo.departmentId },
        link: `/work-orders/${wo.id}`,
      });
    }

    return wo;
  });
}

export async function getWorkOrders(user: AuthenticatedUser) {
  const scopeFilter = await getScopedWorkOrderFilter(user);

  return await prisma.workOrder.findMany({
    where: {
      ...scopeFilter,
    },
    include: {
      asset: { select: { id: true, name: true, assetTag: true, status: true } },
      location: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true, code: true } },
      supervisorUser: { select: { id: true, name: true, email: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      tasks: { orderBy: { taskOrder: 'asc' } },
      checklists: { orderBy: { itemOrder: 'asc' } },
      labor: { include: { technicianUser: { select: { name: true } } } },
      parts: true,
      statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function transitionWorkOrderStatus(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    newStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
    reason?: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const [wo] = await tx.$queryRaw<Array<{
      id: string;
      status: string;
      workOrderNumber: string;
    }>>`
      SELECT id, status, "workOrderNumber" FROM "work_orders" WHERE id = ${params.workOrderId}::uuid FOR UPDATE
    `;

    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    const currentStatus = wo.status;

    // Lifecycle Transition Guards
    if (currentStatus === 'COMPLETED' && params.newStatus !== 'COMPLETED') {
      throw new Error('FINALIZED_WORK_ORDER: Completed work order cannot be modified or restarted.');
    }

    if (currentStatus === 'CANCELLED' && params.newStatus !== 'CANCELLED') {
      throw new Error('FINALIZED_WORK_ORDER: Cancelled work order cannot be reopened.');
    }

    // Check mandatory checklist items before COMPLETED
    if (params.newStatus === 'COMPLETED') {
      const incompleteChecklists = await tx.workOrderChecklistItem.findMany({
        where: { workOrderId: wo.id, isMandatory: true, passFail: null },
      });

      if (incompleteChecklists.length > 0) {
        throw new Error('INCOMPLETE_CHECKLISTS: Cannot complete work order with pending mandatory checklist items.');
      }
    }

    const now = new Date();

    const updated = await tx.workOrder.update({
      where: { id: wo.id },
      data: {
        status: params.newStatus as any,
        ...(params.newStatus === 'IN_PROGRESS' && !wo.actualStart ? { actualStart: now } : {}),
        ...(params.newStatus === 'COMPLETED' ? { actualEnd: now } : {}),
        ...(params.newStatus === 'CANCELLED' ? { cancellationReason: params.reason } : {}),
      },
    });

    const statusHistUuid = generateUuidV7();
    await tx.$executeRaw`
      INSERT INTO "work_order_status_history" ("id", "workOrderId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
      VALUES (${statusHistUuid}::uuid, ${wo.id}::uuid, ${currentStatus}::"WorkOrderStatus", ${params.newStatus}::"WorkOrderStatus", ${user.id}::uuid, ${params.reason ?? 'Status transition'}, ${now})
    `;

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'TRANSITIONED_WORK_ORDER_STATUS',
      resource: 'work_order',
      resourceId: wo.id,
      payload: { workOrderNumber: wo.workOrderNumber, fromStatus: currentStatus, toStatus: params.newStatus },
    });

    if (currentStatus !== params.newStatus) {
      const recipients = [...new Set([updated.assignedUserId, updated.supervisorUserId].filter(
        (id): id is string => Boolean(id)
      ))];
      for (const recipientUserId of recipients) {
        await notifyStaff(tx, {
          recipientUserId,
          eventType: 'WORK_ORDER_STATUS_CHANGED',
          eventKey: `work-order-status:${wo.id}:${currentStatus}:${params.newStatus}:${updated.updatedAt.toISOString()}`,
          variables: {
            workOrderNumber: wo.workOrderNumber,
            fromStatus: currentStatus,
            toStatus: params.newStatus,
          },
          context: { branchId: updated.branchId, departmentId: updated.departmentId },
          link: `/work-orders/${updated.id}`,
        });
      }
    }

    if (currentStatus !== params.newStatus && updated.customerId && updated.siteId) {
      const portalContacts = await tx.customerContact.findMany({
        where: {
          customerId: updated.customerId,
          isActive: true,
          deletedAt: null,
          siteGrants: { some: { customerSiteId: updated.siteId, customerId: updated.customerId } },
        },
        select: { id: true },
      });
      for (const contact of portalContacts) {
        await notifyCustomerContact(tx, {
          recipientContactId: contact.id,
          customerId: updated.customerId,
          eventType: 'CUSTOMER_WORK_ORDER_STATUS',
          eventKey: `customer-work-order-status:${wo.id}:${currentStatus}:${params.newStatus}:${updated.updatedAt.toISOString()}`,
          variables: { workOrderNumber: wo.workOrderNumber, status: params.newStatus },
          context: { customerId: updated.customerId, siteId: updated.siteId },
          link: '/portal/work-orders',
        });
      }
    }

    return updated;
  });
}

export async function assignWorkOrder(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    assignedUserId: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const wo = await tx.workOrder.findUnique({ where: { id: params.workOrderId } });
    if (!wo || wo.deletedAt !== null) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    const targetUser = await tx.user.findUnique({ where: { id: params.assignedUserId } });
    if (!targetUser || !targetUser.isActive || targetUser.deletedAt !== null) {
      throw new Error('TARGET_USER_NOT_FOUND: Assigned user is inactive or does not exist.');
    }

    const updated = await tx.workOrder.update({
      where: { id: wo.id },
      data: {
        assignedUserId: params.assignedUserId,
        ...(wo.status === 'OPEN' ? { status: 'ASSIGNED' } : {}),
      },
    });

    const assignHistUuid = generateUuidV7();
    await tx.$executeRaw`
      INSERT INTO "work_order_assignment_history" ("id", "workOrderId", "assignedUserId", "assignedByUserId", "assignedAt")
      VALUES (${assignHistUuid}::uuid, ${wo.id}::uuid, ${params.assignedUserId}::uuid, ${user.id}::uuid, NOW())
    `;

    if (wo.assignedUserId !== updated.assignedUserId) {
    const eventTimestamp = updated.updatedAt.toISOString();
    await notifyStaff(tx, {
      recipientUserId: updated.assignedUserId!,
      eventType: 'WORK_ORDER_ASSIGNED',
      eventKey: `work-order-assigned:${wo.id}:${eventTimestamp}`,
      variables: { workOrderNumber: wo.workOrderNumber },
      context: { branchId: wo.branchId, departmentId: wo.departmentId },
      link: `/work-orders/${wo.id}`,
    });
    if (wo.assignedUserId) {
      await notifyStaff(tx, {
        recipientUserId: wo.assignedUserId,
        eventType: 'WORK_ORDER_REASSIGNED',
        eventKey: `work-order-reassigned:${wo.id}:${eventTimestamp}`,
        variables: { workOrderNumber: wo.workOrderNumber },
        context: { branchId: wo.branchId, departmentId: wo.departmentId },
        link: `/work-orders/${wo.id}`,
      });
    }
    }

    return updated;
  });
}

export async function recordWorkOrderLabor(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    technicianUserId: string;
    workDate: Date;
    hoursWorked: number;
    hourlyRate?: number;
    skillCategory?: 'REGULAR' | 'OVERTIME' | 'EMERGENCY' | 'SPECIALIST';
    description?: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    if (params.hoursWorked <= 0) {
      throw new Error('INVALID_LABOR_HOURS: Hours worked must be greater than zero.');
    }

    const wo = await tx.workOrder.findUnique({
      where: { id: params.workOrderId },
      include: {
        contract: {
          include: { rateCards: true },
        },
      },
    });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    // Deterministic Rate Card Hierarchy Selection
    let derivedCategory: 'REGULAR' | 'OVERTIME' | 'EMERGENCY' | 'SPECIALIST' = params.skillCategory ?? 'REGULAR';
    if (!params.skillCategory) {
      if (wo.priority === 'EMERGENCY') {
        derivedCategory = 'EMERGENCY';
      }
    }

    let finalRate = params.hourlyRate ?? 0;

    if (!params.hourlyRate && wo.contract?.rateCards) {
      const rateCards = wo.contract.rateCards;
      const matchingCard = rateCards.find((rc: any) => rc.category === derivedCategory)
                        ?? rateCards.find((rc: any) => rc.category === 'REGULAR');
      if (matchingCard) {
        finalRate = Number(matchingCard.hourlyRate);
      }
    }

    const laborUuid = generateUuidV7();
    const rate = new Prisma.Decimal(finalRate);
    const hours = new Prisma.Decimal(params.hoursWorked);
    const totalCost = hours.mul(rate);

    const labor = await tx.workOrderLabor.create({
      data: {
        id: laborUuid,
        workOrderId: params.workOrderId,
        technicianUserId: params.technicianUserId,
        workDate: params.workDate,
        hoursWorked: hours,
        skillCategory: derivedCategory,
        hourlyRate: rate,
        totalCost,
        description: params.description ?? null,
        recordedByUserId: user.id,
      },
    });

    await tx.workOrder.update({
      where: { id: params.workOrderId },
      data: {
        actualHours: new Prisma.Decimal(wo.actualHours).add(hours),
        totalCost: new Prisma.Decimal(wo.totalCost).add(totalCost),
      },
    });

    return labor;
  });
}

export async function recordWorkOrderPart(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    partNumber: string;
    partName: string;
    quantityPlanned?: number;
    quantityConsumed?: number;
    unitCost?: number;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const wo = await tx.workOrder.findUnique({ where: { id: params.workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    const partUuid = generateUuidV7();
    const qtyPlanned = new Prisma.Decimal(params.quantityPlanned ?? 1);
    const qtyConsumed = new Prisma.Decimal(params.quantityConsumed ?? 0);
    const cost = new Prisma.Decimal(params.unitCost ?? 0);

    const part = await tx.workOrderPart.create({
      data: {
        id: partUuid,
        workOrderId: params.workOrderId,
        partNumber: params.partNumber,
        partName: params.partName,
        quantityPlanned: qtyPlanned,
        quantityConsumed: qtyConsumed,
        unitCost: cost,
      },
    });

    const totalPartCost = qtyConsumed.mul(cost);
    if (totalPartCost.gt(0)) {
      await tx.workOrder.update({
        where: { id: params.workOrderId },
        data: {
          totalCost: new Prisma.Decimal(wo.totalCost).add(totalPartCost),
        },
      });
    }

    return part;
  });
}
