import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { executeReportQuery, generateCsvString } from '@/src/lib/services/reportService';
import { appendAuditLog } from '@/src/lib/services/auditService';
import { prisma } from '@/src/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // Fetch all records for export (pageSize: 5000)
    const reportResult = await executeReportQuery(user, { ...body, pageSize: 5000, page: 1 });

    const csvContent = generateCsvString(reportResult.columns, reportResult.data);

    // Audit Log the sensitive report export
    await prisma.$transaction(async (tx: any) => {
      await appendAuditLog(tx, {
        actorUserId: user.id,
        action: 'EXPORTED_SENSITIVE_REPORT',
        resource: 'report',
        resourceId: body.reportId ?? 'general_report',
        payload: { reportId: body.reportId, category: body.category, rowCount: reportResult.data.length },
      });
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${body.reportId ?? 'report'}_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Report export failed' }, { status: 400 });
  }
}
