import crypto from 'crypto';
import { prisma } from '../prisma';
import { canonicalizeJson } from './canonicalJson';
import { generateUuidV7 } from '../uuid';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const AUDIT_ADVISORY_LOCK_ID = 19842026;

export interface AuditEntryInput {
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId: string;
  payload: Record<string, unknown>;
}

export async function appendAuditLog(
  tx: any,
  input: AuditEntryInput
): Promise<{ sequenceNumber: bigint; hash: string }> {
  // 1. Transaction-level advisory lock via $executeRaw (serializes sequence allocation)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_ADVISORY_LOCK_ID})`;

  // 2. Retrieve last sequence number and hash using numeric BigInt ordering
  const [lastAudit] = await tx.$queryRaw<Array<{ sequenceNumber: string; hash: string }>>`
    SELECT "sequenceNumber"::text as "sequenceNumber", hash
      FROM "audit_logs"
     ORDER BY "sequenceNumber"::bigint DESC
     LIMIT 1
  `;

  const sequenceNumber = lastAudit ? BigInt(lastAudit.sequenceNumber) + 1n : 1n;
  const prevHash = lastAudit ? lastAudit.hash : GENESIS_HASH;
  const now = new Date();
  const auditUuid = generateUuidV7();

  // 3. Construct Named Canonical Audit Payload for Hash Calculation
  const auditCanonicalObject = {
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    createdAt: now.toISOString(),
    payload: input.payload,
    prevHash,
    resource: input.resource,
    resourceId: input.resourceId,
    sequenceNumber: sequenceNumber.toString(),
  };

  const canonicalPayloadString = canonicalizeJson(auditCanonicalObject);
  const hash = crypto.createHash('sha256').update(canonicalPayloadString).digest('hex');

  const jsonbPayloadString = canonicalizeJson(input.payload);

  // 4. Raw SQL Insert with Explicit sequenceNumber inside the SAME transaction
  await tx.$executeRaw`
    INSERT INTO "audit_logs" (
      "sequenceNumber", "id", "actorUserId", "action", "resource", "resourceId", "payload", "prevHash", "hash", "createdAt"
    ) VALUES (
      ${sequenceNumber},
      ${auditUuid}::uuid,
      ${input.actorUserId ? input.actorUserId : null}::uuid,
      ${input.action},
      ${input.resource},
      ${input.resourceId},
      ${jsonbPayloadString}::jsonb,
      ${prevHash},
      ${hash},
      ${now}
    )
  `;

  return { sequenceNumber, hash };
}

export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAtSequence?: bigint }> {
  const logs = await prisma.auditLog.findMany({
    orderBy: { sequenceNumber: 'asc' },
  });

  let expectedSequenceNumber = 1n;
  let expectedPrevHash = GENESIS_HASH;

  for (const entry of logs) {
    if (entry.sequenceNumber !== expectedSequenceNumber) {
      return { valid: false, brokenAtSequence: entry.sequenceNumber };
    }

    const auditCanonicalObject = {
      action: entry.action,
      actorUserId: entry.actorUserId ?? null,
      createdAt: entry.createdAt.toISOString(),
      payload: entry.payload as Record<string, unknown>,
      prevHash: expectedPrevHash,
      resource: entry.resource,
      resourceId: entry.resourceId,
      sequenceNumber: entry.sequenceNumber.toString(),
    };

    const recalculatedHash = crypto
      .createHash('sha256')
      .update(canonicalizeJson(auditCanonicalObject))
      .digest('hex');

    if (recalculatedHash !== entry.hash || entry.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtSequence: entry.sequenceNumber };
    }

    expectedPrevHash = entry.hash;
    expectedSequenceNumber += 1n;
  }

  return { valid: true };
}
