import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createWorkOrder, getWorkOrders } from '@/src/lib/services/workOrderService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrders = await getWorkOrders(user);
    return NextResponse.json({ workOrders, count: workOrders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const workOrder = await createWorkOrder(user, body);

    return NextResponse.json({ success: true, workOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create work order' }, { status: 400 });
  }
}
