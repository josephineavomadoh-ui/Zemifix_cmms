import { Resend } from 'resend';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

type DbClient = any;
type NotificationVariables = Record<string, string | number>;
type NotificationContext = {
  branchId?: string | null;
  departmentId?: string | null;
  customerId?: string | null;
  siteId?: string | null;
};

function render(template: string, variables: NotificationVariables): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) =>
    String(variables[key] ?? '')
  );
}

async function createForRecipient(
  tx: DbClient,
  input: {
    realm: 'STAFF' | 'CUSTOMER';
    recipientUserId?: string;
    recipientContactId?: string;
    customerId?: string;
    eventType: string;
    eventKey: string;
    variables: NotificationVariables;
    context?: NotificationContext;
    link?: string;
  }
) {
  const recipientKey = input.recipientUserId ?? input.recipientContactId;
  if (!recipientKey) throw new Error('NOTIFICATION_RECIPIENT_REQUIRED');

  if (input.realm === 'STAFF') {
    const recipient = await tx.user.findFirst({
      where: { id: input.recipientUserId, isActive: true, deletedAt: null },
      select: { id: true, branchId: true, departmentId: true, accessScope: true },
    });
    if (!recipient) return null;
    if (input.context?.branchId) {
      let branchAllowed = recipient.accessScope === 'Company' ||
        recipient.branchId === input.context.branchId;
      if (!branchAllowed && recipient.accessScope === 'BranchAndBelow') {
        const [recipientBranch, eventBranch] = await Promise.all([
          tx.branch.findUnique({ where: { id: recipient.branchId }, select: { path: true } }),
          tx.branch.findUnique({ where: { id: input.context.branchId }, select: { path: true } }),
        ]);
        if (recipientBranch?.path && eventBranch?.path) {
          const prefix = recipientBranch.path.endsWith('/')
            ? recipientBranch.path
            : `${recipientBranch.path}/`;
          branchAllowed = eventBranch.path === recipientBranch.path ||
            eventBranch.path.startsWith(prefix);
        }
      }
      if (!branchAllowed) {
        const grant = await tx.userScopeGrant.findFirst({
          where: {
            userId: recipient.id,
            OR: [
              { branchId: input.context.branchId },
              ...(input.context.departmentId ? [{ departmentId: input.context.departmentId }] : []),
            ],
            AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
          },
          select: { id: true },
        });
        branchAllowed = Boolean(grant);
      }
      if (!branchAllowed) return null;

      if (
        input.context.departmentId &&
        recipient.accessScope === 'Department' &&
        recipient.departmentId !== input.context.departmentId
      ) {
        const departmentGrant = await tx.userScopeGrant.findFirst({
          where: {
            userId: recipient.id,
            departmentId: input.context.departmentId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { id: true },
        });
        if (!departmentGrant) return null;
      }
    }
  } else {
    const recipient = await tx.customerContact.findFirst({
      where: {
        id: input.recipientContactId,
        customerId: input.customerId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!recipient) return null;
  }

  const template = await tx.notificationTemplate.findUnique({
    where: { realm_eventType: { realm: input.realm, eventType: input.eventType } },
  });
  if (!template || !template.isActive) {
    throw new Error(`NOTIFICATION_TEMPLATE_NOT_CONFIGURED: ${input.realm}/${input.eventType}`);
  }

  const preference = input.realm === 'STAFF'
    ? await tx.notificationPreference.findUnique({
        where: {
          recipientUserId_eventType: {
            recipientUserId: input.recipientUserId,
            eventType: input.eventType,
          },
        },
      })
    : await tx.notificationPreference.findUnique({
        where: {
          recipientContactId_eventType: {
            recipientContactId: input.recipientContactId,
            eventType: input.eventType,
          },
        },
      });

  const inAppEnabled = preference?.inAppEnabled ?? true;
  const emailEnabled = preference?.emailEnabled ?? true;
  if (!inAppEnabled && !emailEnabled) return null;

  const idempotencyKey = `${input.eventKey}:${recipientKey}`;
  if (idempotencyKey.length > 200) {
    throw new Error('NOTIFICATION_IDEMPOTENCY_KEY_TOO_LONG');
  }

  const inserted = await tx.notification.createMany({
    data: [{
      id: generateUuidV7(),
      realm: input.realm,
      recipientUserId: input.recipientUserId ?? null,
      recipientContactId: input.recipientContactId ?? null,
      customerId: input.customerId ?? input.context?.customerId ?? null,
      siteId: input.context?.siteId ?? null,
      branchId: input.context?.branchId ?? null,
      departmentId: input.context?.departmentId ?? null,
      eventType: input.eventType,
      idempotencyKey,
      title: render(template.titleTemplate, input.variables),
      body: render(template.bodyTemplate, input.variables),
      emailSubject: render(template.emailSubject, input.variables),
      emailBody: render(template.emailBody, input.variables),
      link: input.link ?? null,
      data: input.variables,
      inAppEnabled,
    }],
    skipDuplicates: true,
  });

  const notification = await tx.notification.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });
  if (!notification) throw new Error('NOTIFICATION_PERSISTENCE_FAILED');

  if (inserted.count > 0 && emailEnabled) {
    await tx.notificationEmailDelivery.create({
      data: { id: generateUuidV7(), notificationId: notification.id },
    });
  }

  return notification;
}

export async function notifyStaff(
  tx: DbClient,
  input: {
    recipientUserId: string;
    eventType: string;
    eventKey: string;
    variables: NotificationVariables;
    context?: NotificationContext;
    link?: string;
  }
) {
  return createForRecipient(tx, { ...input, realm: 'STAFF' });
}

export async function notifyCustomerContact(
  tx: DbClient,
  input: {
    recipientContactId: string;
    customerId: string;
    eventType: string;
    eventKey: string;
    variables: NotificationVariables;
    context?: NotificationContext;
    link?: string;
  }
) {
  return createForRecipient(tx, { ...input, realm: 'CUSTOMER' });
}

export async function listNotifications(
  recipient: { realm: 'STAFF'; userId: string } | { realm: 'CUSTOMER'; contactId: string },
  take = 50
) {
  const where = recipient.realm === 'STAFF'
    ? { realm: 'STAFF' as const, recipientUserId: recipient.userId, inAppEnabled: true }
    : { realm: 'CUSTOMER' as const, recipientContactId: recipient.contactId, inAppEnabled: true };
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        title: true,
        body: true,
        link: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationRead(
  recipient: { realm: 'STAFF'; userId: string } | { realm: 'CUSTOMER'; contactId: string },
  notificationId: string,
  isRead = true
) {
  const where = recipient.realm === 'STAFF'
    ? { id: notificationId, realm: 'STAFF' as const, recipientUserId: recipient.userId }
    : { id: notificationId, realm: 'CUSTOMER' as const, recipientContactId: recipient.contactId };
  const result = await prisma.notification.updateMany({
    where,
    data: { readAt: isRead ? new Date() : null },
  });
  return result.count;
}

export async function markAllNotificationsRead(
  recipient: { realm: 'STAFF'; userId: string } | { realm: 'CUSTOMER'; contactId: string }
) {
  const where = recipient.realm === 'STAFF'
    ? { realm: 'STAFF' as const, recipientUserId: recipient.userId, inAppEnabled: true }
    : { realm: 'CUSTOMER' as const, recipientContactId: recipient.contactId, inAppEnabled: true };
  const result = await prisma.notification.updateMany({
    where: { ...where, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function getNotificationPreferences(
  recipient: { realm: 'STAFF'; userId: string } | { realm: 'CUSTOMER'; contactId: string }
) {
  const realm = recipient.realm;
  const recipientWhere = realm === 'STAFF'
    ? { recipientUserId: recipient.userId }
    : { recipientContactId: recipient.contactId };
  const [templates, preferences] = await Promise.all([
    prisma.notificationTemplate.findMany({
      where: { realm, isActive: true },
      select: { eventType: true, titleTemplate: true },
      orderBy: { eventType: 'asc' },
    }),
    prisma.notificationPreference.findMany({
      where: recipientWhere,
      select: { eventType: true, inAppEnabled: true, emailEnabled: true },
    }),
  ]);
  const preferenceByType = new Map(preferences.map((item) => [item.eventType, item]));
  return templates.map((template) => ({
    eventType: template.eventType,
    label: template.titleTemplate,
    inAppEnabled: preferenceByType.get(template.eventType)?.inAppEnabled ?? true,
    emailEnabled: preferenceByType.get(template.eventType)?.emailEnabled ?? true,
  }));
}

export async function saveNotificationPreference(
  recipient: { realm: 'STAFF'; userId: string } | { realm: 'CUSTOMER'; contactId: string },
  input: { eventType: string; inAppEnabled: boolean; emailEnabled: boolean }
) {
  const template = await prisma.notificationTemplate.findUnique({
    where: { realm_eventType: { realm: recipient.realm, eventType: input.eventType } },
    select: { id: true },
  });
  if (!template) throw new Error('NOTIFICATION_EVENT_NOT_FOUND');

  const where = recipient.realm === 'STAFF'
    ? {
        recipientUserId_eventType: {
          recipientUserId: recipient.userId,
          eventType: input.eventType,
        },
      }
    : {
        recipientContactId_eventType: {
          recipientContactId: recipient.contactId,
          eventType: input.eventType,
        },
      };
  const data = recipient.realm === 'STAFF'
    ? { recipientUserId: recipient.userId, eventType: input.eventType, inAppEnabled: input.inAppEnabled, emailEnabled: input.emailEnabled }
    : { recipientContactId: recipient.contactId, eventType: input.eventType, inAppEnabled: input.inAppEnabled, emailEnabled: input.emailEnabled };

  return prisma.notificationPreference.upsert({ where, create: data, update: input });
}

export interface NotificationEmailProvider {
  send(input: { to: string; subject: string; text: string; idempotencyKey: string }): Promise<string>;
}

export function createResendNotificationEmailProvider(): NotificationEmailProvider {
  return {
    async send({ to, subject, text, idempotencyKey }) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.NOTIFICATIONS_EMAIL_FROM;
      if (!apiKey || !from) throw new Error('NOTIFICATION_EMAIL_PROVIDER_NOT_CONFIGURED');

      const resend = new Resend(apiKey);
      const result = await resend.emails.send(
        { from, to, subject, text },
        { idempotencyKey }
      );
      if (result.error) throw new Error(result.error.message);
      if (!result.data?.id) throw new Error('EMAIL_PROVIDER_RETURNED_NO_MESSAGE_ID');
      return result.data.id;
    },
  };
}

export async function processNotificationEmailDeliveries(
  options: {
    batchSize?: number;
    emailProvider?: NotificationEmailProvider;
    deliveryIds?: string[];
  } = {}
) {
  if (options.deliveryIds && options.deliveryIds.length === 0) {
    return { claimedCount: 0, sentCount: 0, failedCount: 0 };
  }
  const emailProvider = options.emailProvider ?? createResendNotificationEmailProvider();
  const deliveryFilter = options.deliveryIds
    ? Prisma.sql`AND id IN (${Prisma.join(options.deliveryIds.map((id) => Prisma.sql`${id}::uuid`))})`
    : Prisma.empty;
  const claimed = await prisma.$transaction(async (tx: DbClient) => {
    const limit = Math.min(Math.max(options.batchSize ?? 25, 1), 100);
    await tx.$executeRaw`
      UPDATE "notification_delivery_attempts" AS attempt
         SET status = 'FAILED',
             "completedAt" = NOW(),
             error = 'Worker lease expired after maximum attempts.'
        FROM "notification_email_deliveries" AS delivery
       WHERE attempt."deliveryId" = delivery.id
         AND attempt."attemptNumber" = delivery."attemptCount"
         AND attempt.status = 'STARTED'
         AND delivery.status = 'SENDING'
         AND delivery."lockedAt" < NOW() - INTERVAL '15 minutes'
         AND delivery."attemptCount" >= delivery."maxAttempts"
    `;
    await tx.$executeRaw`
      UPDATE "notification_email_deliveries"
         SET status = 'FAILED',
             "lockedAt" = NULL,
             "lastError" = 'Maximum attempts reached after worker lease expired.',
             "updatedAt" = NOW()
       WHERE status = 'SENDING'
         AND "lockedAt" < NOW() - INTERVAL '15 minutes'
         AND "attemptCount" >= "maxAttempts"
    `;
    const rows = await tx.$queryRaw<Array<{
      id: string;
      notificationId: string;
      attemptCount: number;
      previousStatus: string;
      previousAttemptCount: number;
      maxAttempts: number;
    }>>`
      WITH ready AS (
        SELECT id, status, "attemptCount"
          FROM "notification_email_deliveries"
         WHERE ((status = 'PENDING' AND "nextAttemptAt" <= NOW())
            OR (status = 'SENDING' AND "lockedAt" < NOW() - INTERVAL '15 minutes'))
           AND "attemptCount" < "maxAttempts"
           ${deliveryFilter}
         ORDER BY "nextAttemptAt", "createdAt"
         FOR UPDATE SKIP LOCKED
         LIMIT ${limit}
      )
      UPDATE "notification_email_deliveries" AS delivery
         SET status = 'SENDING',
             "attemptCount" = delivery."attemptCount" + 1,
             "lockedAt" = NOW(),
             "updatedAt" = NOW()
        FROM ready
       WHERE delivery.id = ready.id
      RETURNING delivery.id, delivery."notificationId", delivery."attemptCount",
                ready.status AS "previousStatus", ready."attemptCount" AS "previousAttemptCount",
                delivery."maxAttempts"
    `;

    for (const row of rows) {
      if (row.previousStatus === 'SENDING' && row.previousAttemptCount > 0) {
        await tx.notificationDeliveryAttempt.updateMany({
          where: {
            deliveryId: row.id,
            attemptNumber: row.previousAttemptCount,
            status: 'STARTED',
          },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            error: 'Worker lease expired before delivery completed.',
          },
        });
      }
      await tx.notificationDeliveryAttempt.create({
        data: {
          id: generateUuidV7(),
          deliveryId: row.id,
          attemptNumber: row.attemptCount,
        },
      });
    }
    return rows;
  });

  let sentCount = 0;
  let failedCount = 0;
  for (const row of claimed) {
    try {
      const delivery = await prisma.notificationEmailDelivery.findUnique({
        where: { id: row.id },
        include: {
          notification: {
            include: { recipientUser: true, recipientContact: true },
          },
        },
      });
      if (!delivery) throw new Error('NOTIFICATION_DELIVERY_NOT_FOUND');

      const notification = delivery.notification;
      const user = notification.recipientUser;
      const contact = notification.recipientContact;
      if (
        notification.realm === 'STAFF' &&
        (!user || !user.isActive || user.deletedAt !== null || !notification.recipientUserId)
      ) {
        throw new Error('NOTIFICATION_STAFF_RECIPIENT_UNAVAILABLE');
      }
      if (
        notification.realm === 'CUSTOMER' &&
        (!contact || !contact.isActive || contact.deletedAt !== null ||
          contact.customerId !== notification.customerId || !notification.recipientContactId)
      ) {
        throw new Error('NOTIFICATION_CUSTOMER_RECIPIENT_UNAVAILABLE');
      }

      const pref = notification.realm === 'STAFF'
        ? await prisma.notificationPreference.findUnique({
            where: {
              recipientUserId_eventType: {
                recipientUserId: notification.recipientUserId,
                eventType: notification.eventType,
              },
            },
          })
        : await prisma.notificationPreference.findUnique({
            where: {
              recipientContactId_eventType: {
                recipientContactId: notification.recipientContactId,
                eventType: notification.eventType,
              },
            },
          });
      if (pref?.emailEnabled === false) throw new Error('NOTIFICATION_EMAIL_DISABLED_BY_RECIPIENT');

      const tmpl = await prisma.notificationTemplate.findFirst({
        where: { eventType: notification.eventType, realm: notification.realm },
      });
      const subject = tmpl?.emailSubject ?? notification.title;
      const textBody = tmpl?.emailBody ?? notification.body;

      const messageId = await emailProvider.send({
        to: user?.email ?? contact!.email,
        subject,
        text: textBody,
        idempotencyKey: row.id,
      });
      await prisma.$transaction(async (tx: DbClient) => {
        await tx.notificationDeliveryAttempt.update({
          where: { deliveryId_attemptNumber: { deliveryId: row.id, attemptNumber: row.attemptCount } },
          data: { status: 'SENT', completedAt: new Date(), providerMessageId: messageId },
        });
        await tx.notificationEmailDelivery.update({
          where: { id: row.id },
          data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null, providerMessageId: messageId },
        });
      });
      sentCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email delivery failure';
      const isPreferenceDisabled = message === 'NOTIFICATION_EMAIL_DISABLED_BY_RECIPIENT';
      const isTerminal = isPreferenceDisabled || row.attemptCount >= row.maxAttempts;
      const retryMinutes = Math.min(24 * 60, 2 ** Math.max(row.attemptCount - 1, 0));
      await prisma.$transaction(async (tx: DbClient) => {
        await tx.notificationDeliveryAttempt.update({
          where: { deliveryId_attemptNumber: { deliveryId: row.id, attemptNumber: row.attemptCount } },
          data: { status: 'FAILED', completedAt: new Date(), error: message },
        });
        await tx.notificationEmailDelivery.update({
          where: { id: row.id },
          data: {
            status: isTerminal ? 'FAILED' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
            lockedAt: null,
            lastError: message.slice(0, 4000),
          },
        });
      });
      failedCount++;
    }
  }

  return { claimedCount: claimed.length, sentCount, failedCount };
}

export async function createPreventiveMaintenanceReminders(now = new Date()) {
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueOrders = await prisma.workOrder.findMany({
    where: {
      type: 'PREVENTIVE',
      status: { in: ['OPEN', 'ASSIGNED'] },
      plannedStart: { gte: now, lte: until },
      assignedUserId: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      workOrderNumber: true,
      plannedStart: true,
      assignedUserId: true,
      branchId: true,
      departmentId: true,
    },
  });

  for (const order of dueOrders) {
    if (!order.assignedUserId || !order.plannedStart) continue;
    await prisma.$transaction((tx: DbClient) => notifyStaff(tx, {
      recipientUserId: order.assignedUserId!,
      eventType: 'PM_REMINDER',
      eventKey: `pm-reminder:${order.id}:${order.plannedStart!.toISOString()}`,
      variables: {
        workOrderNumber: order.workOrderNumber,
        plannedStart: order.plannedStart!.toISOString(),
      },
      context: { branchId: order.branchId, departmentId: order.departmentId },
      link: `/work-orders/${order.id}`,
    }));
  }
  return { remindersConsidered: dueOrders.length };
}

export async function runNotificationWorker() {
  const reminders = await createPreventiveMaintenanceReminders();
  const email = await processNotificationEmailDeliveries();
  return { reminders, email };
}

export async function updateNotificationTemplate(
  actorUserId: string,
  input: {
  realm: 'STAFF' | 'CUSTOMER';
  eventType: string;
  titleTemplate: string;
  bodyTemplate: string;
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
  }
) {
  return prisma.$transaction(async (tx: DbClient) => {
    const template = await tx.notificationTemplate.update({
      where: { realm_eventType: { realm: input.realm, eventType: input.eventType } },
      data: {
        titleTemplate: input.titleTemplate,
        bodyTemplate: input.bodyTemplate,
        emailSubject: input.emailSubject,
        emailBody: input.emailBody,
        isActive: input.isActive,
      },
    });
    await appendAuditLog(tx, {
      actorUserId,
      action: 'UPDATED_NOTIFICATION_TEMPLATE',
      resource: 'notification_template',
      resourceId: template.id,
      payload: { realm: input.realm, eventType: input.eventType, isActive: input.isActive },
    });
    return template;
  });
}

export async function listNotificationTemplates() {
  return prisma.notificationTemplate.findMany({
    orderBy: [{ realm: 'asc' }, { eventType: 'asc' }],
  });
}
