import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, name: true, assetTag: true, status: true, modelNumber: true, serialNumber: true } },
        location: { select: { id: true, name: true, code: true, building: true, room: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        supervisorUser: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        tasks: { orderBy: { taskOrder: 'asc' } },
        checklists: { orderBy: { itemOrder: 'asc' } },
        labor: { include: { technicianUser: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
        parts: { orderBy: { createdAt: 'desc' } },
        statusHistory: { include: { changedByUser: { select: { name: true } } }, orderBy: { changedAt: 'desc' } },
        assignmentHistory: { include: { assignedUser: { select: { name: true } }, assignedByUser: { select: { name: true } } }, orderBy: { assignedAt: 'desc' } },
        sourceWorkRequests: true,
      },
    });

    if (!workOrder || workOrder.deletedAt !== null) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({ workOrder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch work order detail' }, { status: 500 });
  }
}
