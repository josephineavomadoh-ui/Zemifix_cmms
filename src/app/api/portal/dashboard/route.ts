import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { getPortalWorkOrders } from '@/src/lib/services/portalService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const contact = await getCurrentPortalContact(req);
    if (!contact) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrders = await getPortalWorkOrders(contact);
    const quotes = await prisma.quote.findMany({
      where: {
        customerId: contact.customerId,
        status: { in: ['SENT_TO_CUSTOMER', 'CUSTOMER_ACCEPTED', 'CUSTOMER_DECLINED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      workOrdersCount: workOrders.length,
      quotesCount: quotes.length,
      pendingQuotesCount: quotes.filter((q) => q.status === 'SENT_TO_CUSTOMER').length,
      recentWorkOrders: workOrders.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch portal dashboard' }, { status: 500 });
  }
}
