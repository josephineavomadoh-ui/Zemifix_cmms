import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { cookies } from 'next/headers';
import {
  AuthenticationError,
  ForbiddenError,
  DatabaseUnavailableError,
  isDatabaseConnectionError,
  isDemoModeEnabled,
} from './db-errors';

// ---------------------------------------------------------------------------
// JWT secret — fail securely at runtime; never fall back to a hardcoded value.
// Deferred throw so Next.js can build without a .env present.
// ---------------------------------------------------------------------------
function getJwtSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.trim().length < 32) {
    throw new Error(
      '[AUTH] SESSION_SECRET is missing or too short (minimum 32 characters). ' +
        'Set a strong random secret in your environment before starting the server.'
    );
  }
  return new TextEncoder().encode(raw);
}

// ---------------------------------------------------------------------------
// OTP secret — separate from SESSION_SECRET.
// Used only for HMAC-SHA256 OTP code hashing; never used for JWT signing.
// Same fail-secure pattern as getJwtSecret().
// ---------------------------------------------------------------------------
export function getOtpSecret(): string {
  const raw = process.env.OTP_SECRET;
  if (!raw || raw.trim().length < 32) {
    throw new Error(
      '[AUTH] OTP_SECRET is missing or too short (minimum 32 characters). ' +
        'Set a strong random secret in your environment before starting the server.'
    );
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Approval secret — separate from SESSION_SECRET and OTP_SECRET.
// Used for HMAC-SHA256 business payload hashing in dual-control approvals.
// Same fail-secure pattern as getJwtSecret() and getOtpSecret().
// ---------------------------------------------------------------------------
export function getApprovalSecret(): string {
  const raw = process.env.APPROVAL_SECRET;
  if (!raw || raw.trim().length < 32) {
    throw new Error(
      '[AUTH] APPROVAL_SECRET is missing or too short (minimum 32 bytes / characters). ' +
        'Set a strong random secret in your environment before starting the server.'
    );
  }

  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  const byteLength = Buffer.byteLength(cleaned, 'utf8');

  if (byteLength < 32) {
    throw new Error(
      `[AUTH] APPROVAL_SECRET byte length (${byteLength} bytes) is below the minimum 32-byte security threshold.`
    );
  }

  // Ensure secret independence
  const sessionSecret = process.env.SESSION_SECRET?.trim();
  const otpSecret = process.env.OTP_SECRET?.trim();

  if (sessionSecret && cleaned === sessionSecret) {
    throw new Error(
      '[AUTH] SECURITY_VIOLATION: APPROVAL_SECRET must be distinct from SESSION_SECRET.'
    );
  }

  if (otpSecret && cleaned === otpSecret) {
    throw new Error(
      '[AUTH] SECURITY_VIOLATION: APPROVAL_SECRET must be distinct from OTP_SECRET.'
    );
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Dummy bcrypt hash for timing-safe login.
// When a submitted email does not match any account, bcrypt still runs against
// this constant so response time is indistinguishable from a wrong password.
// Pre-computed hash of the string "zemifix-dummy-timing-prevention-constant"
// using bcryptjs cost factor 10. Regenerate with:
//   node -e "require('bcryptjs').hash('zemifix-dummy-timing-prevention-constant',10).then(console.log)"
// ---------------------------------------------------------------------------
export const DUMMY_HASH =
  '$2a$10$HukBP2mcxsdvD2VfEaX6tO/0wJyxbIwVrY1VXfYWI9FBRYTZ9ZnkS';

export const SESSION_COOKIE_NAME = 'zemifix_session';
export const PREAUTH_COOKIE_NAME = 'zemifix_preauth';

const JWT_ISSUER = 'zemifix-cmms';
const JWT_AUDIENCE = 'zemifix-staff';
const JWT_AUDIENCE_PREAUTH = 'zemifix-preauth';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  branchId: string;
  departmentId?: string | null;
  accessScope: string;
  /**
   * Present and `true` only in tokens issued by the demo-session endpoint.
   * Absence is equivalent to a real staff session — the claim is never set to
   * `false` on real tokens; it is simply omitted.
   */
  isDemoSession?: true;
}

// ---------------------------------------------------------------------------
// Pre-authentication JWT — issued after password verification, before OTP.
// Uses audience "zemifix-preauth" so verifySessionToken() rejects it via
// jose's built-in audience check; no application-level guard needed.
// ---------------------------------------------------------------------------
export interface PreAuthPayload {
  /** Staff user ID */
  userId: string;
  /** AuthOtp row ID — binds this token to exactly one challenge row */
  otpRecordId: string;
  /** Delivery channel — for display on the OTP entry screen */
  channel: 'EMAIL' | 'SMS';
  /** Masked destination string — for display only, e.g. "+233 24 *** **33" */
  destination: string;
}

/**
 * Create a signed pre-authentication JWT.
 * Valid for 10 minutes (longer than the 5-minute OTP so the user can still
 * reach the OTP screen and see a "code expired — resend" message).
 * Audience is "zemifix-preauth" — rejected by all full-session consumers.
 */
export async function createPreAuthToken(payload: PreAuthPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    otpRecordId: payload.otpRecordId,
    channel: payload.channel,
    destination: payload.destination,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE_PREAUTH)
    .setJti(payload.otpRecordId)
    .sign(getJwtSecret());
}

/**
 * Verify a pre-authentication token from the zemifix_preauth cookie.
 * Returns null for any invalid, expired, or structurally incomplete token.
 * Never accepts full-session tokens (audience check enforced by jose).
 */
export async function verifyPreAuthToken(token: string): Promise<PreAuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE_PREAUTH,
    });

    if (
      typeof payload['userId'] !== 'string' || !payload['userId'] ||
      typeof payload['otpRecordId'] !== 'string' || !payload['otpRecordId'] ||
      typeof payload['channel'] !== 'string' || !payload['channel'] ||
      typeof payload['destination'] !== 'string' || !payload['destination']
    ) {
      return null;
    }

    const channel = payload['channel'] as string;
    if (channel !== 'EMAIL' && channel !== 'SMS') {
      return null;
    }

    return {
      userId: payload['userId'] as string,
      otpRecordId: payload['otpRecordId'] as string,
      channel: channel as 'EMAIL' | 'SMS',
      destination: payload['destination'] as string,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phone normalisation — Ghana E.164
//
// Accepts common local and international formats and normalises to +233XXXXXXXXX.
// Returns null if the number cannot be recognised as a valid Ghana mobile number.
// Does NOT silently modify existing user records — callers decide what to do
// with the normalised form.
//
// Supported input examples:
//   0244567890     → +233244567890
//   233244567890   → +233244567890
//   +233244567890  → +233244567890
//   0 244 567 890  → +233244567890  (spaces stripped)
//   (024) 4567890  → +233244567890  (parentheses stripped)
//
// Structural rules (NCA national numbering plan):
//   - Country code: +233
//   - Local number: exactly 9 digits
//   - First two digits of the local number must be an allocated mobile
//     network code. Network code assignments change over time — prefixes are
//     used here purely to distinguish mobile numbers from fixed-line ranges,
//     not to identify the current network operator.
//
// Currently allocated mobile codes (NCA):
//   020 (Vodafone/Telecel), 023 (Globacom),
//   024 025 053 054 055 059 (MTN),
//   026 027 056 057 (AirtelTigo),
//   028 (Expresso),
//   050 (Vodafone/Telecel)
//
// Two-digit forms used in the prefix set: 20 23 24 25 26 27 28 50 53 54 55 56 57 59
// ---------------------------------------------------------------------------
const GHANA_MOBILE_PREFIXES = new Set([
  '20', '23', '24', '25', '26', '27', '28',
  '50', '53', '54', '55', '56', '57', '59',
]);

export function normalizeGhanaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip all whitespace, dashes, dots, and parentheses — keep digits and leading +
  const cleaned = raw.replace(/[\s\-().]/g, '');

  let local: string; // 9-digit local number without leading zero or country code

  if (cleaned.startsWith('+233')) {
    local = cleaned.slice(4);
  } else if (cleaned.startsWith('233') && !cleaned.startsWith('0')) {
    local = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    local = cleaned.slice(1);
  } else {
    return null;
  }

  // Local number must be exactly 9 digits
  if (!/^\d{9}$/.test(local)) return null;

  // First two digits must be a known Ghana mobile prefix
  const prefix = local.slice(0, 2);
  if (!GHANA_MOBILE_PREFIXES.has(prefix)) return null;

  return `+233${local}`;
}

// ---------------------------------------------------------------------------
// OTP sender email validation
// Rejects placeholder, local, and unverifiable domains at call time so a
// misconfigured OTP_FROM_EMAIL never reaches the Resend API in production.
// ---------------------------------------------------------------------------

/** Domains that must never be used as a production email sender. */
const BLOCKED_SENDER_DOMAINS = [
  'localhost', 'example.com', 'example.org', 'example.net',
  'test.com', 'invalid', 'local',
];

/**
 * Returns the validated OTP sender address.
 * Throws at call time if the address is absent, malformed, or uses a
 * placeholder/local domain. Only called by the delivery service, not at
 * module load time, so builds without full .env still succeed.
 */
export function getOtpFromEmail(): string {
  const addr = process.env.OTP_FROM_EMAIL?.trim();
  if (!addr) {
    throw new Error(
      '[AUTH] OTP_FROM_EMAIL is not set. ' +
        'Configure a verified sender address from your Resend account.'
    );
  }

  // Basic structural check: must contain exactly one @, non-empty local part and domain
  const atIndex = addr.lastIndexOf('@');
  if (atIndex < 1 || atIndex === addr.length - 1) {
    throw new Error(`[AUTH] OTP_FROM_EMAIL "${addr}" is not a valid email address.`);
  }

  const domain = addr.slice(atIndex + 1).toLowerCase();

  // Reject any TLD or full domain on the blocked list
  const tld = domain.split('.').pop() ?? '';
  if (
    BLOCKED_SENDER_DOMAINS.includes(domain) ||
    BLOCKED_SENDER_DOMAINS.includes(tld)
  ) {
    throw new Error(
      `[AUTH] OTP_FROM_EMAIL domain "${domain}" is a placeholder or non-routable domain. ` +
        'Use a verified domain from your Resend account.'
    );
  }

  return addr;
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 OTP utilities
// Building blocks for Stage C (otpService.ts). Defined here so they share
// getOtpSecret() and can be tested independently before the full service.
// ---------------------------------------------------------------------------

/**
 * Compute HMAC-SHA256 of an OTP code using OTP_SECRET.
 * The result is hex-encoded and stored in AuthOtp.otpCodeHash.
 */
export function hashOtpCode(code: string): string {
  const secret = getOtpSecret();
  return createHmac('sha256', secret).update(code).digest('hex');
}

/**
 * Constant-time comparison of a submitted OTP code against a stored HMAC hash.
 * Uses timingSafeEqual from Node crypto to prevent timing attacks on hash comparison.
 */
export function verifyOtpHash(submittedCode: string, storedHash: string): boolean {
  try {
    const candidateHash = hashOtpCode(submittedCode);
    // Both are hex strings of the same length (64 chars for SHA-256)
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Demo identity — used exclusively when demo mode is active and no real
// database is configured.  Exported so the demo-session endpoint can build a
// token and response without duplicating the object.
// ---------------------------------------------------------------------------
export const demoAdminUser = {
  id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
  name: 'System Administrator [DEMO]',
  email: 'admin@zemifix.local',
  phone: '+233 24 000 0000',
  roleId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
  role: {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
    name: 'Admin',
    isSystem: true,
    description: 'Full system control',
    permissions: [],
  },
  branchId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
  branch: {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
    name: 'Accra Head Office [DEMO]',
    code: 'HQ-ACC',
    type: 'HeadOffice',
  },
  departmentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
  department: {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
    name: 'Engineering & Maintenance [DEMO]',
    code: 'DEPT-ENG',
  },
  accessScope: 'Company',
  approvalLimit: 1_000_000,
  isActive: true,
  locale: 'en-GH',
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
} as const;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId: string;
  role: {
    id: string;
    name: string;
    permissions?: {
      permission: {
        resource: string;
        action: string;
      };
    }[];
  };
  branchId: string;
  branch: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  accessScope: string;
  approvalLimit?: any;
  isActive: boolean;
  locale: string;
}

/**
 * Hash a plain password using bcrypt with salt 10
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Create a signed JWT session token valid for 8 hours (default session policy).
 * Always uses the validated SESSION_SECRET — will throw if the secret is absent
 * or too short, which prevents silent authentication failures.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(getJwtSecret());
}

/**
 * Verify and decode a session token.
 * Returns null for any invalid, expired, malformed, or structurally incomplete
 * token — never throws to callers.  Validates algorithm, issuer, audience, and
 * all required session claims before returning a payload.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Validate that all required session claims are present and non-empty
    if (
      typeof payload['userId'] !== 'string' || !payload['userId'] ||
      typeof payload['email'] !== 'string' || !payload['email'] ||
      typeof payload['role'] !== 'string' || !payload['role'] ||
      typeof payload['branchId'] !== 'string' || !payload['branchId'] ||
      typeof payload['accessScope'] !== 'string' || !payload['accessScope']
    ) {
      return null;
    }

    // isDemoSession must be strictly `true` when present — any other value is rejected
    const rawIsDemo = payload['isDemoSession'];
    if (rawIsDemo !== undefined && rawIsDemo !== true) {
      return null;
    }

    return {
      userId: payload['userId'] as string,
      email: payload['email'] as string,
      role: payload['role'] as string,
      branchId: payload['branchId'] as string,
      departmentId: (payload['departmentId'] as string | null | undefined) ?? null,
      accessScope: payload['accessScope'] as string,
      ...(rawIsDemo === true ? { isDemoSession: true as const } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from request cookie (Server Components & Route Handlers).
 * Never exposes password hashes or secret tokens.
 * Immediately invalidates deactivated or deleted accounts.
 *
 * Session separation rules:
 *   DEMO path  — isDemoSession === true in token
 *                Accepted only when: demo mode enabled, not production, no DB configured,
 *                and userId exactly matches demoAdminUser.id.
 *                Never touches PostgreSQL.
 *   REAL path  — isDemoSession absent from token
 *                Requires a configured database. Retrieves the live user from PostgreSQL.
 *                Never returns demoAdminUser regardless of userId.
 */
export async function getCurrentUser(req?: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    let token: string | undefined;
    if (req) {
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    } else {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {
        token = undefined;
      }
    }
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const { isDatabaseConfigured } = await import('./db-errors');

    // -----------------------------------------------------------------------
    // DEMO SESSION PATH
    // -----------------------------------------------------------------------
    if (payload.isDemoSession === true) {
      // Reject demo tokens in production under any circumstances
      if (process.env.NODE_ENV === 'production') return null;

      // Reject demo tokens when a real database is configured
      if (isDatabaseConfigured()) return null;

      // Reject demo tokens when demo mode is not explicitly enabled
      if (!isDemoModeEnabled()) return null;

      // Reject tokens whose userId doesn't match the single known demo identity
      if (payload.userId !== demoAdminUser.id) return null;

      return demoAdminUser as unknown as AuthenticatedUser;
    }

    // -----------------------------------------------------------------------
    // REAL STAFF SESSION PATH
    // -----------------------------------------------------------------------

    // A real staff token requires a configured database — refuse without one
    if (!isDatabaseConfigured()) return null;

    // Never allow a real token to resolve to the demo identity
    if (payload.userId === demoAdminUser.id) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      // Immediate session invalidation if account is deactivated or marked deleted
      if (!user || !user.isActive || user.deletedAt) {
        return null;
      }

      // Safe return: passwordHash is not included in selection/mapping
      const { passwordHash: _, ...safeUser } = user;
      return safeUser as unknown as AuthenticatedUser;
    } catch (dbErr: unknown) {
      if (isDatabaseConnectionError(dbErr)) {
        // A configured-but-unreachable database must NEVER fall back to demo data
        throw new DatabaseUnavailableError();
      }
      throw dbErr;
    }
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      throw error;
    }
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Enforce authentication and authorization on server endpoints.
 * Throws AuthenticationError (401) or ForbiddenError (403).
 */
export async function requireAuth(options?: {
  roles?: string[];
  resource?: string;
  action?: string;
}): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError('Active staff session required.');
  }

  if (options?.roles && options.roles.length > 0) {
    if (!options.roles.includes(user.role.name) && user.role.name !== 'Admin') {
      throw new ForbiddenError(
        `Role "${user.role.name}" is not authorized for this operation. Required: ${options.roles.join(', ')}`
      );
    }
  }

  if (options?.resource && options?.action) {
    if (!hasPermission(user, options.resource, options.action)) {
      throw new ForbiddenError(
        `Missing permission "${options.resource}:${options.action}" for this operation.`
      );
    }
  }

  return user;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthenticatedUser | null,
  resource: string,
  action: string
): boolean {
  if (!user || !user.role) return false;
  // System admin role has full access
  if (user.role.name === 'Admin') return true;

  return (
    user.role.permissions?.some(
      (rp) =>
        (rp.permission.resource === resource || rp.permission.resource === '*') &&
        (rp.permission.action === action || rp.permission.action === '*')
    ) ?? false
  );
}
