import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPortalContact } from '@/src/lib/portalAuth';
import { prisma } from '@/src/lib/prisma';
import { getAuthorizedSiteIdsForContact } from '@/src/lib/services/portalService';

export async function GET(req: NextRequest) {
  try {
    const contact = await getCurrentPortalContact(req);
    if (!contact) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authorizedSiteIds = await getAuthorizedSiteIdsForContact(contact);

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: contact.customerId,
        status: { in: ['APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
        AND: [
          {
            OR: [
              { siteId: null },
              { siteId: { in: authorizedSiteIds } },
            ],
          },
        ],
      },
      include: {
        site: { select: { name: true, siteCode: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices, count: invoices.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch customer invoices' }, { status: 500 });
  }
}
