import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { evaluateAllActiveSlaBreaches, getSlaBreachLogs } from '@/src/lib/services/slaService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const breachLogs = await getSlaBreachLogs();
    return NextResponse.json({ breachLogs, count: breachLogs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch SLA breach logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await evaluateAllActiveSlaBreaches();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to evaluate SLA breaches' }, { status: 400 });
  }
}
