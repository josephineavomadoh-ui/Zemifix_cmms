import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { recordPaymentRemittance } from '@/src/lib/services/billingService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      include: {
        customer: { select: { name: true, customerNumber: true } },
        allocations: { include: { invoice: { select: { invoiceNumber: true, draftReference: true } } } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json({ payments, count: payments.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await recordPaymentRemittance(user, {
      customerId: body.customerId,
      invoiceId: body.invoiceId,
      amount: parseFloat(body.amount),
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to record payment remittance' }, { status: 400 });
  }
}
