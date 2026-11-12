import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { executeStoreTransfer } from '@/src/lib/services/inventoryService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await executeStoreTransfer(user, {
      sourceStoreId: body.sourceStoreId,
      destinationStoreId: body.destinationStoreId,
      partId: body.partId,
      quantity: parseFloat(body.quantity),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to execute store transfer' }, { status: 400 });
  }
}
