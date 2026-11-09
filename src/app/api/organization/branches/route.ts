import { NextRequest, NextResponse } from 'next/server';
import { getBranches, createBranch } from '@/src/lib/services/organizationService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    const branches = await getBranches(user);
    return NextResponse.json(branches);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only Admin or MaintenanceManager roles can create branches
    await requireAuth({ roles: ['Admin', 'MaintenanceManager'] });

    const body = await req.json();
    const result = await createBranch(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
