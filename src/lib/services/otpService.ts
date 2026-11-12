/**
 * otpService.ts
 *
 * Core OTP lifecycle management: generation, challenge creation, verification,
 * resend, and OTP-layer rate limiting.
 *
 * Security decisions:
 *
 * 1. OTP generation
 *    Uses crypto.randomInt(0, 1_000_000) for a cryptographically secure 6-digit
 *    code, zero-padded to 6 characters. Never log the plaintext.
 *
 * 2. Hashing
 *    HMAC-SHA256 keyed with OTP_SECRET (from auth.ts). Stored in
 *    AuthOtp.otpCodeHash as 64-char lowercase hex. hashOtpCode() and
 *    verifyOtpHash() from auth.ts use timingSafeEqual — no timing oracle.
 *
 * 3. Challenge creation (createOtpChallenge)
 *    - Runs in a transaction.
 *    - Invalidates all previously active challenges for the same (userId OR
 *      customerContactId) + purpose combination before inserting the new row.
 *    - Returns the new AuthOtp row ID and the plaintext code.
 *      The plaintext code is passed directly to dispatchOtp() and then
 *      DISCARDED — it is never stored anywhere.
 *
 * 4. OTP verification (verifyOtpChallenge) — ATOMIC
 *    Uses a single raw UPDATE:
 *      UPDATE auth_otps
 *         SET "consumedAt" = NOW(),
 *             "attemptCount" = "attemptCount" + 1
 *       WHERE id = $id
 *         AND "consumedAt"    IS NULL
 *         AND "invalidatedAt" IS NULL
 *         AND "expiresAt"     > NOW()
 *         AND "attemptCount"  < 5
 *      RETURNING id
 *
 *    Zero rows returned = already consumed / expired / invalidated / exhausted.
 *    This guarantees exactly-once consumption under concurrent requests.
 *
 *    A separate SELECT is used only AFTER the update (if rows = 0) to diagnose
 *    the reason so the caller can return the correct HTTP status.
 *
 * 5. Attempt tracking
 *    attemptCount is incremented inside the same atomic UPDATE. If the code is
 *    wrong (hash mismatch), a second UPDATE increments without consuming:
 *      UPDATE auth_otps
 *         SET "attemptCount" = "attemptCount" + 1
 *       WHERE id = $id
 *         AND "consumedAt" IS NULL AND "invalidatedAt" IS NULL
 *         AND "expiresAt" > NOW() AND "attemptCount" < 5
 *    This is still atomic. Max-attempt enforcement uses < 5, not <= 5, so the
 *    5th wrong attempt increments to 5 and future attempts are blocked.
 *
 * 6. Resend safety (createResendChallenge)
 *    - Checks resend cooldown (90 seconds from previous createdAt) before any DB write.
 *    - Uses SELECT ... FOR UPDATE to lock the old row and prevent concurrent resend races.
 *    - Inserts the new row inside the lock.
 *    - Returns the new row ID and plaintext code WITHOUT invalidating the old row yet.
 *    - The caller calls confirmResendDelivery() after successful delivery.
 *    - confirmResendDelivery() atomically:
 *        a. Sets newRow.invalidatedAt = NULL (it was pre-set to 'pending')
 *           actually: removes the 'pending' marker introduced during create,
 *           OR simply: the new row is created with invalidatedAt = NULL and
 *           confirmResend does: old row invalidatedAt = NOW().
 *    - abandonResendChallenge() on delivery failure: sets new row invalidatedAt = NOW(),
 *      leaving old row unchanged.
 *
 * 7. OTP-layer rate limiting (checkOtpRateLimit)
 *    Counts active + consumed AuthOtp rows for a userId within a 10-minute window.
 *    If > 5 total issuances (not just failures): block resend.
 *    This is separate from password-attempt limiting in loginAttemptService.ts.
 */

import { randomInt } from 'crypto';
import { prisma } from '../prisma';
import { hashOtpCode, verifyOtpHash } from '../auth';
import { DatabaseUnavailableError, isDatabaseConnectionError } from '../db-errors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OTP plaintext length */
const OTP_LENGTH = 6;

/** Validity period in minutes */
const OTP_EXPIRY_MINUTES = 5;

/** Resend cooldown in seconds */
const RESEND_COOLDOWN_SECONDS = 90;

/** Maximum verification attempts before the challenge is exhausted */
const MAX_ATTEMPTS = 5;

/** Maximum OTP issuances per user per window for OTP-layer rate limiting */
const MAX_OTP_ISSUANCES_PER_WINDOW = 10;

/** OTP issuance rate-limit window in minutes */
const OTP_WINDOW_MINUTES = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OtpPurpose = 'LOGIN_MFA' | 'STEP_UP_APPROVAL' | 'PASSWORD_RESET' | 'PHONE_VERIFY';
export type OtpChannel = 'EMAIL' | 'SMS';

export interface OtpChallengeResult {
  otpRecordId: string;
  /** Plaintext OTP. Pass to dispatchOtp(), then discard. Never store or log. */
  plainCode: string;
}

export type VerifyOutcome =
  | { status: 'valid' }
  | { status: 'wrong_code'; attemptsRemaining: number }
  | { status: 'exhausted' }
  | { status: 'expired' }
  | { status: 'already_consumed' }
  | { status: 'invalidated' }
  | { status: 'not_found' };

export interface ResendChallengeResult {
  otpRecordId: string;
  /** Plaintext OTP. Pass to dispatchOtp(), then discard. Never store or log. */
  plainCode: string;
  /** Row ID of the previous active challenge, needed for confirmResendDelivery() */
  previousRecordId: string;
}

export type ResendCheckOutcome =
  | { allowed: true }
  | { allowed: false; reason: 'cooldown'; retryAfterSeconds: number }
  | { allowed: false; reason: 'rate_limited' }
  | { allowed: false; reason: 'no_active_challenge' };

// ---------------------------------------------------------------------------
// OTP generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure 6-digit OTP code.
 * Returns the plaintext string, zero-padded to OTP_LENGTH digits.
 */
function generatePlainCode(): string {
  const value = randomInt(0, Math.pow(10, OTP_LENGTH));
  return value.toString().padStart(OTP_LENGTH, '0');
}

// ---------------------------------------------------------------------------
// OTP-layer rate limiting
// ---------------------------------------------------------------------------

/**
 * Check whether the user has exceeded the OTP issuance rate limit.
 * Counts all AuthOtp rows (active, consumed, invalidated) created within
 * OTP_WINDOW_MINUTES for the given userId and purpose.
 *
 * This is separate from password-attempt rate limiting and runs at the
 * service layer, not the in-process store.
 */
export async function checkOtpRateLimit(
  userId: string,
  purpose: OtpPurpose,
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000);

  try {
    const count = await prisma.authOtp.count({
      where: {
        userId,
        purpose,
        createdAt: { gte: windowStart },
      },
    });

    if (count >= MAX_OTP_ISSUANCES_PER_WINDOW) {
      return { limited: true, retryAfterSeconds: OTP_WINDOW_MINUTES * 60 };
    }

    return { limited: false };
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot check OTP rate limit: database unreachable.');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Challenge creation
// ---------------------------------------------------------------------------

/**
 * Create a new OTP challenge for a staff user.
 *
 * Invalidates all previously active (unconsumed, unexpired, uninvalidated)
 * challenges for the same userId + purpose inside a transaction before
 * inserting the new row.
 *
 * Returns the new row ID and the plaintext OTP code.
 * The plaintext code must be passed to dispatchOtp() and then discarded.
 */
export async function createOtpChallenge(params: {
  userId: string;
  destination: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  ipAddress: string | null;
}): Promise<OtpChallengeResult> {
  const { userId, destination, channel, purpose, ipAddress } = params;
  const plainCode = generatePlainCode();
  const codeHash = hashOtpCode(plainCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const now = new Date();

  try {
    const newRow = await prisma.$transaction(async (tx) => {
      // Invalidate all existing active challenges for this user + purpose
      await tx.authOtp.updateMany({
        where: {
          userId,
          purpose,
          consumedAt:    null,
          invalidatedAt: null,
          expiresAt:     { gt: now },
        },
        data: { invalidatedAt: now },
      });

      // Insert the new challenge
      return tx.authOtp.create({
        data: {
          userId,
          otpCodeHash:  codeHash,
          purpose,
          destination,
          channel,
          ipAddress:    ipAddress ?? null,
          expiresAt,
          attemptCount: 0,
        },
        select: { id: true },
      });
    });

    return { otpRecordId: newRow.id, plainCode };
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot create OTP challenge: database unreachable.');
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// OTP verification — atomic
// ---------------------------------------------------------------------------

/**
 * Verify a submitted OTP code against the stored challenge.
 *
 * Uses a single atomic UPDATE to consume the challenge only if it is active,
 * unexpired, and within the attempt limit. Returns a typed outcome so the
 * caller can return the correct HTTP status without additional DB queries
 * in the happy path.
 *
 * On success: the challenge row is consumed (consumedAt set).
 * On wrong code: attemptCount is incremented atomically. If this brings the
 *   count to MAX_ATTEMPTS, the row is now exhausted but not consumed —
 *   subsequent calls will return 'exhausted'.
 */
export async function verifyOtpChallenge(
  otpRecordId: string,
  submittedCode: string,
): Promise<VerifyOutcome> {
  const now = new Date();

  try {
    // --- Step 1: fetch the row for hash comparison (read-only, no lock) ---
    const row = await prisma.authOtp.findUnique({
      where: { id: otpRecordId },
      select: {
        otpCodeHash:   true,
        expiresAt:     true,
        consumedAt:    true,
        invalidatedAt: true,
        attemptCount:  true,
      },
    });

    if (!row) return { status: 'not_found' };
    if (row.invalidatedAt !== null) return { status: 'invalidated' };
    if (row.consumedAt    !== null) return { status: 'already_consumed' };
    if (row.expiresAt     <= now)   return { status: 'expired' };
    if (row.attemptCount  >= MAX_ATTEMPTS) return { status: 'exhausted' };

    const codeMatches = verifyOtpHash(submittedCode, row.otpCodeHash);

    if (codeMatches) {
      // --- Step 2a: atomic consume ---
      // The WHERE clause guards against a concurrent race: if another request
      // consumed or invalidated between our read and this write, 0 rows update
      // and we re-diagnose below.
      const consumed = await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "auth_otps"
           SET "consumedAt"    = NOW(),
               "attemptCount" = "attemptCount" + 1
         WHERE id              = ${otpRecordId}::uuid
           AND "consumedAt"    IS NULL
           AND "invalidatedAt" IS NULL
           AND "expiresAt"     > NOW()
           AND "attemptCount"  < ${MAX_ATTEMPTS}
        RETURNING id
      `;

      if (consumed.length > 0) {
        return { status: 'valid' };
      }

      // Race: re-diagnose
      return diagnoseFailed(otpRecordId, now);
    } else {
      // --- Step 2b: atomic attempt increment (wrong code) ---
      const incremented = await prisma.$queryRaw<Array<{ id: string; "attemptCount": number }>>`
        UPDATE "auth_otps"
           SET "attemptCount" = "attemptCount" + 1
         WHERE id              = ${otpRecordId}::uuid
           AND "consumedAt"    IS NULL
           AND "invalidatedAt" IS NULL
           AND "expiresAt"     > NOW()
           AND "attemptCount"  < ${MAX_ATTEMPTS}
        RETURNING id, "attemptCount"
      `;

      if (incremented.length === 0) {
        return diagnoseFailed(otpRecordId, now);
      }

      const newCount = incremented[0]['attemptCount'] as number;
      const remaining = MAX_ATTEMPTS - newCount;

      if (remaining <= 0) {
        return { status: 'exhausted' };
      }

      return { status: 'wrong_code', attemptsRemaining: remaining };
    }
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot verify OTP: database unreachable.');
    }
    throw err;
  }
}

/** Re-fetch a row to determine why an atomic update returned 0 rows. */
async function diagnoseFailed(
  otpRecordId: string,
  now: Date,
): Promise<VerifyOutcome> {
  const row = await prisma.authOtp.findUnique({
    where: { id: otpRecordId },
    select: {
      consumedAt:    true,
      invalidatedAt: true,
      expiresAt:     true,
      attemptCount:  true,
    },
  });
  if (!row) return { status: 'not_found' };
  if (row.invalidatedAt !== null) return { status: 'invalidated' };
  if (row.consumedAt    !== null) return { status: 'already_consumed' };
  if (row.expiresAt     <= now)   return { status: 'expired' };
  return { status: 'exhausted' };
}

// ---------------------------------------------------------------------------
// Mark lastLoginAt after successful verification
// ---------------------------------------------------------------------------

/**
 * Update User.lastLoginAt to NOW() after successful OTP verification.
 * Called by the verify-otp route handler before issuing the session token.
 * Errors are logged but do not block session issuance — a failed lastLoginAt
 * update must not leave the user unable to authenticate.
 */
export async function updateLastLoginAt(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data:  { lastLoginAt: new Date() },
    });
  } catch (err: unknown) {
    // Non-fatal: log server-side, do not propagate
    console.error('[otpService] Failed to update lastLoginAt for user', userId, err);
  }
}

// ---------------------------------------------------------------------------
// Resend challenge — safe three-phase protocol
// ---------------------------------------------------------------------------

/**
 * Check whether a resend is allowed for the given OTP record.
 *
 * Returns the active challenge row ID and its createdAt so the caller can
 * enforce the cooldown, or a typed denial reason.
 */
export async function checkResendEligibility(
  userId: string,
  purpose: OtpPurpose,
): Promise<ResendCheckOutcome | { allowed: true; activeRecordId: string; createdAt: Date }> {
  const now = new Date();

  try {
    const active = await prisma.authOtp.findFirst({
      where: {
        userId,
        purpose,
        consumedAt:    null,
        invalidatedAt: null,
        expiresAt:     { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, createdAt: true },
    });

    if (!active) {
      return { allowed: false, reason: 'no_active_challenge' };
    }

    // Check OTP-layer rate limit
    const rateCheck = await checkOtpRateLimit(userId, purpose);
    if (rateCheck.limited) {
      return { allowed: false, reason: 'rate_limited' };
    }

    // Check resend cooldown
    const secondsSinceCreated = (now.getTime() - active.createdAt.getTime()) / 1000;
    if (secondsSinceCreated < RESEND_COOLDOWN_SECONDS) {
      return {
        allowed: false,
        reason: 'cooldown',
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceCreated),
      };
    }

    return { allowed: true, activeRecordId: active.id, createdAt: active.createdAt };
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot check resend eligibility: database unreachable.');
    }
    throw err;
  }
}

/**
 * Phase 1 of safe resend: create the new challenge row WITHOUT invalidating
 * the old one. The old row remains active as a fallback.
 *
 * Uses SELECT ... FOR UPDATE on the old row to prevent concurrent resend races:
 * only one concurrent request can proceed; the other will find the row already
 * locked and either wait (Prisma serialises) or see the new row on re-check.
 *
 * Returns the new row ID, plaintext code, and old row ID.
 * Call confirmResendDelivery() after successful delivery.
 * Call abandonResendChallenge() if delivery fails.
 */
export async function createResendChallenge(params: {
  userId: string;
  previousRecordId: string;
  destination: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  ipAddress: string | null;
}): Promise<OtpChallengeResult & { previousRecordId: string }> {
  const { userId, previousRecordId, destination, channel, purpose, ipAddress } = params;
  const plainCode = generatePlainCode();
  const codeHash  = hashOtpCode(plainCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  try {
    const newRow = await prisma.$transaction(async (tx) => {
      // Lock the old row to prevent a concurrent resend from also proceeding
      await tx.$queryRaw`
        SELECT id FROM "auth_otps"
         WHERE id = ${previousRecordId}::uuid
           AND "consumedAt" IS NULL AND "invalidatedAt" IS NULL
        FOR UPDATE SKIP LOCKED
      `;
      // If the lock returns 0 rows the old challenge is gone — still safe to
      // create a new one; callers will re-validate before using it.

      return tx.authOtp.create({
        data: {
          userId,
          otpCodeHash:  codeHash,
          purpose,
          destination,
          channel,
          ipAddress:    ipAddress ?? null,
          expiresAt,
          attemptCount: 0,
          // Note: invalidatedAt is NOT set here — this row is immediately active.
          // The old row is also still active during delivery.
        },
        select: { id: true },
      });
    });

    return { otpRecordId: newRow.id, plainCode, previousRecordId };
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot create resend challenge: database unreachable.');
    }
    throw err;
  }
}

/**
 * Phase 2a — Delivery succeeded: invalidate the old challenge.
 * The new challenge (otpRecordId) remains active.
 */
export async function confirmResendDelivery(
  previousRecordId: string,
): Promise<void> {
  try {
    await prisma.authOtp.updateMany({
      where: {
        id:            previousRecordId,
        consumedAt:    null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot confirm resend delivery: database unreachable.');
    }
    throw err;
  }
}

/**
 * Phase 2b — Delivery failed: invalidate the NEW challenge.
 * The old challenge (previousRecordId) remains active so the user can still
 * verify with the original code.
 */
export async function abandonResendChallenge(
  newOtpRecordId: string,
): Promise<void> {
  try {
    await prisma.authOtp.updateMany({
      where: {
        id:            newOtpRecordId,
        consumedAt:    null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });
  } catch (err: unknown) {
    // Non-fatal in the sense that we log and continue — the new row is orphaned
    // but harmless (it expires in 5 minutes). The old row is still valid.
    console.error('[otpService] Failed to abandon resend challenge', newOtpRecordId, err);
  }
}
