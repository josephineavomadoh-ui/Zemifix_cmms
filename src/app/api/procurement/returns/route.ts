import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createSupplierReturn } from '@/src/lib/services/procurementService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const supplierReturn = await createSupplierReturn(user, body);

    return NextResponse.json({ success: true, supplierReturn }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create supplier return' }, { status: 400 });
  }
}
