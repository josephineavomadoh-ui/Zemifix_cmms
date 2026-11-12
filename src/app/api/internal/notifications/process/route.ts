import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { runNotificationWorker } from '@/src/lib/services/notificationService';
import { evaluateAllActiveSlaBreaches } from '@/src/lib/services/slaService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.NOTIFICATION_WORKER_SECRET;
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || expected.length < 32) {
    return NextResponse.json({ error: 'Notification worker secret is not configured.' }, { status: 503 });
  }
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [notifications, sla] = await Promise.all([
    runNotificationWorker(),
    evaluateAllActiveSlaBreaches(),
  ]);
  return NextResponse.json({ success: true, result: { notifications, sla } });
}
