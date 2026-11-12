import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createPurchaseOrder, getPurchaseOrders } from '@/src/lib/services/procurementService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purchaseOrders = await getPurchaseOrders(user);
    return NextResponse.json({ purchaseOrders, count: purchaseOrders.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const purchaseOrder = await createPurchaseOrder(user, body);

    return NextResponse.json({ success: true, purchaseOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create purchase order' }, { status: 400 });
  }
}
