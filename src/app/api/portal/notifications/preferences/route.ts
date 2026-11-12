import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import {
  getNotificationPreferences,
  saveNotificationPreference,
} from '@/src/lib/services/notificationService';

export async function GET(req: NextRequest) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const preferences = await getNotificationPreferences({ realm: 'CUSTOMER', contactId: contact.id });
  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (
    typeof body.eventType !== 'string' ||
    typeof body.inAppEnabled !== 'boolean' ||
    typeof body.emailEnabled !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid notification preference.' }, { status: 400 });
  }
  await saveNotificationPreference({ realm: 'CUSTOMER', contactId: contact.id }, body);
  return NextResponse.json({ success: true });
}
