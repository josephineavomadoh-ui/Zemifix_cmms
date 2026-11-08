import { NextResponse } from 'next/server';
import { prisma } from '../../../platform/db';

export async function GET() {
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
