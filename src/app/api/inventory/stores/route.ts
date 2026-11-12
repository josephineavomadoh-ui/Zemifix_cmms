import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createStore, getStores } from '@/src/lib/services/inventoryService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stores = await getStores(user);
    return NextResponse.json({ stores, count: stores.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const store = await createStore(user, body);

    return NextResponse.json({ success: true, store }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create warehouse store' }, { status: 400 });
  }
}
