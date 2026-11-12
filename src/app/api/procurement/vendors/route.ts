import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createVendor, getVendors } from '@/src/lib/services/vendorService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;

    const vendors = await getVendors(search);
    return NextResponse.json({ vendors, count: vendors.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const vendor = await createVendor(user, body);

    return NextResponse.json({ success: true, vendor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create vendor' }, { status: 400 });
  }
}
