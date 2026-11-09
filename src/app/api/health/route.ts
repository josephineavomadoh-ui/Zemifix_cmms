import { NextResponse } from 'next/server';
import { prisma } from '../../../platform/db';
import { isDatabaseConfigured, isDemoModeEnabled } from '@/src/lib/db-errors';

export async function GET() {
  if (!isDatabaseConfigured() && isDemoModeEnabled()) {
    return NextResponse.json({
      status: 'healthy',
      database: 'demonstration_mode',
      mode: 'demonstration',
      stats: {
        companyCount: 1,
        branchCount: 3,
        deptCount: 3,
        userCount: 2,
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Check raw DB connectivity
    const dbTest = await prisma.$queryRawUnsafe('SELECT 1 as connected');
    const companyCount = await prisma.company.count();
    const branchCount = await prisma.branch.count();
    const deptCount = await prisma.department.count();
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      rawCheck: dbTest,
      stats: {
        companyCount,
        branchCount,
        deptCount,
        userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'disconnected',
        error: error?.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
