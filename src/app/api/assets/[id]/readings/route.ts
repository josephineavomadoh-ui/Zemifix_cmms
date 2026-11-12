import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { submitMeterReading } from '@/src/lib/services/telemetryService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await submitMeterReading(tx, {
        meterId: body.meterId,
        readingValue: body.readingValue,
        readingTimestamp: body.readingTimestamp ? new Date(body.readingTimestamp) : undefined,
        isRollover: body.isRollover,
        isReset: body.isReset,
        recordedByUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to submit meter reading' }, { status: 400 });
  }
}
