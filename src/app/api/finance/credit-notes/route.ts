import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { issueCreditNote } from '@/src/lib/services/billingService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creditNotes = await prisma.creditNote.findMany({
      include: {
        customer: { select: { name: true, customerNumber: true } },
        invoice: { select: { invoiceNumber: true, draftReference: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ creditNotes, count: creditNotes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch credit notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const creditNote = await issueCreditNote(user, {
      invoiceId: body.invoiceId,
      reason: body.reason,
      subtotal: parseFloat(body.subtotal),
    });

    return NextResponse.json({ success: true, creditNote }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to issue credit note' }, { status: 400 });
  }
}
