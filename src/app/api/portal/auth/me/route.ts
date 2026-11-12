import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';

export async function GET(req: NextRequest) {
  try {
    const contact = await getCurrentPortalContact(req);
    if (!contact) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ contact });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to get portal session' }, { status: 500 });
  }
}
