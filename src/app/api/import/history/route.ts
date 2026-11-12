import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { getImportBatches } from '@/src/lib/services/importService';
import { handleApiError } from '@/src/lib/db-errors';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batches = await getImportBatches(user);
    return NextResponse.json({ success: true, batches });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
