import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { markAllNotificationsRead } from '@/src/lib/services/notificationService';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const updatedCount = await markAllNotificationsRead({ realm: 'STAFF', userId: user.id });
  return NextResponse.json({ success: true, updatedCount });
}
