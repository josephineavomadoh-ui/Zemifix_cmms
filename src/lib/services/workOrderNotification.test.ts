// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({ prisma: {} }));
vi.mock('./notificationService', () => ({
  notifyCustomerContact: vi.fn(),
  notifyStaff: vi.fn().mockResolvedValue({ id: 'notification-1' }),
}));

import { prisma } from '../prisma';
import type { AuthenticatedUser } from '../auth';
import { assignWorkOrder } from './workOrderService';
import { notifyStaff } from './notificationService';

describe('work order notification integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an assignment notification in the work order transaction', async () => {
    const updatedAt = new Date('2026-11-10T12:00:00.000Z');
    const workOrder = {
      id: 'work-order-1',
      workOrderNumber: 'WO-2026-000001',
      deletedAt: null,
      assignedUserId: null,
      status: 'OPEN',
      branchId: 'branch-1',
      departmentId: 'department-1',
    };
    const tx = {
      workOrder: {
        findUnique: vi.fn().mockResolvedValue(workOrder),
        update: vi.fn().mockResolvedValue({
          ...workOrder,
          assignedUserId: 'staff-1',
          status: 'ASSIGNED',
          updatedAt,
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ isActive: true, deletedAt: null }),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };
    Object.assign(prisma, {
      $transaction: vi.fn((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    const user: AuthenticatedUser = {
      id: 'staff-1',
      name: 'Technician',
      email: 'technician@example.test',
      roleId: 'role-1',
      role: { id: 'role-1', name: 'Technician' },
      branchId: 'branch-1',
      branch: { id: 'branch-1', name: 'Main', code: 'MAIN', type: 'Branch' },
      accessScope: 'Branch',
      isActive: true,
      locale: 'en',
    };

    await assignWorkOrder(user, {
      workOrderId: workOrder.id,
      assignedUserId: 'staff-1',
    });

    expect(notifyStaff).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        recipientUserId: 'staff-1',
        eventType: 'WORK_ORDER_ASSIGNED',
        eventKey: `work-order-assigned:${workOrder.id}:${updatedAt.toISOString()}`,
        context: { branchId: workOrder.branchId, departmentId: workOrder.departmentId },
      })
    );
  });
});
