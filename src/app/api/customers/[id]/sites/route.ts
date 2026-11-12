import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { generateUuidV7 } from '@/src/lib/uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sites = await prisma.customerSite.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { siteCode: 'asc' },
    });

    return NextResponse.json({ sites, count: sites.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch customer sites' }, { status: 500 });
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
    const site = await prisma.customerSite.create({
      data: {
        id: generateUuidV7(),
        customerId: id,
        siteCode: body.siteCode,
        name: body.name,
        address: body.address,
        primaryContactName: body.primaryContactName ?? null,
        primaryContactPhone: body.primaryContactPhone ?? null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, site }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create customer site' }, { status: 400 });
  }
}
