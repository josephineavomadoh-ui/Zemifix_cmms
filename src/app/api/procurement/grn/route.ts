import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { postGoodsReceivedNote } from '@/src/lib/services/procurementService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await postGoodsReceivedNote(user, body);

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to post Goods Received Note' }, { status: 400 });
  }
}
