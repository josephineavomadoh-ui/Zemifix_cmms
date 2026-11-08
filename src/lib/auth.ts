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
} from './db-errors';

const rawSecret = process.env.SESSION_SECRET || 'zemifix-enterprise-cmms-jwt-secret-key-32-bytes-min';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY WARNING]: SESSION_SECRET is not set in production. Using fallback secret is insecure.');
}

const JWT_SECRET = new TextEncoder().encode(rawSecret);

export const SESSION_COOKIE_NAME = 'zemifix_session';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  branchId: string;
  departmentId?: string | null;
  accessScope: string;
}

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
 * Create a signed JWT session token valid for 8 hours (default session policy)
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

/**
 * Verify and decode session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from request cookie (Server Components & Route Handlers).
 * Never exposes password hashes or secret tokens.
 * Immediately invalidates deactivated or deleted accounts.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

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
        if (isDemoModeEnabled()) {
          // Explicit demo mode opt-in only
          return null;
        }
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
