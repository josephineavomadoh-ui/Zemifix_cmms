import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { transitionWorkOrderStatus } from '@/src/lib/services/workOrderService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updated = await transitionWorkOrderStatus(user, {
      workOrderId: id,
      newStatus: body.newStatus,
      reason: body.reason,
    });

    return NextResponse.json({ success: true, workOrder: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to transition work order status' }, { status: 400 });
  }
}
