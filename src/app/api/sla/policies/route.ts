import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createSlaPolicy, getSlaPolicies } from '@/src/lib/services/slaService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await getSlaPolicies();
    return NextResponse.json({ policies, count: policies.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch SLA policies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const policy = await createSlaPolicy(user, body);

    return NextResponse.json({ success: true, policy }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create SLA policy' }, { status: 400 });
  }
}
