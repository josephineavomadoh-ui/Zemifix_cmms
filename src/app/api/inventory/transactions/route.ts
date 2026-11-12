import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const partId = searchParams.get('partId');

    const transactions = await prisma.stockTransaction.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        ...(partId ? { partId } : {}),
      },
      include: {
        store: { select: { name: true, code: true } },
        part: { select: { name: true, partNumber: true, uom: true } },
        actingUser: { select: { name: true, email: true } },
        workOrder: { select: { workOrderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch stock transactions' }, { status: 500 });
  }
}
