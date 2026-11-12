/**
 * EXPLAIN (ANALYZE, BUFFERS) Performance Analyzer for Phase 4 Verification
 */

import { prisma } from '../src/lib/prisma';

async function runExplainAnalysis() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — EXPLAIN (ANALYZE, BUFFERS) Performance Inspection');
  console.log('=====================================================');

  // 1. Table Record Counts
  const [woCount, assetCount, stockTxCount, auditCount, jobCount, notifCount, invCount] = await Promise.all([
    prisma.workOrder.count(),
    prisma.asset.count(),
    prisma.stockTransaction.count(),
    prisma.auditLog.count(),
    prisma.backgroundJob.count(),
    prisma.notification.count(),
    prisma.invoice.count(),
  ]);

  console.log('\n--- Actual Database Record Counts ---');
  console.log(`work_orders: ${woCount}`);
  console.log(`assets: ${assetCount}`);
  console.log(`stock_transactions: ${stockTxCount}`);
  console.log(`audit_logs: ${auditCount}`);
  console.log(`background_jobs: ${jobCount}`);
  console.log(`notifications: ${notifCount}`);
  console.log(`invoices: ${invCount}`);

  // 2. EXPLAIN (ANALYZE, BUFFERS) Inspections
  console.log('\n--- Query Execution Plans (EXPLAIN ANALYZE) ---');

  // Query 1: Work Order Branch/Status/Date Filtering
  console.log('\n[Query 1] Work Order Branch/Status/Date Filtering:');
  const q1 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "workOrderNumber", title, status, priority, "createdAt"
    FROM "work_orders"
    WHERE "branchId" IS NOT NULL AND status = 'OPEN' AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 20;
  `);
  q1.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 2: Technician Assignment Filtering
  console.log('\n[Query 2] Technician Assignment Filtering:');
  const q2 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "workOrderNumber", title, status, priority, "plannedStart"
    FROM "work_orders"
    WHERE "assignedUserId" IS NOT NULL AND status IN ('ASSIGNED', 'IN_PROGRESS') AND "deletedAt" IS NULL
    ORDER BY "plannedStart" ASC
    LIMIT 20;
  `);
  q2.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 3: Customer Work Order Filtering
  console.log('\n[Query 3] Customer Work Order Filtering:');
  const q3 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "workOrderNumber", title, status, "createdAt"
    FROM "work_orders"
    WHERE "customerId" IS NOT NULL AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 20;
  `);
  q3.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 4: Asset Branch/Status/Category Filtering
  console.log('\n[Query 4] Asset Branch/Status/Category Filtering:');
  const q4 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "assetTag", name, status, "branchId", "categoryId"
    FROM "assets"
    WHERE "branchId" IS NOT NULL AND status = 'OPERATIONAL' AND "deletedAt" IS NULL
    LIMIT 20;
  `);
  q4.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 5: Stock Ledger Store/Part History
  console.log('\n[Query 5] Stock Ledger Store/Part History:');
  const q5 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, "storeId", "partId", "transactionType", quantity, "unitCost", "createdAt"
    FROM "stock_transactions"
    WHERE "storeId" IS NOT NULL AND "partId" IS NOT NULL
    ORDER BY "createdAt" DESC
    LIMIT 20;
  `);
  q5.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 6: Audit Resource History
  console.log('\n[Query 6] Audit Resource History:');
  const q6 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id, resource, "resourceId", action, "createdAt"
    FROM "audit_logs"
    WHERE resource = 'WorkOrder'
    ORDER BY "createdAt" DESC
    LIMIT 20;
  `);
  q6.forEach((r) => console.log('  ', Object.values(r)[0]));

  // Query 7: Background Job Claiming
  console.log('\n[Query 7] Background Job Claiming (FOR UPDATE SKIP LOCKED):');
  const q7 = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
    SELECT id FROM "background_jobs"
    WHERE status = 'PENDING'
    ORDER BY "createdAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `);
  q7.forEach((r) => console.log('  ', Object.values(r)[0]));
}

runExplainAnalysis();
