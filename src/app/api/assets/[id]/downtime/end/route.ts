import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { logDowntimeEnd } from '@/src/lib/services/telemetryService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await logDowntimeEnd(tx, {
        downtimeLogId: body.downtimeLogId,
        loggedByUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to end downtime' }, { status: 400 });
  }
}
