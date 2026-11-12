import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { issueMaterialToWorkOrder } from '@/src/lib/services/inventoryService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await issueMaterialToWorkOrder(user, {
      workOrderId: body.workOrderId,
      storeId: body.storeId,
      partId: body.partId,
      quantity: parseFloat(body.quantity),
      unitCost: body.unitCost ? parseFloat(body.unitCost) : undefined,
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to issue material to work order' }, { status: 400 });
  }
}
