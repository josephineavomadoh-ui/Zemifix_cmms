import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { relocateAsset } from '@/src/lib/services/assetService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await relocateAsset(tx, {
        assetId: id,
        toLocationId: body.toLocationId,
        toSiteId: body.toSiteId,
        toPhysicalSiteCustomerId: body.toPhysicalSiteCustomerId,
        reason: body.reason,
        movedByUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to relocate asset' }, { status: 400 });
  }
}
