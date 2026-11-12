import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createPart, getParts } from '@/src/lib/services/inventoryService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const category = searchParams.get('category') ?? undefined;

    const parts = await getParts(search, category);
    return NextResponse.json({ parts, count: parts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch inventory parts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const part = await createPart(user, body);

    return NextResponse.json({ success: true, part }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create inventory part' }, { status: 400 });
  }
}
