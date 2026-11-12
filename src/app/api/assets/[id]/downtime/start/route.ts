import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { logDowntimeStart } from '@/src/lib/services/telemetryService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await logDowntimeStart(tx, {
        assetId: id,
        downtimeType: body.downtimeType ?? 'UNPLANNED',
        reason: body.reason,
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        loggedByUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to log downtime start' }, { status: 400 });
  }
}
