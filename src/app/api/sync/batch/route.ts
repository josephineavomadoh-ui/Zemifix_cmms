import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { processSyncBatch } from '@/src/lib/services/syncService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Session expired or invalid' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.mutations || !Array.isArray(body.mutations)) {
      return NextResponse.json({ error: 'INVALID_BATCH_PAYLOAD: Mutations array is required' }, { status: 400 });
    }

    const result = await processSyncBatch(user, {
      batchRef: body.batchRef,
      mutations: body.mutations,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to process sync batch' }, { status: 400 });
  }
}
