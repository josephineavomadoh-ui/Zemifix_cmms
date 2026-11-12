import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { markNotificationRead } from '@/src/lib/services/notificationService';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const rawBody = await req.text();
  let body: { read?: unknown } = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
  }
  const readValue = body.read;
  if (readValue !== undefined && typeof readValue !== 'boolean') {
    return NextResponse.json({ error: 'read must be a boolean.' }, { status: 400 });
  }
  const isRead = readValue !== false;
  const updatedCount = await markNotificationRead(
    { realm: 'CUSTOMER', contactId: contact.id },
    id,
    isRead
  );
  return NextResponse.json({ success: true, updatedCount });
}
