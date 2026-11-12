import { prisma } from '../prisma';
import { appendAuditLog } from './auditService';
import crypto from 'crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Distributed database-backed atomic rate-limiting service using PostgreSQL UPSERT
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number,
  actorUserId?: string
): Promise<RateLimitResult> {
  const hashId = crypto.createHash('sha256').update(`${action}:${identifier}`).digest('hex');
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;
  const windowExpiresAt = new Date(now.getTime() + windowMs);

  try {
    const rows = await prisma.$queryRaw<Array<{ hitCount: number; windowExpiresAt: Date }>>`
      INSERT INTO "rate_limits" ("id", "key", "hitCount", "windowExpiresAt", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${hashId}, 1, ${windowExpiresAt}, NOW(), NOW())
      ON CONFLICT ("key") DO UPDATE
      SET "hitCount" = CASE
        WHEN "rate_limits"."windowExpiresAt" < ${now} THEN 1
        ELSE "rate_limits"."hitCount" + 1
      END,
      "windowExpiresAt" = CASE
        WHEN "rate_limits"."windowExpiresAt" < ${now} THEN ${windowExpiresAt}
        ELSE "rate_limits"."windowExpiresAt"
      END,
      "updatedAt" = NOW()
      RETURNING "hitCount", "windowExpiresAt";
    `;

    const hitCount = rows[0]?.hitCount ?? 1;
    const expiresAt = rows[0]?.windowExpiresAt ?? windowExpiresAt;

    if (hitCount > maxAttempts) {
      const retryAfterSeconds = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000);

      await appendAuditLog(prisma, {
        actorUserId: actorUserId ?? null,
        action: 'RATE_LIMIT_EXCEEDED',
        resource: 'rate_limit',
        resourceId: hashId.slice(0, 32),
        payload: { action, hitCount, maxAttempts },
      });

      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
    }

    const remaining = Math.max(0, maxAttempts - hitCount);
    return { allowed: true, remaining, retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[RateLimit] Database error during rate limit check:', err);
    return { allowed: true, remaining: 1, retryAfterSeconds: 0 };
  }
}
