import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { getScopedWorkOrderFilter, transitionWorkOrderStatus, recordWorkOrderLabor } from './workOrderService';
import { issueMaterialToWorkOrder, postStockTransaction } from './inventoryService';
import { submitMeterReading, logDowntimeStart } from './telemetryService';

export interface QueuedMutationItem {
  idempotencyKey: string;
  actionType: string; // WORK_ORDER_STATUS_SHIFT | CHECKLIST_UPDATE | LABOR_LOG | MATERIAL_ISSUE_REQUEST | METER_READING | DOWNTIME_START
  entityType: string; // work_order | checklist_item | labor | part | meter | asset
  entityId: string;
  payload: any;
}

/**
 * Recovers crashed processing leases by resetting stale mutations (> 5 minutes) to QUEUED
 */
export async function recoverCrashedSyncLeases() {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  return await prisma.offlineSyncMutation.updateMany({
    where: {
      status: 'PROCESSING',
      processingLeaseExpiresAt: { lt: fiveMinsAgo },
    },
    data: {
      status: 'QUEUED',
      processingLeaseExpiresAt: null,
    },
  });
}

/**
 * Core Batch Sync Handler with 2-Step Conflict Safety and Server-Authoritative Valuation
 */
export async function processSyncBatch(
  user: AuthenticatedUser,
  params: {
    batchRef?: string;
    mutations: QueuedMutationItem[];
  }
) {
  await recoverCrashedSyncLeases();

  const ts = Date.now();
  const batchRef = params.batchRef ?? `BATCH-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;
  const batchUuid = generateUuidV7();

  // Create Batch Envelope
  const batch = await prisma.offlineSyncBatch.create({
    data: {
      id: batchUuid,
      batchRef,
      userId: user.id,
      status: 'PROCESSING',
      mutationCount: params.mutations.length,
    },
  });

  const results: any[] = [];
  let syncedCount = 0;
  let conflictCount = 0;
  let failedCount = 0;

  for (const item of params.mutations) {
    // 1. Idempotency Guard (Check if mutation key already processed for this user)
    const existingMutation = await prisma.offlineSyncMutation.findUnique({
      where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: item.idempotencyKey } },
      include: { conflicts: true },
    });

    if (existingMutation) {
      if (existingMutation.status === 'SYNCED') {
        syncedCount++;
        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'SYNCED',
          message: 'Idempotency: Previously synced successfully.',
        });
        continue;
      }

      if (existingMutation.status === 'CONFLICT') {
        conflictCount++;
        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'CONFLICT',
          conflict: existingMutation.conflicts[0] ?? null,
          message: 'Idempotency: Previously flagged as conflict.',
        });
        continue;
      }

      if (existingMutation.status === 'PROCESSING') {
        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'PROCESSING',
          message: 'Mutation currently being processed by server.',
        });
        continue;
      }
    }

    // 2. Create mutation record with lease timeout (5 minutes)
    const mutationUuid = generateUuidV7();
    const leaseExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const mutationRecord = await prisma.offlineSyncMutation.create({
      data: {
        id: mutationUuid,
        batchId: batch.id,
        userId: user.id,
        idempotencyKey: item.idempotencyKey,
        actionType: item.actionType,
        entityType: item.entityType,
        entityId: item.entityId,
        payload: item.payload ?? {},
        status: 'PROCESSING',
        processingLeaseExpiresAt: leaseExpiry,
      },
    });

    // 3. Independent Mutation Processing (Two-Step Conflict Safety)
    try {
      // Step A: Attempt business operation in isolated transaction
      const mutationResult = await prisma.$transaction(async (tx: any) => {
        return await executeSingleOfflineMutation(tx, user, item);
      });

      // Step B: Mark mutation as SYNCED
      await prisma.offlineSyncMutation.update({
        where: { id: mutationRecord.id },
        data: {
          status: 'SYNCED',
          processedAt: new Date(),
          processingLeaseExpiresAt: null,
        },
      });

      syncedCount++;
      results.push({
        idempotencyKey: item.idempotencyKey,
        status: 'SYNCED',
        result: mutationResult,
      });
    } catch (err: any) {
      // Check if error is a detected business conflict
      const isConflict = [
        'FINALIZED_WORK_ORDER',
        'INCOMPLETE_CHECKLISTS',
        'INSUFFICIENT_STOCK',
        'UNAUTHORIZED_WORK_ORDER',
        'WO_STATUS_MISMATCH',
      ].some((code) => err.message?.includes(code));

      if (isConflict) {
        conflictCount++;
        const conflictType = err.message?.includes('INSUFFICIENT_STOCK')
          ? 'STOCK_UNAVAILABLE'
          : err.message?.includes('FINALIZED_WORK_ORDER')
          ? 'WO_CANCELLED'
          : 'WO_STATUS_MISMATCH';

        // 2-Step Conflict Safety: Save conflict in independent transaction AFTER business tx rolled back
        const conflictRecord = await prisma.$transaction(async (tx: any) => {
          await tx.offlineSyncMutation.update({
            where: { id: mutationRecord.id },
            data: {
              status: 'CONFLICT',
              conflictReason: err.message,
              processedAt: new Date(),
              processingLeaseExpiresAt: null,
            },
          });

          return await tx.offlineSyncConflict.create({
            data: {
              id: generateUuidV7(),
              mutationId: mutationRecord.id,
              userId: user.id,
              conflictType,
              clientState: item.payload ?? {},
              serverState: { error: err.message },
              resolutionStrategy: 'SERVER_WINS',
            },
          });
        });

        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'CONFLICT',
          conflictType,
          reason: err.message,
          conflict: conflictRecord,
        });
      } else {
        failedCount++;
        await prisma.offlineSyncMutation.update({
          where: { id: mutationRecord.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            processedAt: new Date(),
            processingLeaseExpiresAt: null,
          },
        });

        results.push({
          idempotencyKey: item.idempotencyKey,
          status: 'FAILED',
          error: err.message,
        });
      }
    }
  }

  // 4. Update Batch Final Status
  const batchStatus = failedCount === 0 && conflictCount === 0 ? 'COMPLETED' : 'PARTIALLY_COMPLETED';

  const updatedBatch = await prisma.offlineSyncBatch.update({
    where: { id: batch.id },
    data: {
      status: batchStatus,
      syncedCount,
      conflictCount,
      failedCount,
      processedAt: new Date(),
    },
  });

  return {
    batchId: updatedBatch.id,
    batchRef: updatedBatch.batchRef,
    status: batchStatus,
    syncedCount,
    conflictCount,
    failedCount,
    results,
  };
}

/**
 * Executes a single mutation inside isolated business transaction
 */
async function executeSingleOfflineMutation(tx: any, user: AuthenticatedUser, item: QueuedMutationItem) {
  // 1. Revalidate Work Order Access Scope if mutation targets a Work Order
  if (['work_order', 'labor', 'part', 'checklist_item'].includes(item.entityType)) {
    const scopeFilter = await getScopedWorkOrderFilter(user);
    const woId = item.payload.workOrderId ?? item.entityId;

    const wo = await tx.workOrder.findFirst({
      where: {
        id: woId,
        ...scopeFilter,
      },
    });

    if (!wo) {
      throw new Error('UNAUTHORIZED_WORK_ORDER: Work order is not accessible within user organizational scope.');
    }
  }

  // 2. Dispatch Action Types
  if (item.actionType === 'WORK_ORDER_STATUS_SHIFT') {
    return await transitionWorkOrderStatus(user, {
      workOrderId: item.payload.workOrderId ?? item.entityId,
      newStatus: item.payload.newStatus,
      reason: item.payload.reason ?? 'Offline status transition',
    });
  }

  if (item.actionType === 'LABOR_LOG') {
    // SERVER-AUTHORITATIVE VALUATION: Server uses standard cost rate (GHS 50/hr), ignoring client claim
    return await recordWorkOrderLabor(user, {
      workOrderId: item.payload.workOrderId,
      technicianUserId: user.id,
      workDate: item.payload.workDate ? new Date(item.payload.workDate) : new Date(),
      hoursWorked: parseFloat(item.payload.hoursWorked),
      hourlyRate: 50.0, // Server-Authoritative Rate
      description: item.payload.description ?? 'Offline technician labor log',
    });
  }

  if (item.actionType === 'MATERIAL_ISSUE_REQUEST') {
    // SERVER-AUTHORITATIVE VALUATION: issueMaterialToWorkOrder calculates store WAC automatically
    return await issueMaterialToWorkOrder(user, {
      workOrderId: item.payload.workOrderId,
      storeId: item.payload.storeId,
      partId: item.payload.partId,
      quantity: parseFloat(item.payload.quantity),
    });
  }

  if (item.actionType === 'CHECKLIST_UPDATE') {
    const itemRecord = await tx.workOrderChecklistItem.findUnique({
      where: { id: item.payload.checklistItemId ?? item.entityId },
    });

    if (!itemRecord) throw new Error('CHECKLIST_ITEM_NOT_FOUND: Checklist item does not exist.');
    if (itemRecord.passFail !== null) {
      throw new Error('CHECKLIST_ALREADY_COMPLETED: Checklist item was already completed on server.');
    }

    return await tx.workOrderChecklistItem.update({
      where: { id: itemRecord.id },
      data: {
        passFail: item.payload.passFail ?? true,
        remarks: item.payload.remarks ?? 'Completed via Technician PWA',
        completedAt: new Date(),
        completedByUserId: user.id,
      },
    });
  }

  if (item.actionType === 'METER_READING') {
    return await submitMeterReading(tx, {
      meterId: item.payload.meterId ?? item.entityId,
      readingValue: parseFloat(item.payload.readingValue),
      readingTimestamp: item.payload.readingTimestamp ? new Date(item.payload.readingTimestamp) : new Date(),
      isRollover: item.payload.isRollover,
      isReset: item.payload.isReset,
      recordedByUserId: user.id,
    });
  }

  if (item.actionType === 'DOWNTIME_START') {
    return await logDowntimeStart(tx, {
      assetId: item.payload.assetId ?? item.entityId,
      downtimeType: item.payload.downtimeType ?? 'UNPLANNED',
      reason: item.payload.reason ?? 'Logged via Technician PWA',
      startedAt: item.payload.startedAt ? new Date(item.payload.startedAt) : new Date(),
      loggedByUserId: user.id,
    });
  }

  throw new Error(`UNSUPPORTED_ACTION_TYPE: Action type "${item.actionType}" is not in offline allowlist.`);
}
