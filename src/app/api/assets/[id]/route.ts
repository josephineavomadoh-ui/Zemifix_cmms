import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { appendAuditLog } from '@/src/lib/services/auditService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        branch: true,
        ownerCustomer: true,
        managingCustomer: true,
        site: true,
        custodianUser: { select: { id: true, name: true, email: true } },
        responsibleUser: { select: { id: true, name: true, email: true } },
        responsibleDepartment: { select: { id: true, name: true, code: true } },
        parentAsset: { select: { id: true, name: true, assetTag: true } },
        childAssets: { select: { id: true, name: true, assetTag: true, status: true } },
        meters: { include: { readings: { orderBy: { readingTimestamp: 'desc' }, take: 10 } } },
        downtimeLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
        locationHistory: { orderBy: { movedAt: 'desc' }, take: 10 },
        statusHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
        boms: true,
        workOrders: { include: { assignedUser: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        workRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!asset || asset.deletedAt !== null) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ asset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch asset detail' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const updated = await prisma.$transaction(async (tx: any) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,
          criticality: body.criticality,
          manufacturer: body.manufacturer,
          modelNumber: body.modelNumber,
          serialNumber: body.serialNumber,
          custodianUserId: body.custodianUserId ?? null,
          responsibleUserId: body.responsibleUserId ?? null,
          responsibleDepartmentId: body.responsibleDepartmentId ?? null,
        },
      });

      await appendAuditLog(tx, {
        actorUserId: user.id,
        action: 'EDITED_ASSET_DETAILS',
        resource: 'asset',
        resourceId: id,
        payload: { name: body.name, assetTag: asset.assetTag },
      });

      return asset;
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to update asset' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const archived = await prisma.$transaction(async (tx: any) => {
      const asset = await tx.asset.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await appendAuditLog(tx, {
        actorUserId: user.id,
        action: 'ARCHIVED_ASSET',
        resource: 'asset',
        resourceId: id,
        payload: { assetTag: asset.assetTag, name: asset.name },
      });

      return asset;
    });

    return NextResponse.json({ success: true, archived: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to archive asset' }, { status: 400 });
  }
}
