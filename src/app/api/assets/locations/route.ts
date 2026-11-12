import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createLocation, getLocationTree } from '@/src/lib/services/locationService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') ?? user.branchId;

    const locations = await getLocationTree(branchId);
    return NextResponse.json({ locations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const location = await createLocation({
      ...body,
      createdByUserId: user.id,
    });

    return NextResponse.json({ success: true, location }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create location' }, { status: 400 });
  }
}
