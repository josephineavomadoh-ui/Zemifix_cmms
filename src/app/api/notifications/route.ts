import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { isDatabaseConfigured } from '@/src/lib/db-errors';
import { listNotifications } from '@/src/lib/services/notificationService';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Notifications require the configured PostgreSQL database.' }, { status: 503 });
  }

  const rawTake = Number(req.nextUrl.searchParams.get('take') ?? 50);
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(Math.floor(rawTake), 1), 100) : 50;
  const result = await listNotifications({ realm: 'STAFF', userId: user.id }, take);
  return NextResponse.json(result);
}
