/**
 * loginAttemptService.ts
 *
 * In-process sliding-window rate limiter for failed PASSWORD attempts.
 *
 * This service is intentionally separate from OTP-based rate limiting because
 * AuthOtp rows are only created AFTER successful password verification. Failed
 * password attempts must be tracked before an OTP row exists.
 *
 * Design decisions:
 *   - In-process Map with TTL eviction — no migration, no Redis dependency.
 *     Suitable for a single-process Next.js deployment. Replace the store with
 *     a Redis client in a multi-instance deployment without changing callers.
 *   - Two independent limiters: per-account (email) and per-IP.
 *   - Per-account: 10 failures in a 15-minute window → block for 15 minutes.
 *   - Per-IP: 30 failures in a 15-minute window → block for 15 minutes.
 *   - Windows and limits are constants; adjust without touching calling code.
 *   - No database writes — eliminates timing attacks via DB query duration.
 *   - Eviction runs on every record() call to bound memory usage.
 *
 * Security note: account-based limits use the email as the key. Because email
 * lookup happens BEFORE this check (to allow the dummy-hash timing path), the
 * rate limit is applied regardless of whether the email exists in the database.
 * This prevents enumeration via lock-out timing differences.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum failed password attempts per account within WINDOW_MS */
const MAX_ACCOUNT_FAILURES = 10;

/** Maximum failed password attempts per IP within WINDOW_MS */
const MAX_IP_FAILURES = 30;

/** Sliding window duration in milliseconds (15 minutes) */
const WINDOW_MS = 15 * 60 * 1000;

/** How long a blocked key remains blocked after the last failure, in ms */
const BLOCK_DURATION_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

/**
 * Stores an array of failure timestamps (epoch ms) per key.
 * Key format: `account:<email>` or `ip:<ipAddress>`
 */
const failureStore = new Map<string, number[]>();

/** Timestamp when a key was last seen blocked (for block-duration enforcement) */
const blockStore = new Map<string, number>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Evict entries older than WINDOW_MS from a timestamp array.
 * Returns the pruned array.
 */
function pruneWindow(timestamps: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return timestamps.filter(t => t > cutoff);
}

/** Evict all keys whose block period has expired and whose window is empty. */
function evictExpiredKeys(now: number): void {
  for (const [key, timestamps] of failureStore.entries()) {
    const pruned = pruneWindow(timestamps, now);
    if (pruned.length === 0) {
      failureStore.delete(key);
    } else {
      failureStore.set(key, pruned);
    }
  }
  for (const [key, blockedAt] of blockStore.entries()) {
    if (now - blockedAt > BLOCK_DURATION_MS) {
      blockStore.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  /** true = request is allowed to proceed */
  allowed: boolean;
  /** If blocked, seconds remaining until unblocked (approximate) */
  retryAfterSeconds?: number;
  /** Human-readable reason for the block */
  reason?: string;
}

/**
 * Check whether a login attempt is allowed for the given account and IP.
 * Call this BEFORE password verification.
 * Does NOT record a failure — call recordFailure() after a confirmed failure.
 */
export function checkPasswordRateLimit(
  email: string,
  ipAddress: string,
): RateLimitResult {
  const now = Date.now();
  evictExpiredKeys(now);

  const accountKey = `account:${email.toLowerCase()}`;
  const ipKey = `ip:${ipAddress}`;

  // Check account block
  const accountBlockedAt = blockStore.get(accountKey);
  if (accountBlockedAt !== undefined) {
    const remaining = BLOCK_DURATION_MS - (now - accountBlockedAt);
    if (remaining > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(remaining / 1000),
        reason: 'Too many failed login attempts for this account.',
      };
    }
  }

  // Check IP block
  const ipBlockedAt = blockStore.get(ipKey);
  if (ipBlockedAt !== undefined) {
    const remaining = BLOCK_DURATION_MS - (now - ipBlockedAt);
    if (remaining > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(remaining / 1000),
        reason: 'Too many failed login attempts from this IP address.',
      };
    }
  }

  // Check account failure count within window
  const accountFailures = pruneWindow(failureStore.get(accountKey) ?? [], now);
  if (accountFailures.length >= MAX_ACCOUNT_FAILURES) {
    blockStore.set(accountKey, now);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: 'Too many failed login attempts for this account.',
    };
  }

  // Check IP failure count within window
  const ipFailures = pruneWindow(failureStore.get(ipKey) ?? [], now);
  if (ipFailures.length >= MAX_IP_FAILURES) {
    blockStore.set(ipKey, now);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: 'Too many failed login attempts from this IP address.',
    };
  }

  return { allowed: true };
}

/**
 * Record a confirmed failed password attempt for the given account and IP.
 * Call this AFTER password verification returns false, or after a user-not-found
 * timing path completes (to prevent enumeration via differential locking).
 */
export function recordPasswordFailure(email: string, ipAddress: string): void {
  const now = Date.now();

  const accountKey = `account:${email.toLowerCase()}`;
  const ipKey = `ip:${ipAddress}`;

  // Append to account window
  const accountFailures = pruneWindow(failureStore.get(accountKey) ?? [], now);
  accountFailures.push(now);
  failureStore.set(accountKey, accountFailures);
  if (accountFailures.length >= MAX_ACCOUNT_FAILURES) {
    blockStore.set(accountKey, now);
  }

  // Append to IP window
  const ipFailures = pruneWindow(failureStore.get(ipKey) ?? [], now);
  ipFailures.push(now);
  failureStore.set(ipKey, ipFailures);
  if (ipFailures.length >= MAX_IP_FAILURES) {
    blockStore.set(ipKey, now);
  }
}

/**
 * Clear the failure record for an account after a successful login.
 * Call this after successful password verification AND successful OTP delivery.
 * Does NOT clear IP-level counters — those are time-windowed only.
 */
export function clearAccountFailures(email: string): void {
  const accountKey = `account:${email.toLowerCase()}`;
  failureStore.delete(accountKey);
  blockStore.delete(accountKey);
}

/**
 * Exported for testing only — allows inspection of current failure counts.
 * Not intended for production callers.
 */
export function _getFailureCount(key: string): number {
  const now = Date.now();
  return pruneWindow(failureStore.get(key) ?? [], now).length;
}
