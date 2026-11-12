import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { submitInvoiceForApproval } from '@/src/lib/services/billingService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const invoice = await submitInvoiceForApproval(user, id);
  return NextResponse.json({ success: true, invoice });
}
