import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

export async function createMeter(
  tx: any,
  params: {
    assetId: string;
    name: string;
    unitOfMeasure: string;
    meterType?: 'CONTINUOUS_INCREMENTAL' | 'ABSOLUTE_GAUGE';
    initialReading?: number;
    rolloverThreshold?: number;
  }
) {
  const meterUuid = generateUuidV7();
  const initVal = new Prisma.Decimal(params.initialReading ?? 0);
  const thresholdVal = params.rolloverThreshold ? new Prisma.Decimal(params.rolloverThreshold) : null;

  return await tx.assetMeter.create({
    data: {
      id: meterUuid,
      assetId: params.assetId,
      name: params.name,
      unitOfMeasure: params.unitOfMeasure,
      meterType: params.meterType ?? 'CONTINUOUS_INCREMENTAL',
      initialReading: initVal,
      currentReading: initVal,
      rolloverThreshold: thresholdVal,
    },
  });
}

export async function submitMeterReading(
  tx: any,
  params: {
    meterId: string;
    readingValue: number;
    readingTimestamp?: Date;
    isRollover?: boolean;
    isReset?: boolean;
    recordedByUserId: string;
  }
) {
  if (params.readingValue === undefined || params.readingValue === null || !Number.isFinite(params.readingValue)) {
    throw new Error('INVALID_NUMERIC_READING: Meter reading value must be a valid finite number.');
  }

  // Step 1: Unlocked metadata discovery
  const meterMeta = await tx.assetMeter.findUnique({
    where: { id: params.meterId },
    select: { id: true, assetId: true },
  });

  if (!meterMeta) throw new Error('METER_NOT_FOUND: Asset meter does not exist.');

  // Step 2: LOCK ASSET ROW FOR UPDATE FIRST (Strict Lock Hierarchy)
  const [asset] = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "assets" WHERE id = ${meterMeta.assetId}::uuid FOR UPDATE
  `;
  if (!asset) throw new Error('ASSET_NOT_FOUND: Parent asset does not exist.');

  // Step 3: LOCK ASSET METER ROW FOR UPDATE SECOND
  const [meter] = await tx.$queryRaw<Array<{
    id: string;
    assetId: string;
    meterType: string;
    currentReading: string;
    rolloverThreshold: string | null;
    lastReadingAt: Date | null;
  }>>`
    SELECT id, "assetId", "meterType", "currentReading"::text as "currentReading",
           "rolloverThreshold"::text as "rolloverThreshold", "lastReadingAt"
      FROM "asset_meters"
     WHERE id = ${params.meterId}::uuid
    FOR UPDATE
  `;

  if (meter.assetId !== asset.id) {
    throw new Error('METER_ASSET_MISMATCH: Meter parent asset changed during lock acquisition.');
  }

  if (params.isRollover && params.isReset) {
    throw new Error('MUTUAL_EXCLUSION: isRollover and isReset cannot both be true.');
  }

  const timestamp = params.readingTimestamp ?? new Date();
  if (meter.lastReadingAt && timestamp <= new Date(meter.lastReadingAt)) {
    throw new Error('OUT_OF_ORDER_TIMESTAMP: Reading timestamp must be strictly greater than lastReadingAt.');
  }

  const currentVal = new Prisma.Decimal(meter.currentReading);
  const newVal = new Prisma.Decimal(params.readingValue);
  let delta = new Prisma.Decimal(0);

  if (meter.meterType === 'CONTINUOUS_INCREMENTAL') {
    if (params.isReset) {
      delta = newVal;
    } else if (params.isRollover) {
      if (!meter.rolloverThreshold) {
        throw new Error('INVALID_ROLLOVER: Meter has no configured rollover threshold.');
      }
      const threshold = new Prisma.Decimal(meter.rolloverThreshold);
      if (newVal.gte(threshold)) {
        throw new Error(`INVALID_ROLLOVER_VALUE: Rollover reading (${newVal}) must be strictly less than threshold (${threshold}).`);
      }
      delta = threshold.sub(currentVal).add(newVal);
    } else {
      if (newVal.lt(currentVal)) {
        throw new Error(`INVALID_METER_READING: Incremental reading (${newVal}) cannot be less than current reading (${currentVal}).`);
      }
      delta = newVal.sub(currentVal);
    }
  } else {
    // ABSOLUTE_GAUGE: allows positive, negative, or zero delta (e.g. 85°C -> 72°C produces -13.00 delta)
    delta = newVal.sub(currentVal);
  }

  const readingUuid = generateUuidV7();

  // Step 4: Persist Reading and Update Meter Atomically
  await tx.$executeRaw`
    INSERT INTO "meter_readings" (
      "id", "meterId", "readingValue", "delta", "isRollover", "isReset", "recordedByUserId", "readingTimestamp"
    ) VALUES (
      ${readingUuid}::uuid, ${meter.id}::uuid, ${newVal}, ${delta},
      ${params.isRollover ?? false}, ${params.isReset ?? false},
      ${params.recordedByUserId}::uuid, ${timestamp}
    )
  `;

  await tx.assetMeter.update({
    where: { id: meter.id },
    data: { currentReading: newVal, lastReadingAt: timestamp },
  });

  return { readingId: readingUuid, delta: delta.toString(), newReading: newVal.toString() };
}

export async function logDowntimeStart(
  tx: any,
  params: {
    assetId: string;
    downtimeType: 'UNPLANNED' | 'PLANNED';
    reason: string;
    startedAt: Date;
    loggedByUserId: string;
  }
) {
  // 1. LOCK ASSET ROW FOR UPDATE FIRST (Strict Lock Order: Asset 1st, DowntimeLog 2nd)
  const [asset] = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status FROM "assets" WHERE id = ${params.assetId}::uuid FOR UPDATE
  `;

  if (!asset) throw new Error('ASSET_NOT_FOUND: Target asset does not exist.');
  if (asset.status === 'RETIRED' || asset.status === 'DISPOSED') {
    throw new Error('TERMINAL_ASSET_STATUS: Retired or disposed assets cannot enter downtime.');
  }

  const previousAssetStatus = asset.status;
  let statusWasChanged = false;
  let downStatusTransitionId: string | null = null;

  if (params.downtimeType === 'UNPLANNED' && asset.status !== 'DOWN') {
    statusWasChanged = true;
    downStatusTransitionId = generateUuidV7();

    await tx.asset.update({
      where: { id: asset.id },
      data: { status: 'DOWN' },
    });

    await tx.$executeRaw`
      INSERT INTO "asset_status_history" ("id", "assetId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
      VALUES (${downStatusTransitionId}::uuid, ${asset.id}::uuid, ${previousAssetStatus}::"AssetStatus", 'DOWN'::"AssetStatus", ${params.loggedByUserId}::uuid, 'Unplanned downtime started', ${params.startedAt})
    `;
  }

  const downtimeUuid = generateUuidV7();

  // 2. INSERT DOWNTIME LOG SECOND (Partial Unique Index enforces 1 open record)
  await tx.assetDowntimeLog.create({
    data: {
      id: downtimeUuid,
      assetId: asset.id,
      downtimeType: params.downtimeType,
      previousAssetStatus: previousAssetStatus as any,
      statusWasChanged,
      downStatusTransitionId,
      reason: params.reason,
      startedAt: params.startedAt,
      loggedByUserId: params.loggedByUserId,
    },
  });

  return { downtimeLogId: downtimeUuid, previousAssetStatus, statusWasChanged, downStatusTransitionId };
}

export async function logDowntimeEnd(
  tx: any,
  params: {
    downtimeLogId: string;
    loggedByUserId: string;
  }
) {
  // 1. LOCK ASSET ROW FOR UPDATE FIRST (Strict Lock Order: Asset 1st, DowntimeLog 2nd)
  const [downtimeRef] = await tx.$queryRaw<Array<{ assetId: string }>>`
    SELECT "assetId" FROM "asset_downtime_logs" WHERE id = ${params.downtimeLogId}::uuid
  `;
  if (!downtimeRef) throw new Error('DOWNTIME_LOG_NOT_FOUND: Downtime log record does not exist.');

  const [asset] = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status FROM "assets" WHERE id = ${downtimeRef.assetId}::uuid FOR UPDATE
  `;

  if (!asset) throw new Error('ASSET_NOT_FOUND: Target asset does not exist.');

  // 2. LOCK ASSET DOWNTIME LOG FOR UPDATE SECOND
  const [downtime] = await tx.$queryRaw<Array<{
    id: string;
    assetId: string;
    previousAssetStatus: string;
    statusWasChanged: boolean;
    downStatusTransitionId: string | null;
    startedAt: Date;
    endedAt: Date | null;
  }>>`
    SELECT id, "assetId", "previousAssetStatus", "statusWasChanged", "downStatusTransitionId", "startedAt", "endedAt"
      FROM "asset_downtime_logs"
     WHERE id = ${params.downtimeLogId}::uuid
    FOR UPDATE
  `;

  if (downtime.endedAt !== null) throw new Error('DOWNTIME_ALREADY_CLOSED: Downtime log is already closed.');

  const now = new Date();
  const durationMinutes = Math.round((now.getTime() - new Date(downtime.startedAt).getTime()) / 60000);

  // 3. Update Downtime Log (One-time closure permitted by trigger)
  await tx.assetDowntimeLog.update({
    where: { id: downtime.id },
    data: { endedAt: now, durationMinutes },
  });

  // 4. Safe Status Restoration Policy with Originating Transition Matching
  const currentStatus = asset.status;

  if (
    downtime.statusWasChanged &&
    currentStatus === 'DOWN' &&
    currentStatus !== 'RETIRED' &&
    currentStatus !== 'DISPOSED' &&
    downtime.downStatusTransitionId
  ) {
    const [latestHistory] = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "asset_status_history"
       WHERE "assetId" = ${asset.id}::uuid
       ORDER BY "changedAt" DESC, id DESC
       LIMIT 1
    `;

    if (latestHistory && latestHistory.id === downtime.downStatusTransitionId) {
      const restoredStatus = downtime.previousAssetStatus;
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: restoredStatus as any },
      });

      const statusHistUuid = generateUuidV7();
      await tx.$executeRaw`
        INSERT INTO "asset_status_history" ("id", "assetId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
        VALUES (${statusHistUuid}::uuid, ${asset.id}::uuid, 'DOWN'::"AssetStatus", ${restoredStatus}::"AssetStatus", ${params.loggedByUserId}::uuid, 'Downtime ended', ${now})
      `;
    }
  }

  return { downtimeLogId: downtime.id, durationMinutes };
}
