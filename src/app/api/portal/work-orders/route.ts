import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { getPortalWorkOrders } from '@/src/lib/services/portalService';

export async function GET(req: NextRequest) {
  try {
    const contact = await getCurrentPortalContact(req);
    if (!contact) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrders = await getPortalWorkOrders(contact);
    return NextResponse.json({ workOrders, count: workOrders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch customer work orders' }, { status: 500 });
  }
}
