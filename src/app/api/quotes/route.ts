import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createQuote } from '@/src/lib/services/quoteService';
import { prisma } from '@/src/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotes = await prisma.quote.findMany({
      where: { deletedAt: null },
      include: {
        customer: { select: { name: true, customerNumber: true } },
        site: { select: { name: true, siteCode: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ quotes, count: quotes.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const quote = await createQuote(user, body);

    return NextResponse.json({ success: true, quote }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create quote' }, { status: 400 });
  }
}
