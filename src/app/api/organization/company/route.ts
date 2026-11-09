import { NextResponse } from 'next/server';
import { getCompany } from '@/src/lib/services/organizationService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const comp = await getCompany();
    return NextResponse.json(comp);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
