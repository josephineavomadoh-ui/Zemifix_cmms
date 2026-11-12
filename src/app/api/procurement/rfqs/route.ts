import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createRfq } from '@/src/lib/services/procurementService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rfqs = await prisma.rfq.findMany({
      include: {
        requisition: { select: { requisitionNumber: true, justification: true } },
        createdByUser: { select: { name: true, email: true } },
        rfqVendors: { include: { vendor: { select: { registeredName: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rfqs, count: rfqs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch RFQs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rfq = await createRfq(user, body);

    return NextResponse.json({ success: true, rfq }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create RFQ' }, { status: 400 });
  }
}
