import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { getBackgroundJobMetrics } from '@/src/lib/services/backgroundJobService';
import { handleApiError } from '@/src/lib/db-errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getBackgroundJobMetrics();
    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
