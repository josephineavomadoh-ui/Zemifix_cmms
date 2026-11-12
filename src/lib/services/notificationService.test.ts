// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));

import { prisma } from '../prisma';
import {
  notifyCustomerContact,
  notifyStaff,
  processNotificationEmailDeliveries,
} from './notificationService';

describe('notification event generation', () => {
  let tx: any;
  let inserted = 0;

  beforeEach(() => {
    inserted = 0;
    tx = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'staff-1',
          branchId: 'branch-1',
          departmentId: 'department-1',
          accessScope: 'Branch',
        }),
      },
      customerContact: { findFirst: vi.fn() },
      branch: { findUnique: vi.fn() },
      userScopeGrant: { findFirst: vi.fn().mockResolvedValue(null) },
      notificationTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          isActive: true,
          titleTemplate: '{{workOrderNumber}} assigned',
          bodyTemplate: 'Assigned to {{name}}',
          emailSubject: 'Work order {{workOrderNumber}}',
          emailBody: 'Work order {{workOrderNumber}} assigned',
        }),
      },
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      notification: {
        createMany: vi.fn().mockImplementation(async () => ({ count: ++inserted === 1 ? 1 : 0 })),
        findUnique: vi.fn().mockResolvedValue({ id: 'notification-1' }),
      },
      notificationEmailDelivery: { create: vi.fn().mockResolvedValue({ id: 'delivery-1' }) },
    };
  });

  it('creates one in-app row and one email delivery for repeated event keys', async () => {
    const input = {
      recipientUserId: 'staff-1',
      eventType: 'WORK_ORDER_ASSIGNED',
      eventKey: 'work-order-assigned:wo-1',
      variables: { workOrderNumber: 'WO-1', title: 'Pump repair', name: 'Technician' },
      context: { branchId: 'branch-1', departmentId: 'department-1' },
    };

    await notifyStaff(tx, input);
    await notifyStaff(tx, input);

    expect(tx.notification.createMany).toHaveBeenCalledTimes(2);
    expect(tx.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
    expect(tx.notificationEmailDelivery.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.createMany.mock.calls[0][0].data[0]).toMatchObject({
      realm: 'STAFF',
      recipientUserId: 'staff-1',
      title: 'WO-1 assigned',
      body: 'Assigned to Technician',
    });
  });

  it('does not disclose a staff event across branches without an organizational grant', async () => {
    tx.user.findFirst.mockResolvedValue({
      id: 'staff-1',
      branchId: 'another-branch',
      departmentId: null,
      accessScope: 'Branch',
    });

    const result = await notifyStaff(tx, {
      recipientUserId: 'staff-1',
      eventType: 'WORK_ORDER_ASSIGNED',
      eventKey: 'work-order-assigned:wo-1',
      variables: { workOrderNumber: 'WO-1', title: 'Internal work' },
      context: { branchId: 'branch-1' },
    });

    expect(result).toBeNull();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('does not route portal notifications to a contact from another customer', async () => {
    tx.customerContact.findFirst.mockResolvedValue(null);

    const result = await notifyCustomerContact(tx, {
      recipientContactId: 'contact-1',
      customerId: 'customer-1',
      eventType: 'PORTAL_QUOTE_DECISION',
      eventKey: 'quote-decision:quote-1',
      variables: { quoteNumber: 'QT-1' },
    });

    expect(result).toBeNull();
    expect(tx.notificationTemplate.findUnique).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it('records a failed provider attempt and schedules a retry without removing the notification', async () => {
    const deliveryRow = {
      id: 'delivery-1',
      notificationId: 'notification-1',
      attemptCount: 1,
      previousStatus: 'PENDING',
      previousAttemptCount: 0,
      maxAttempts: 5,
    };
    const deliveryState = {
      notification: {
        realm: 'STAFF',
        recipientUserId: 'staff-1',
        recipientContactId: null,
        customerId: null,
        eventType: 'WORK_ORDER_ASSIGNED',
        emailSubject: 'Assigned',
        emailBody: 'Work order assigned',
        recipientUser: { email: 'staff@example.test', isActive: true, deletedAt: null },
        recipientContact: null,
      },
    };
    const updateAttempt = vi.fn().mockResolvedValue({});
    const updateDelivery = vi.fn().mockResolvedValue({});
    const transactionClient = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi.fn().mockResolvedValue([deliveryRow]),
      notificationDeliveryAttempt: {
        create: vi.fn().mockResolvedValue({}),
        update: updateAttempt,
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      notificationEmailDelivery: { update: updateDelivery },
    };
    Object.assign(prisma as any, {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(transactionClient)),
      notificationEmailDelivery: {
        findUnique: vi.fn().mockResolvedValue(deliveryState),
      },
      notificationPreference: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const emailProvider = {
      send: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    };

    const result = await processNotificationEmailDeliveries({
      batchSize: 10,
      emailProvider,
      deliveryIds: ['delivery-1'],
    });

    expect(result).toEqual({ claimedCount: 1, sentCount: 0, failedCount: 1 });
    expect(emailProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'staff@example.test',
      idempotencyKey: 'delivery-1',
    }));
    expect(updateAttempt).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', error: 'provider unavailable' }),
    }));
    expect(updateDelivery).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING', lastError: 'provider unavailable' }),
    }));
  });
});
