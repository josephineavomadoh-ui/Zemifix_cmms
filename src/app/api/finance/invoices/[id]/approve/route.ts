import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { approveInvoice } from '@/src/lib/services/billingService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await approveInvoice(user, id);

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to approve invoice' }, { status: 400 });
  }
}
