import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { createMeter } from '@/src/lib/services/telemetryService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meters = await prisma.assetMeter.findMany({
      where: { assetId: id },
      include: {
        readings: { orderBy: { readingTimestamp: 'desc' }, take: 10 },
      },
    });

    return NextResponse.json({ meters });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch asset meters' }, { status: 500 });
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

    const meter = await prisma.$transaction(async (tx: any) => {
      return await createMeter(tx, {
        assetId: id,
        name: body.name,
        unitOfMeasure: body.unitOfMeasure,
        meterType: body.meterType,
        initialReading: body.initialReading,
        rolloverThreshold: body.rolloverThreshold,
      });
    });

    return NextResponse.json({ success: true, meter }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create meter' }, { status: 400 });
  }
}
