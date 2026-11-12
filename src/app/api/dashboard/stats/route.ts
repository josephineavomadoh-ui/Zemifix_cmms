import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { getDashboardMetrics } from '@/src/lib/services/dashboardService';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required to access dashboard metrics.',
        },
        { status: 401 }
      );
    }

    const stats = await getDashboardMetrics(user);
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
