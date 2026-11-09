import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { handleApiError, isDatabaseConfigured, isDemoModeEnabled } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user) {
      return NextResponse.json({
        authenticated: true,
        user,
        isDemoMode: Boolean(user.isDemoUser),
      });
    }

    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        isDemoAvailable: !isDatabaseConfigured() && isDemoModeEnabled(),
      },
      { status: 401 }
    );
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
