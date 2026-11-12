import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { reviewWorkRequest } from '@/src/lib/services/workRequestService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await reviewWorkRequest(user, {
      requestId: id,
      action: body.action,
      rejectionReason: body.rejectionReason,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to review work request' }, { status: 400 });
  }
}
