import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { generateUuidV7 } from '../src/lib/uuid';
import {
  listNotifications,
  markNotificationRead,
  notifyCustomerContact,
  notifyStaff,
  processNotificationEmailDeliveries,
} from '../src/lib/services/notificationService';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Notification integration test failed: ${message}`);
  console.log(`[PASS] ${message}`);
}

async function run() {
  const suffix = generateUuidV7();
  const roleId = generateUuidV7();
  const branchId = generateUuidV7();
  const userId = generateUuidV7();
  const customerId = generateUuidV7();
  const contactId = generateUuidV7();
  let staffNotificationId: string | undefined;
  let portalNotificationId: string | undefined;

  try {
    const role = await prisma.role.create({
      data: { id: roleId, name: `Notification Test ${suffix.slice(-8)}` },
    });
    const branch = await prisma.branch.create({
      data: {
        id: branchId,
        name: `Notification Test ${suffix.slice(-6)}`,
        code: `NT-${suffix.slice(-8)}`,
      },
    });
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: 'Notification Integration User',
        email: `notification-${suffix}@example.test`,
        passwordHash: 'test-only-not-a-login-hash',
        roleId: role.id,
        branchId: branch.id,
        accessScope: 'Branch',
      },
      include: { role: true, branch: true },
    });
    const customer = await prisma.customer.create({
      data: {
        id: customerId,
        customerNumber: `NT-${suffix}`,
        name: 'Notification Integration Customer',
        billingAddress: 'Test only',
        primaryPhone: '0000000000',
        primaryEmail: `customer-${suffix}@example.test`,
      },
    });
    const contact = await prisma.customerContact.create({
      data: {
        id: contactId,
        customerId: customer.id,
        name: 'Notification Integration Contact',
        email: `contact-${suffix}@example.test`,
        passwordHash: 'test-only-not-a-login-hash',
        canViewFinancials: true,
      },
    });

    const eventKey = `work-order-assigned:notification-integration:${suffix}`;
    const staffNotification = await prisma.$transaction(async (tx) => {
      const first = await notifyStaff(tx, {
        recipientUserId: user.id,
        eventType: 'WORK_ORDER_ASSIGNED',
        eventKey,
        variables: { workOrderNumber: 'WO-TEST', title: 'Test work order' },
        context: { branchId: branch.id },
      });
      const repeated = await notifyStaff(tx, {
        recipientUserId: user.id,
        eventType: 'WORK_ORDER_ASSIGNED',
        eventKey,
        variables: { workOrderNumber: 'WO-TEST', title: 'Test work order' },
        context: { branchId: branch.id },
      });
      if (!first) throw new Error('Staff notification was not created.');
      staffNotificationId = first.id;
      assert(first?.id === repeated?.id, 'Repeated event key resolves to the same persisted notification');
      return first;
    });

    const persistedStaff = await prisma.notification.findMany({
      where: { idempotencyKey: `${eventKey}:${user.id}` },
      include: { emailDelivery: true },
    });
    assert(persistedStaff.length === 1, 'PostgreSQL persists one idempotent in-app notification');
    const deliveryId = persistedStaff[0].emailDelivery?.id;
    if (!deliveryId) throw new Error('Email delivery was not queued.');

    const failed = await processNotificationEmailDeliveries({
      deliveryIds: [deliveryId],
      emailProvider: { send: async () => { throw new Error('integration provider failure'); } },
    });
    assert(failed.failedCount === 1, 'A failed email attempt is recorded for retry');
    const failedState = await prisma.notificationEmailDelivery.findUnique({
      where: { id: deliveryId },
      include: { attempts: true },
    });
    assert(
      failedState?.status === 'PENDING' &&
        failedState.attemptCount === 1 &&
        failedState.attempts[0]?.status === 'FAILED',
      'Failed email delivery remains queued and retains its attempt history'
    );

    await prisma.notificationEmailDelivery.update({
      where: { id: deliveryId },
      data: { nextAttemptAt: new Date(Date.now() - 1_000) },
    });
    const sent = await processNotificationEmailDeliveries({
      deliveryIds: [deliveryId],
      emailProvider: { send: async ({ idempotencyKey }) => `test-${idempotencyKey}` },
    });
    const sentState = await prisma.notificationEmailDelivery.findUnique({
      where: { id: deliveryId },
      include: { attempts: true },
    });
    assert(sent.sentCount === 1 && sentState?.status === 'SENT', 'Retry succeeds and delivery status persists');
    assert(sentState?.attempts.length === 2, 'Each delivery retry has a separate persisted attempt');

    const portalEventKey = `stage-r1-portal-test:${suffix}`;
    const wrongCustomer = await prisma.$transaction((tx) => notifyCustomerContact(tx, {
      recipientContactId: contact.id,
      customerId: generateUuidV7(),
      eventType: 'PORTAL_QUOTE_DECISION',
      eventKey: portalEventKey,
      variables: { quoteNumber: 'QT-TEST' },
    }));
    assert(wrongCustomer === null, 'Portal notification creation rejects a mismatched customer account');

    const portalNotification = await prisma.$transaction((tx) => notifyCustomerContact(tx, {
      recipientContactId: contact.id,
      customerId: customer.id,
      eventType: 'PORTAL_QUOTE_DECISION',
      eventKey: portalEventKey,
      variables: { quoteNumber: 'QT-TEST' },
    }));
    if (!portalNotification) throw new Error('Portal notification was not created.');
    portalNotificationId = portalNotification.id;

    const staffFeed = await listNotifications({ realm: 'STAFF', userId: user.id });
    const portalFeed = await listNotifications({ realm: 'CUSTOMER', contactId: contact.id });
    assert(staffFeed.notifications.some((item) => item.id === staffNotification.id), 'Staff feed reads only staff-owned notifications');
    assert(portalFeed.notifications.some((item) => item.id === portalNotification.id), 'Portal feed reads the authenticated customer contact notifications');
    assert(
      await markNotificationRead({ realm: 'STAFF', userId: generateUuidV7() }, staffNotification.id) === 0,
      'Another staff identity cannot change this notification read state'
    );
    await markNotificationRead({ realm: 'STAFF', userId: user.id }, staffNotification.id, true);
    await markNotificationRead({ realm: 'STAFF', userId: user.id }, staffNotification.id, false);
    const unreadAgain = await prisma.notification.findUnique({ where: { id: staffNotification.id } });
    assert(unreadAgain?.readAt === null, 'Owner can mark notifications read and unread');
  } finally {
    if (staffNotificationId || portalNotificationId) {
      await prisma.notification.deleteMany({
        where: { id: { in: [staffNotificationId, portalNotificationId].filter(
          (id): id is string => Boolean(id)
        ) } },
      });
    }
    await prisma.customerContact.deleteMany({ where: { id: contactId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.branch.deleteMany({ where: { id: branchId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
