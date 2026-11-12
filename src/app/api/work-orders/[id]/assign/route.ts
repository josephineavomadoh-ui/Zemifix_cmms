import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { assignWorkOrder } from '@/src/lib/services/workOrderService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updated = await assignWorkOrder(user, {
      workOrderId: id,
      assignedUserId: body.assignedUserId,
    });

    return NextResponse.json({ success: true, workOrder: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to assign work order' }, { status: 400 });
  }
}
