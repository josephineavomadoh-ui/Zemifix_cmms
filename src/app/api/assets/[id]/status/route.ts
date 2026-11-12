import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { updateAssetStatus } from '@/src/lib/services/assetService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await updateAssetStatus(tx, {
        assetId: id,
        newStatus: body.newStatus,
        reason: body.reason,
        changedByUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to update asset status' }, { status: 400 });
  }
}
