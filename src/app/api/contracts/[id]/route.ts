import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { createContractRateCard } from '@/src/lib/services/contractService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contract = await prisma.customerContract.findUnique({
      where: { id },
      include: {
        customer: true,
        slaPolicy: { include: { rules: true, calendar: true } },
        contractSites: { include: { site: true } },
        rateCards: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch contract details' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const rateCard = await createContractRateCard(user, {
      contractId: id,
      category: body.category,
      hourlyRate: parseFloat(body.hourlyRate),
    });

    return NextResponse.json({ success: true, rateCard }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create rate card' }, { status: 400 });
  }
}
