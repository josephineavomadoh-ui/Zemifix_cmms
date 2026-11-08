import { NextResponse } from 'next/server';
import { createSessionToken, demoAdminUser, SESSION_COOKIE_NAME } from '@/src/lib/auth';
import { isDatabaseConfigured, isDemoModeEnabled, handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

/**
 * Isolated Demonstration Session Provisioning Endpoint.
 * Strictly available ONLY when no production database is configured and demo mode is active.
 * Never grants access to production database records or production operations.
 */
export async function POST() {
  try {
    if (isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Demonstration sessions are prohibited when a production PostgreSQL database is configured.',
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

    // Generate signed, isolated demonstration JWT session token
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600,
    });

    return response;
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
