import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { recordInternalRecharge } from '@/src/lib/services/billingService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recharges = await prisma.internalRecharge.findMany({
      include: {
        workOrder: { select: { workOrderNumber: true, title: true } },
        fromDepartment: { select: { name: true, code: true } },
        toDepartment: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ recharges, count: recharges.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch internal recharges' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const recharge = await recordInternalRecharge(user, {
      workOrderId: body.workOrderId,
      fromDepartmentId: body.fromDepartmentId,
      toDepartmentId: body.toDepartmentId,
      amount: parseFloat(body.amount),
      description: body.description,
    });

    return NextResponse.json({ success: true, recharge }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to record internal recharge' }, { status: 400 });
  }
}
