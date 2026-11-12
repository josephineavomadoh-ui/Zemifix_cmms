import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { acceptCustomerQuote } from '@/src/lib/services/quoteService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contact = await getCurrentPortalContact(req);
    if (!contact) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const body = await req.json().catch(() => ({}));

    const result = await acceptCustomerQuote(contact, id, clientIp, body.decisionNotes);

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to accept quote' }, { status: 400 });
  }
}
