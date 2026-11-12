import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { markAllNotificationsRead } from '@/src/lib/services/notificationService';

export async function POST(req: NextRequest) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const updatedCount = await markAllNotificationsRead({ realm: 'CUSTOMER', contactId: contact.id });
  return NextResponse.json({ success: true, updatedCount });
}
