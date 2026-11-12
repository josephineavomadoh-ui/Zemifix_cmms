import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { getScopedAssetFilter, createAsset } from '@/src/lib/services/assetService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = await getScopedAssetFilter(user);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const branchId = searchParams.get('branchId');

    const where: any = {
      ...filter,
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { assetTag: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: { select: { name: true, code: true } },
        location: { select: { name: true, code: true, building: true, room: true } },
        branch: { select: { name: true, code: true } },
        ownerCustomer: { select: { name: true, customerNumber: true } },
        managingCustomer: { select: { name: true, customerNumber: true } },
        site: { select: { name: true, siteCode: true } },
        custodianUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ assets, count: assets.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const asset = await createAsset({
      ...body,
      createdByUserId: user.id,
    });

    return NextResponse.json({ success: true, asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create asset' }, { status: 400 });
  }
}
