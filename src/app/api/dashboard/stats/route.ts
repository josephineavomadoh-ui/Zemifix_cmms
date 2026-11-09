import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/src/lib/services/dashboardService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    const stats = await getDashboardMetrics(user);
    return NextResponse.json(stats);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
