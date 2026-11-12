import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { generateUuidV7 } from '@/src/lib/uuid';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        sites: true,
        contacts: true,
        contracts: true,
      },
      orderBy: { customerNumber: 'asc' },
    });

    return NextResponse.json({ customers, count: customers.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const ts = Date.now();
    const customerNumber = body.customerNumber ?? `CUST-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    const customer = await prisma.customer.create({
      data: {
        id: generateUuidV7(),
        customerNumber,
        name: body.name,
        taxId: body.taxId ?? null,
        billingAddress: body.billingAddress,
        primaryPhone: body.primaryPhone,
        primaryEmail: body.primaryEmail,
        paymentTermsDays: body.paymentTermsDays ? parseInt(body.paymentTermsDays) : 30,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create customer' }, { status: 400 });
  }
}
