import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { recordWorkOrderPart } from '@/src/lib/services/workOrderService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const part = await recordWorkOrderPart(user, {
      workOrderId: id,
      partNumber: body.partNumber,
      partName: body.partName,
      quantityPlanned: body.quantityPlanned ? parseFloat(body.quantityPlanned) : undefined,
      quantityConsumed: body.quantityConsumed ? parseFloat(body.quantityConsumed) : undefined,
      unitCost: body.unitCost ? parseFloat(body.unitCost) : undefined,
    });

    return NextResponse.json({ success: true, part }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to record part requirement' }, { status: 400 });
  }
}
