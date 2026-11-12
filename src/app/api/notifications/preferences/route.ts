import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import {
  getNotificationPreferences,
  saveNotificationPreference,
} from '@/src/lib/services/notificationService';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const preferences = await getNotificationPreferences({ realm: 'STAFF', userId: user.id });
  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (
    typeof body.eventType !== 'string' ||
    typeof body.inAppEnabled !== 'boolean' ||
    typeof body.emailEnabled !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid notification preference.' }, { status: 400 });
  }
  await saveNotificationPreference({ realm: 'STAFF', userId: user.id }, body);
  return NextResponse.json({ success: true });
}
