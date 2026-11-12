import { NextRequest, NextResponse } from 'next/server';
import { runBackgroundWorker, getBackgroundJobMetrics } from '@/src/lib/services/backgroundJobService';
import { handleApiError } from '@/src/lib/db-errors';

export async function POST(req: NextRequest) {
  try {
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerSecret || workerSecret.length < 32) {
      return NextResponse.json({ error: 'Unauthorized: Worker secret is not configured in production environment.' }, { status: 401 });
    }

    const authHeader = req.headers.get('x-worker-secret') || req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token || token !== workerSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing worker secret.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const workerId = body.workerId ?? `worker-${Date.now()}`;
    const jobType = body.jobType;

    const executionResult = await runBackgroundWorker(workerId, jobType);
    const metrics = await getBackgroundJobMetrics();

    return NextResponse.json({ success: true, execution: executionResult, ...metrics });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const workerSecret = process.env.WORKER_SECRET;
    if (!workerSecret || workerSecret.length < 32) {
      return NextResponse.json({ error: 'Unauthorized: Worker secret is not configured in production environment.' }, { status: 401 });
    }

    const authHeader = req.headers.get('x-worker-secret') || req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token || token !== workerSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing worker secret.' }, { status: 401 });
    }

    const metrics = await getBackgroundJobMetrics();
    return NextResponse.json({ success: true, ...metrics });
  } catch (error: unknown) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
