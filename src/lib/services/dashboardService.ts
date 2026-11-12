import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { getScopedWorkOrderFilter } from './workOrderService';
import { getScopedAssetFilter } from './assetService';
import { getCompany } from './organizationService';

export interface LiveDashboardMetrics {
  organization: {
    companyName: string;
    baseCurrency: string;
    accessScope: string;
    totalBranches: number;
    totalDepartments: number;
    totalStaff: number;
    branchesList: { id: string; name: string; code: string; type: string }[];
    departmentsList: { id: string; name: string; code: string }[];
  };
  source: 'database' | 'demonstration_mode';
  isDemoData: boolean;
  operationalReadiness?: any;
  workOrders: {
    total: number;
    open: number;
    assigned: number;
    inProgress: number;
    onHold: number;
    completed: number;
    overdue: number;
    pendingRequests: number;
  };
  assets: {
    total: number;
    operational: number;
    down: number;
    inMaintenance: number;
    availabilityPercentage: number;
    totalDowntimeMinutes: number;
  };
  inventory: {
    totalPartCount: number;
    totalStockValue: number;
    lowStockCount: number;
  };
  procurement: {
    pendingRequisitions: number;
    issuedPurchaseOrders: number;
    totalProcurementSpend: number;
  };
  slaAndContracts: {
    activeContracts: number;
    slaBreachCount: number;
  };
  finance: {
    totalInvoicedAmount: number;
    paidAmount: number;
    outstandingReceivables: number;
    internalRechargesCount: number;
    totalInternalRechargeAmount: number;
  };
  recentWorkOrders: Array<{
    id: string;
    workOrderNumber: string;
    title: string;
    status: string;
    priority: string;
    assetName?: string;
    locationName?: string;
    createdAt: string;
  }>;
}

const readinessBaseline = {
  identityAndOrganization: { status: 'operational', message: 'Branches, Departments, Roles & Users Live' },
  workOrdersAndMaintenance: { status: 'operational', metricDisplay: 'Live Operations', note: 'Work Orders & Maintenance Live' },
  inventoryAndStockLedger: { status: 'operational', metricDisplay: 'Live Stock Ledger', note: 'Inventory & WAC Stock Ledger Live' },
};

export type DashboardStatistics = LiveDashboardMetrics;

export async function getDashboardMetrics(user?: AuthenticatedUser): Promise<LiveDashboardMetrics> {
  const compRes = await getCompany();
  const comp = compRes.data;

  const now = new Date();
  const woScopeWhere = user ? await getScopedWorkOrderFilter(user) : { deletedAt: null };
  const assetScopeWhere = user ? await getScopedAssetFilter(user) : { deletedAt: null };

  // Parallel batch execution across all dashboard metric domains
  const [
    woCounts,
    pendingRequests,
    overdueWos,
    assetStatusCounts,
    downtimeLogSums,
    parts,
    stocks,
    pendingReqs,
    issuedPos,
    spendAggregate,
    activeContracts,
    slaBreaches,
    invoiceAgg,
    rechargesAgg,
    rechargesCount,
    recentWos,
    branches,
    departments,
    totalStaff,
  ] = await Promise.all([
    // Work order domain
    prisma.workOrder.groupBy({ by: ['status'], where: woScopeWhere, _count: { _all: true } }),
    prisma.workRequest.count({ where: { status: 'SUBMITTED' } }),
    prisma.workOrder.count({ where: { ...woScopeWhere, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] }, plannedEnd: { lt: now } } }),

    // Asset domain
    prisma.asset.groupBy({ by: ['status'], where: assetScopeWhere, _count: { _all: true } }),
    prisma.assetDowntimeLog.aggregate({ where: { asset: assetScopeWhere, endedAt: { not: null } }, _sum: { durationMinutes: true } }),

    // Inventory domain
    prisma.part.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, reorderLevel: true, stocks: { select: { quantityOnHand: true } } } }),
    prisma.stock.findMany({ select: { totalValue: true } }),

    // Procurement domain
    prisma.purchaseRequisition.count({ where: { status: { in: ['SUBMITTED', 'PENDING_APPROVAL'] }, deletedAt: null } }),
    prisma.purchaseOrder.count({ where: { status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] }, deletedAt: null } }),
    prisma.purchaseOrder.aggregate({ where: { status: { in: ['ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'] }, deletedAt: null }, _sum: { totalAmount: true } }),

    // SLA & Contracts domain
    prisma.customerContract.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    prisma.slaBreachLog.count(),

    // Finance domain
    prisma.invoice.aggregate({ where: { status: { not: 'DRAFT' }, deletedAt: null }, _sum: { totalAmount: true, paidAmount: true, balanceDue: true } }),
    prisma.internalRecharge.aggregate({ _sum: { amount: true } }),
    prisma.internalRecharge.count(),

    // Recent work orders
    prisma.workOrder.findMany({
      where: woScopeWhere,
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workOrderNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        asset: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),

    // Organization lists
    prisma.branch.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, code: true, type: true } }),
    prisma.department.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, code: true } }),
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),
  ]);

  // Compute work order totals
  const woStatusMap: Record<string, number> = {};
  let totalWos = 0;
  woCounts.forEach((group) => {
    const cnt = group._count._all;
    woStatusMap[group.status] = cnt;
    totalWos += cnt;
  });

  // Compute asset availability totals
  let totalAssets = 0;
  let operationalAssets = 0;
  let downAssets = 0;
  let inMaintAssets = 0;
  assetStatusCounts.forEach((group) => {
    const cnt = group._count._all;
    totalAssets += cnt;
    if (group.status === 'OPERATIONAL') operationalAssets += cnt;
    if (group.status === 'DOWN') downAssets += cnt;
    if (group.status === 'IN_MAINTENANCE') inMaintAssets += cnt;
  });

  const availabilityPercentage = totalAssets > 0
    ? Math.round(((totalAssets - downAssets) / totalAssets) * 100)
    : 100;

  // Compute stock valuations
  let totalStockVal = 0;
  stocks.forEach((s) => {
    totalStockVal += parseFloat(s.totalValue.toString());
  });

  let lowStockCount = 0;
  parts.forEach((p) => {
    const reorderLevel = parseFloat(p.reorderLevel.toString());
    if (reorderLevel > 0) {
      const totalAvail = p.stocks.reduce((sum, s) => sum + parseFloat(s.quantityOnHand.toString()), 0);
      if (totalAvail <= reorderLevel) lowStockCount++;
    }
  });

  return {
    organization: {
      companyName: comp.name,
      baseCurrency: comp.baseCurrency,
      accessScope: user?.accessScope ?? 'Company',
      totalBranches: branches.length,
      totalDepartments: departments.length,
      totalStaff,
      branchesList: branches,
      departmentsList: departments,
    },
    source: 'database',
    isDemoData: false,
    operationalReadiness: readinessBaseline,
    workOrders: {
      total: totalWos,
      open: woStatusMap['OPEN'] ?? 0,
      assigned: woStatusMap['ASSIGNED'] ?? 0,
      inProgress: woStatusMap['IN_PROGRESS'] ?? 0,
      onHold: woStatusMap['ON_HOLD'] ?? 0,
      completed: woStatusMap['COMPLETED'] ?? 0,
      overdue: overdueWos,
      pendingRequests,
    },
    assets: {
      total: totalAssets,
      operational: operationalAssets,
      down: downAssets,
      inMaintenance: inMaintAssets,
      availabilityPercentage,
      totalDowntimeMinutes: downtimeLogSums._sum.durationMinutes ?? 0,
    },
    inventory: {
      totalPartCount: parts.length,
      totalStockValue: totalStockVal,
      lowStockCount,
    },
    procurement: {
      pendingRequisitions: pendingReqs,
      issuedPurchaseOrders: issuedPos,
      totalProcurementSpend: parseFloat(spendAggregate._sum.totalAmount?.toString() ?? '0'),
    },
    slaAndContracts: {
      activeContracts,
      slaBreachCount: slaBreaches,
    },
    finance: {
      totalInvoicedAmount: parseFloat(invoiceAgg._sum.totalAmount?.toString() ?? '0'),
      paidAmount: parseFloat(invoiceAgg._sum.paidAmount?.toString() ?? '0'),
      outstandingReceivables: parseFloat(invoiceAgg._sum.balanceDue?.toString() ?? '0'),
      internalRechargesCount: rechargesCount,
      totalInternalRechargeAmount: parseFloat(rechargesAgg._sum.amount?.toString() ?? '0'),
    },
    recentWorkOrders: recentWos.map((w) => ({
      id: w.id,
      workOrderNumber: w.workOrderNumber,
      title: w.title,
      status: w.status,
      priority: w.priority,
      assetName: w.asset?.name,
      locationName: w.location?.name,
      createdAt: w.createdAt.toISOString(),
    })),
  };
}
