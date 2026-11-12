import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import {
  listNotificationTemplates,
  updateNotificationTemplate,
} from '@/src/lib/services/notificationService';

function isNotificationAdministrator(roleName: string | undefined) {
  return roleName?.toLowerCase() === 'admin' || roleName?.toLowerCase() === 'super admin';
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isNotificationAdministrator(user.role?.name)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ templates: await listNotificationTemplates() });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isNotificationAdministrator(user.role?.name)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  if (
    !['STAFF', 'CUSTOMER'].includes(body.realm) ||
    typeof body.eventType !== 'string' ||
    typeof body.titleTemplate !== 'string' ||
    typeof body.bodyTemplate !== 'string' ||
    typeof body.emailSubject !== 'string' ||
    typeof body.emailBody !== 'string' ||
    typeof body.isActive !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Invalid notification template.' }, { status: 400 });
  }
  const template = await updateNotificationTemplate(user.id, body);
  return NextResponse.json({ success: true, template });
}
