import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { handleApiError, isDemoModeEnabled, isDatabaseConfigured } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (user) {
      return NextResponse.json({ authenticated: true, user, isDemoMode: false });
    }

    // Demo mode is only valid when no real database is configured.
    // getCurrentUser() already returns the demo identity in this case, so
    // reaching here with demo mode active means there is no valid session cookie.
    if (!isDatabaseConfigured() && isDemoModeEnabled()) {
      // No active session — return unauthenticated rather than auto-granting access
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
