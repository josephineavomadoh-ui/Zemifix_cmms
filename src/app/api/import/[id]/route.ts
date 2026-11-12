import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { getImportBatchById } from '@/src/lib/services/importService';
import { handleApiError } from '@/src/lib/db-errors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batch = await getImportBatchById(user, id);
    if (!batch) {
      return NextResponse.json({ error: 'Import batch not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, batch });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
