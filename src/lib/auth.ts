import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { cookies } from 'next/headers';
import {
  AuthenticationError,
  ForbiddenError,
  DatabaseUnavailableError,
  isDatabaseConnectionError,
  isDemoModeEnabled,
  isDatabaseConfigured,
} from './db-errors';

const globalForDemoSecret = globalThis as unknown as { __zemifix_demo_secret?: Uint8Array };

/**
 * Returns a cryptographically random in-memory secret strictly for isolated demo sessions
 * in development/preview environments. This secret changes on each process restart and
 * can never be used to sign or verify production session tokens.
 * Attached to globalThis so all Next.js route bundles in dev mode share the same ephemeral key.
 */
function getOrCreateDemoSecret(): Uint8Array {
  if (!globalForDemoSecret.__zemifix_demo_secret) {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Node.js crypto fallback
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('crypto');
      nodeCrypto.randomFillSync(bytes);
    }
    globalForDemoSecret.__zemifix_demo_secret = bytes;
  }
  return globalForDemoSecret.__zemifix_demo_secret;
}

/**
 * Resolves the JWT signing secret according to execution environment.
 * IN PRODUCTION: An explicit SESSION_SECRET of at least 32 characters is strictly REQUIRED.
 * In production, the application refuses to issue or verify session tokens using fallback secrets.
 */
export function getSigningSecret(isDemo = false): Uint8Array {
  const envSecret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!envSecret || envSecret.trim().length < 32) {
      throw new Error(
        '[SECURITY VIOLATION]: SESSION_SECRET must be explicitly configured in production with at least 32 characters. Production session tokens cannot be issued using a fallback secret.'
      );
    }
    return new TextEncoder().encode(envSecret);
  }

  // Non-production environment:
  if (envSecret && envSecret.trim().length >= 32) {
    return new TextEncoder().encode(envSecret);
  }

  // In development / preview, permit ephemeral in-memory random secret strictly for demonstration sessions
  if (isDemo || (!isDatabaseConfigured() && isDemoModeEnabled())) {
    return getOrCreateDemoSecret();
  }

  throw new Error(
    '[CONFIG ERROR]: SESSION_SECRET environment variable is missing (minimum 32 characters required).'
  );
}

export const SESSION_COOKIE_NAME = 'zemifix_session';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  branchId: string;
  departmentId?: string | null;
  accessScope: string;
  isDemoSession?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roleId: string;
  isDemoUser?: boolean;
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
 * In production: strictly requires explicit SESSION_SECRET.
 * In demonstration preview: signs isolated demo tokens using dynamic in-memory secret.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSigningSecret(Boolean(payload.isDemoSession));
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verify and decode session token.
 * IN PRODUCTION: Strictly enforces explicit SESSION_SECRET and rejects any demonstration tokens.
 * IN DEMONSTRATION PREVIEW: Validates isolated demo tokens signed by in-memory demo secret.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token) return null;

  // In production, enforce SESSION_SECRET presence before attempting verification
  if (process.env.NODE_ENV === 'production') {
    const envSecret = process.env.SESSION_SECRET;
    if (!envSecret || envSecret.trim().length < 32) {
      console.error(
        '[SECURITY VIOLATION]: Production refuses to verify session tokens without an explicit SESSION_SECRET.'
      );
      return null;
    }
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(envSecret));
      const parsed = payload as unknown as SessionPayload;
      // In production, demonstration sessions are never allowed
      if (parsed?.isDemoSession) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  // Non-production environment (development / demonstration preview):
  // 1. Try explicit secret if set in environment
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 32) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      return payload as unknown as SessionPayload;
    } catch {
      // Fall through to check demonstration secret if demo mode is enabled
    }
  }

  // 2. If demonstration preview is active, verify against isolated demo secret
  if (isDemoModeEnabled() && !isDatabaseConfigured()) {
    try {
      const demoSecret = getOrCreateDemoSecret();
      const { payload } = await jwtVerify(token, demoSecret);
      const parsed = payload as unknown as SessionPayload;
      // Security requirement: tokens signed with demo secret MUST be marked isDemoSession
      if (parsed?.isDemoSession) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get current authenticated user from request cookie (Server Components & Route Handlers).
 * Never exposes password hashes or secret tokens.
 * Immediately invalidates deactivated or deleted accounts.
 */
export const demoAdminUser: AuthenticatedUser = {
  id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
  name: 'System Administrator [DEMO]',
  email: 'admin@zemifix.local',
  phone: '+233 24 000 0000',
  roleId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
  role: {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
    name: 'Admin',
    permissions: [{ permission: { resource: '*', action: '*' } }],
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
  approvalLimit: 1000000,
  isActive: true,
  locale: 'en-GH',
  isDemoUser: true,
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      // Security: Missing session cookie strictly yields null (unauthenticated).
      // Unauthenticated requests are NEVER granted administrator privileges.
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload?.userId) {
      return null;
    }

    // Isolated Demonstration Session Handling
    if (payload.isDemoSession) {
      // Security Isolation: Demonstration sessions are strictly barred if real PostgreSQL is configured
      if (isDatabaseConfigured()) {
        console.warn('[SECURITY] Demonstration session rejected because real PostgreSQL database is configured.');
        return null;
      }
      if (isDemoModeEnabled()) {
        return demoAdminUser;
      }
      return null;
    }

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
    } catch (dbErr: any) {
      if (isDatabaseConnectionError(dbErr)) {
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
