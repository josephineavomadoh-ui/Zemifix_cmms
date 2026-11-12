import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createCustomerContract, getContracts } from '@/src/lib/services/contractService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contracts = await getContracts();
    return NextResponse.json({ contracts, count: contracts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const contract = await createCustomerContract(user, {
      customerId: body.customerId,
      title: body.title,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      slaPolicyId: body.slaPolicyId,
      billingFrequency: body.billingFrequency,
      contractValue: body.contractValue ? parseFloat(body.contractValue) : 0,
      siteIds: body.siteIds ?? [],
    });

    return NextResponse.json({ success: true, contract }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create customer contract' }, { status: 400 });
  }
}
