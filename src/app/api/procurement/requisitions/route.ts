import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createPurchaseRequisition, getPurchaseRequisitions } from '@/src/lib/services/procurementService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requisitions = await getPurchaseRequisitions(user);
    return NextResponse.json({ requisitions, count: requisitions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch purchase requisitions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const requisition = await createPurchaseRequisition(user, body);

    return NextResponse.json({ success: true, requisition }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create purchase requisition' }, { status: 400 });
  }
}
