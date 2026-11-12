import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createInvoice } from '@/src/lib/services/billingService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { name: true, customerNumber: true } },
        site: { select: { name: true, siteCode: true } },
        lines: true,
        creditNotes: true,
        allocations: { include: { payment: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invoices, count: invoices.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const invoice = await createInvoice(user, {
      ...body,
      dueDate: new Date(body.dueDate),
    });

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create draft invoice' }, { status: 400 });
  }
}
