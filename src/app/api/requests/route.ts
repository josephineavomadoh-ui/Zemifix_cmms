import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createWorkRequest, getWorkRequests } from '@/src/lib/services/workRequestService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await getWorkRequests(user);
    return NextResponse.json({ requests, count: requests.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch work requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const request = await createWorkRequest(user, body);

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create work request' }, { status: 400 });
  }
}
