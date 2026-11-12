import { NextResponse } from 'next/server';
import { createSessionToken, demoAdminUser, SESSION_COOKIE_NAME } from '@/src/lib/auth';
import { isDatabaseConfigured, isDemoModeEnabled, handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

/**
 * Isolated Demonstration Session Provisioning Endpoint.
 *
 * Strictly available ONLY when ALL of the following conditions are met:
 *   1. ENABLE_DEMO_MODE=true
 *   2. NODE_ENV is not 'production'
 *   3. DATABASE_URL is not configured
 *   4. DIRECT_URL is not configured
 *
 * A configured-but-unreachable database NEVER triggers demo fallback.
 * Never grants access to production database records or operations.
 */
export async function POST() {
  try {
    // Block in production unconditionally
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Demonstration sessions are not available in production.',
        },
        { status: 403 }
      );
    }

    // Block when a real database is configured — even if currently unreachable
    if (isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Demonstration sessions are prohibited when a PostgreSQL database is configured.',
        },
        { status: 403 }
      );
    }

    if (!isDemoModeEnabled()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Demonstration mode is disabled in this environment.',
        },
        { status: 403 }
      );
    }

    // Generate signed, isolated demonstration JWT session token.
    // isDemoSession: true is an explicit, cryptographically signed discriminator
    // that getCurrentUser() uses to enforce strict demo/real separation.
    const token = await createSessionToken({
      userId: demoAdminUser.id,
      email: demoAdminUser.email,
      role: demoAdminUser.role.name,
      branchId: demoAdminUser.branchId,
      departmentId: demoAdminUser.departmentId,
      accessScope: demoAdminUser.accessScope,
      isDemoSession: true,
    });

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: demoAdminUser,
      isDemoMode: true,
      isolation: 'Demonstration sessions are strictly isolated from real database records.',
    });

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600,
    });

    return response;
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
