import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';
import { postStockTransaction } from '@/src/lib/services/inventoryService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await prisma.$transaction(async (tx: any) => {
      return await postStockTransaction(tx, {
        transactionType: body.transactionType ?? 'RECEIPT', // RECEIPT | OPENING_BALANCE
        storeId: body.storeId,
        partId: body.partId,
        quantity: parseFloat(body.quantity),
        unitCost: parseFloat(body.unitCost),
        referenceDoc: body.referenceDoc,
        actingUserId: user.id,
      });
    });

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to post stock receipt' }, { status: 400 });
  }
}
