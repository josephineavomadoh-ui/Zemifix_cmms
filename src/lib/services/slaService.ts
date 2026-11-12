import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyStaff } from './notificationService';

/**
 * 1. SLA CALENDARS & HOLIDAYS
 */
export async function createSlaCalendar(
  user: AuthenticatedUser,
  params: {
    name: string;
    timezone?: string;
    mondayStart?: string; mondayEnd?: string;
    tuesdayStart?: string; tuesdayEnd?: string;
    wednesdayStart?: string; wednesdayEnd?: string;
    thursdayStart?: string; thursdayEnd?: string;
    fridayStart?: string; fridayEnd?: string;
    holidays?: Array<{ holidayDate: Date; name: string }>;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const calendarUuid = generateUuidV7();

    const calendar = await tx.slaCalendar.create({
      data: {
        id: calendarUuid,
        name: params.name,
        timezone: params.timezone ?? 'Africa/Accra',
        mondayStart: params.mondayStart ?? '08:00',
        mondayEnd: params.mondayEnd ?? '17:00',
        tuesdayStart: params.tuesdayStart ?? '08:00',
        tuesdayEnd: params.tuesdayEnd ?? '17:00',
        wednesdayStart: params.wednesdayStart ?? '08:00',
        wednesdayEnd: params.wednesdayEnd ?? '17:00',
        thursdayStart: params.thursdayStart ?? '08:00',
        thursdayEnd: params.thursdayEnd ?? '17:00',
        fridayStart: params.fridayStart ?? '08:00',
        fridayEnd: params.fridayEnd ?? '17:00',
        holidays: {
          create: (params.holidays ?? []).map((h) => ({
            id: generateUuidV7(),
            holidayDate: h.holidayDate,
            name: h.name,
          })),
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_SLA_CALENDAR',
      resource: 'sla_calendar',
      resourceId: calendar.id,
      payload: { name: params.name, timezone: params.timezone },
    });

    return calendar;
  });
}

/**
 * 2. SLA POLICY DEFINITIONS & PRIORITY RULES
 */
export async function createSlaPolicy(
  user: AuthenticatedUser,
  params: {
    name: string;
    calendarId: string;
    description?: string;
    rules: Array<{
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';
      responseTargetMinutes: number;
      resolutionTargetMinutes: number;
      businessHoursOnly?: boolean;
    }>;
  }
) {
  if (params.rules.length === 0) {
    throw new Error('NO_SLA_RULES: SLA Policy must contain at least one priority rule.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const calendar = await tx.slaCalendar.findUnique({ where: { id: params.calendarId } });
    if (!calendar) throw new Error('CALENDAR_NOT_FOUND: SLA business calendar does not exist.');

    const policyUuid = generateUuidV7();
    const ts = Date.now();
    const policyNumber = `SLA-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    const policy = await tx.slaPolicy.create({
      data: {
        id: policyUuid,
        policyNumber,
        name: params.name,
        description: params.description ?? null,
        calendarId: calendar.id,
        isActive: true,
        rules: {
          create: params.rules.map((r) => ({
            id: generateUuidV7(),
            priority: r.priority,
            responseTargetMinutes: r.responseTargetMinutes,
            resolutionTargetMinutes: r.resolutionTargetMinutes,
            businessHoursOnly: r.businessHoursOnly ?? true,
          })),
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_SLA_POLICY',
      resource: 'sla_policy',
      resourceId: policy.id,
      payload: { policyNumber, name: params.name, ruleCount: params.rules.length },
    });

    return policy;
  });
}

export async function getSlaPolicies() {
  return await prisma.slaPolicy.findMany({
    where: { deletedAt: null },
    include: {
      calendar: { include: { holidays: true } },
      rules: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 3. AUTHORITATIVE WORK ORDER SLA EVALUATION & BREACH LOGGING
 */
export async function evaluateWorkOrderSla(
  workOrderId: string,
  options?: { isCompletionEvent?: boolean }
) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      statusHistory: { orderBy: { changedAt: 'asc' } },
      slaPolicy: { include: { calendar: { include: { holidays: true } }, rules: true } },
    },
  });

  if (!wo || !wo.slaPolicy) return null;

  // Use immutable snapshot target minutes or fallback to policy rule
  const rule = wo.slaPolicy.rules.find((r: any) => r.priority === wo.priority);
  const responseTarget = wo.slaResponseTargetMinutes ?? rule?.responseTargetMinutes ?? 60;
  const resolutionTarget = wo.slaResolutionTargetMinutes ?? rule?.resolutionTargetMinutes ?? 480;

  const createdAt = new Date(wo.createdAt);
  const currentCycle = wo.slaCycle ?? 1;

  // Calculate First Response Timestamp (First transition to ASSIGNED or IN_PROGRESS)
  const firstResponse = wo.statusHistory.find((sh: any) =>
    ['ASSIGNED', 'IN_PROGRESS'].includes(sh.toStatus)
  );

  const responseTimeEnd = firstResponse ? new Date(firstResponse.changedAt) : new Date();
  const elapsedResponseMinutes = Math.floor((responseTimeEnd.getTime() - createdAt.getTime()) / (1000 * 60));

  // Calculate Net Resolution Duration (Deducting ON_HOLD intervals)
  let totalOnHoldMinutes = 0;
  let onHoldStart: Date | null = null;

  for (const sh of wo.statusHistory) {
    if (sh.toStatus === 'ON_HOLD') {
      onHoldStart = new Date(sh.changedAt);
    } else if (onHoldStart && sh.fromStatus === 'ON_HOLD') {
      const holdEnd = new Date(sh.changedAt);
      totalOnHoldMinutes += Math.floor((holdEnd.getTime() - onHoldStart.getTime()) / (1000 * 60));
      onHoldStart = null;
    }
  }

  const resolutionEnd = wo.actualEnd ?? (options?.isCompletionEvent ? new Date() : new Date());
  const rawResolutionMinutes = Math.floor((resolutionEnd.getTime() - createdAt.getTime()) / (1000 * 60));
  const netResolutionMinutes = Math.max(0, rawResolutionMinutes - totalOnHoldMinutes);

  const breachesLogged = [];
  const notifyUsers = [...new Set([wo.assignedUserId, wo.supervisorUserId].filter(
    (id): id is string => Boolean(id)
  ))];
  const notificationContext = { branchId: wo.branchId, departmentId: wo.departmentId };
  const targetTypes = [
    { key: 'RESPONSE_TIME', label: 'response time', elapsed: elapsedResponseMinutes, target: responseTarget },
    { key: 'RESOLUTION_TIME', label: 'resolution time', elapsed: netResolutionMinutes, target: resolutionTarget },
  ];

  for (const target of targetTypes) {
    if (target.elapsed >= Math.ceil(target.target * 0.8) && target.elapsed <= target.target) {
      await prisma.$transaction(async (tx: any) => {
        for (const recipientUserId of notifyUsers) {
          await notifyStaff(tx, {
            recipientUserId,
            eventType: 'SLA_WARNING',
            eventKey: `sla-warning:${wo.id}:${currentCycle}:${target.key}`,
            variables: { workOrderNumber: wo.workOrderNumber, targetType: target.label },
            context: notificationContext,
            link: `/work-orders/${wo.id}`,
          });
        }
      });
    }
  }

  // Check Response Breach
  if (elapsedResponseMinutes > responseTarget) {
    try {
      const breach = await prisma.$transaction(async (tx: any) => {
        const created = await tx.slaBreachLog.create({
          data: {
            id: generateUuidV7(),
            workOrderId: wo.id,
            slaPolicyId: wo.slaPolicy.id,
            priority: wo.priority,
            breachType: 'RESPONSE_TIME_BREACH',
            slaCycle: currentCycle,
            targetMinutes: responseTarget,
            actualElapsedMinutes: elapsedResponseMinutes,
            breachedAt: new Date(),
          },
        });
        for (const recipientUserId of notifyUsers) {
          await notifyStaff(tx, {
            recipientUserId,
            eventType: 'SLA_BREACH',
            eventKey: `sla-breach:${wo.id}:${currentCycle}:RESPONSE_TIME_BREACH`,
            variables: { workOrderNumber: wo.workOrderNumber, targetType: 'response time' },
            context: notificationContext,
            link: `/work-orders/${wo.id}`,
          });
        }
        return created;
      });
      breachesLogged.push(breach);
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }

  // Check Resolution Breach
  if (netResolutionMinutes > resolutionTarget) {
    try {
      const breach = await prisma.$transaction(async (tx: any) => {
        const created = await tx.slaBreachLog.create({
          data: {
            id: generateUuidV7(),
            workOrderId: wo.id,
            slaPolicyId: wo.slaPolicy.id,
            priority: wo.priority,
            breachType: 'RESOLUTION_TIME_BREACH',
            slaCycle: currentCycle,
            targetMinutes: resolutionTarget,
            actualElapsedMinutes: netResolutionMinutes,
            breachedAt: new Date(),
          },
        });
        for (const recipientUserId of notifyUsers) {
          await notifyStaff(tx, {
            recipientUserId,
            eventType: 'SLA_BREACH',
            eventKey: `sla-breach:${wo.id}:${currentCycle}:RESOLUTION_TIME_BREACH`,
            variables: { workOrderNumber: wo.workOrderNumber, targetType: 'resolution time' },
            context: notificationContext,
            link: `/work-orders/${wo.id}`,
          });
        }
        return created;
      });
      breachesLogged.push(breach);
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }

  return {
    workOrderId: wo.id,
    elapsedResponseMinutes,
    netResolutionMinutes,
    responseTarget,
    resolutionTarget,
    breachesLogged,
  };
}

/**
 * Scheduled Cron Worker: Evaluates all active work orders for SLA breaches
 */
export async function evaluateAllActiveSlaBreaches() {
  const activeWorkOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] },
      slaPolicyId: { not: null },
    },
    select: { id: true },
  });

  const evaluationResults = [];
  for (const wo of activeWorkOrders) {
    const result = await evaluateWorkOrderSla(wo.id);
    if (result) evaluationResults.push(result);
  }

  return { evaluatedCount: activeWorkOrders.length, evaluationResults };
}

export async function getSlaBreachLogs() {
  return await prisma.slaBreachLog.findMany({
    include: {
      workOrder: { select: { workOrderNumber: true, title: true, status: true, priority: true } },
    },
    orderBy: { breachedAt: 'desc' },
  });
}
