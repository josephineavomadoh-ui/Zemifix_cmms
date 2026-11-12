import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { listNotifications } from '@/src/lib/services/notificationService';

export async function GET(req: NextRequest) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rawTake = Number(req.nextUrl.searchParams.get('take') ?? 50);
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(Math.floor(rawTake), 1), 100) : 50;
  const result = await listNotifications({ realm: 'CUSTOMER', contactId: contact.id }, take);
  return NextResponse.json(result);
}
