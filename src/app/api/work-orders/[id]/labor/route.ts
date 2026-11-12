import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { recordWorkOrderLabor } from '@/src/lib/services/workOrderService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const labor = await recordWorkOrderLabor(user, {
      workOrderId: id,
      technicianUserId: body.technicianUserId ?? user.id,
      workDate: body.workDate ? new Date(body.workDate) : new Date(),
      hoursWorked: parseFloat(body.hoursWorked),
      hourlyRate: body.hourlyRate ? parseFloat(body.hourlyRate) : undefined,
      description: body.description,
    });

    return NextResponse.json({ success: true, labor }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to record labor' }, { status: 400 });
  }
}
