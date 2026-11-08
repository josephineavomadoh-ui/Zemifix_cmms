import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { handleApiError, isDemoModeEnabled } from '@/src/lib/db-errors';
import { getUserByEmail } from '@/src/lib/services/userService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user) {
      return NextResponse.json({ authenticated: true, user, isDemoMode: false });
    }

    // In explicit demo mode only, if configured, provide demo admin session
    if (isDemoModeEnabled()) {
      const demoRes = await getUserByEmail('admin@zemifix.local');
      if (demoRes.data) {
        const { passwordHash: _, ...safeUser } = demoRes.data;
        return NextResponse.json({
          authenticated: true,
          user: safeUser,
          isDemoMode: true,
        });
      }
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
