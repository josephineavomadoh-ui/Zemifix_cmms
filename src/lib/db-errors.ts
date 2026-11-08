/**
 * Database Error and Demo Mode Controller
 *
 * Directives:
 * 1. Production operations must use PostgreSQL through Prisma.
 * 2. If PostgreSQL is unavailable, return an appropriate server error (503 Service Unavailable).
 * 3. Never silently switch to seed data or report false write successes.
 * 4. Demonstration mode is strictly opt-in via ENABLE_DEMO_MODE=true and strictly false by default.
 */

export class DatabaseUnavailableError extends Error {
  statusCode: number = 503;
  code: string = 'DATABASE_UNAVAILABLE';
  detail: string;

  constructor(message = 'PostgreSQL database is currently unreachable. Please check connection configuration.', detail?: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.detail = detail || 'Database server is unreachable on configured host and port.';
  }
}

export class AuthenticationError extends Error {
  statusCode: number = 401;
  code: string = 'UNAUTHORIZED';
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  statusCode: number = 403;
  code: string = 'FORBIDDEN';
  constructor(message = 'Insufficient permissions for this operation.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Demo mode is strictly disabled by default.
 * Must be explicitly enabled via ENABLE_DEMO_MODE=true in environment.
 */
export function isDemoModeEnabled(): boolean {
  return process.env.ENABLE_DEMO_MODE === 'true';
}

/**
 * Inspect an error to determine if it is a database connection or Prisma network error.
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DatabaseUnavailableError) return true;
  const msg = typeof error === 'object' && 'message' in (error as any) ? String((error as any).message) : String(error);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('P1001') || // Prisma: Can't reach database server
    msg.includes('P1002') || // Prisma: Database server was reached but timed out
    msg.includes('P1003') || // Prisma: Database does not exist
    msg.includes('connection error')
  );
}

/**
 * Handle API error and return appropriate HTTP response
 */
export function handleApiError(error: unknown) {
  console.error('[API Error]:', error);

  if (error instanceof DatabaseUnavailableError || isDatabaseConnectionError(error)) {
    return {
      status: 503,
      body: {
        error: 'Database Unavailable',
        message: 'Could not connect to PostgreSQL. Persistent operations are temporarily unavailable.',
        code: 'DATABASE_UNAVAILABLE',
        hint: 'Ensure PostgreSQL server is running and accessible via DATABASE_URL.',
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      body: { error: 'Unauthorized', message: error.message, code: error.code },
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      body: { error: 'Forbidden', message: error.message, code: error.code },
    };
  }

  const msg = error instanceof Error ? error.message : 'Internal Server Error';
  return {
    status: 500,
    body: { error: 'Internal Server Error', message: msg },
  };
}
