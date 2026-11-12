import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { executeImportBatch } from '@/src/lib/services/importService';
import { checkRateLimit } from '@/src/lib/services/rateLimitService';
import { handleApiError } from '@/src/lib/db-errors';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateCheck = await checkRateLimit(user.id, 'DATA_IMPORT', 20, 60, user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate Limit Exceeded', retryAfterSeconds: rateCheck.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const result = await executeImportBatch(user, body);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
