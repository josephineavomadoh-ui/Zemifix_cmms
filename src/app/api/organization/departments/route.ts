import { NextRequest, NextResponse } from 'next/server';
import { getDepartments, createDepartment } from '@/src/lib/services/organizationService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const departments = await getDepartments();
    return NextResponse.json(departments);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only Admin role can create departments
    await requireAuth({ roles: ['Admin'] });

    const body = await req.json();
    const result = await createDepartment(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
