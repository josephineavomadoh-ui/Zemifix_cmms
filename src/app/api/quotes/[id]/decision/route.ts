import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { acceptCustomerQuote } from '@/src/lib/services/quoteService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const contact = await getCurrentPortalContact(req);
  if (!contact) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (body.decision !== 'ACCEPTED' && body.decision !== 'DECLINED') {
    return NextResponse.json({ error: 'Decision must be ACCEPTED or DECLINED.' }, { status: 400 });
  }
  const { id } = await params;
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const result = await acceptCustomerQuote(
    contact,
    id,
    clientIp,
    typeof body.decisionNotes === 'string' ? body.decisionNotes : undefined,
    body.decision
  );
  return NextResponse.json({ success: true, ...result });
}
