/**
 * Dashboard Query Breakdown Profiler
 */

import { getDashboardMetrics } from '../src/lib/services/dashboardService';
import { prisma } from '../src/lib/prisma';

async function profileDashboard() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Dashboard Metrics Query Breakdown');
  console.log('=====================================================');

  const t0 = performance.now();

  // Section 1: Work Orders Aggregation
  const t1 = performance.now();
  await Promise.all([
    prisma.workOrder.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.workRequest.count({ where: { status: 'SUBMITTED' } }),
    prisma.workOrder.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] }, plannedEnd: { lt: new Date() }, deletedAt: null } }),
  ]);
  const dur1 = performance.now() - t1;

  // Section 2: Assets & Downtime Aggregation
  const t2 = performance.now();
  await Promise.all([
    prisma.asset.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.assetDowntimeLog.aggregate({ where: { endedAt: { not: null } }, _sum: { durationMinutes: true } }),
  ]);
  const dur2 = performance.now() - t2;

  // Section 3: Inventory Aggregation
  const t3 = performance.now();
  await Promise.all([
    prisma.part.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, reorderLevel: true, stocks: { select: { quantityOnHand: true } } } }),
    prisma.stock.findMany({ select: { totalValue: true } }),
  ]);
  const dur3 = performance.now() - t3;

  // Section 4: Procurement Aggregation
  const t4 = performance.now();
  await Promise.all([
    prisma.purchaseRequisition.count({ where: { status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] }, deletedAt: null } }),
    prisma.purchaseOrder.count({ where: { status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] }, deletedAt: null } }),
    prisma.purchaseOrder.aggregate({ where: { status: { in: ['ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'] }, deletedAt: null }, _sum: { totalAmount: true } }),
  ]);
  const dur4 = performance.now() - t4;

  // Section 5: SLA & Finance Aggregations
  const t5 = performance.now();
  await Promise.all([
    prisma.customerContract.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.slaBreachLog.count(),
    prisma.invoice.aggregate({ where: { status: { not: 'DRAFT' }, deletedAt: null }, _sum: { totalAmount: true, paidAmount: true, balanceDue: true } }),
    prisma.internalRecharge.aggregate({ _sum: { amount: true } }),
    prisma.internalRecharge.count(),
  ]);
  const dur5 = performance.now() - t5;

  // Section 6: Recent Work Orders & Org
  const t6 = performance.now();
  await Promise.all([
    prisma.workOrder.findMany({
      where: { deletedAt: null },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: { id: true, workOrderNumber: true, title: true, status: true, priority: true, createdAt: true, asset: { select: { name: true } }, location: { select: { name: true } } },
    }),
    prisma.branch.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, code: true, type: true } }),
    prisma.department.findMany({ where: { isActive: { not: false }, deletedAt: null }, select: { id: true, name: true, code: true } }),
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),
  ]);
  const dur6 = performance.now() - t6;

  const totalDur = performance.now() - t0;

  console.log(`1. Work Order Aggregations: ${dur1.toFixed(2)} ms`);
  console.log(`2. Asset Aggregations:     ${dur2.toFixed(2)} ms`);
  console.log(`3. Inventory Aggregations: ${dur3.toFixed(2)} ms`);
  console.log(`4. Procurement Aggregation: ${dur4.toFixed(2)} ms`);
  console.log(`5. SLA & Finance Aggs:     ${dur5.toFixed(2)} ms`);
  console.log(`6. Recent WOs & Org Lists: ${dur6.toFixed(2)} ms`);
  console.log(`-----------------------------------------------`);
  console.log(`Total Dashboard Execution Time: ${totalDur.toFixed(2)} ms`);
}

profileDashboard();
