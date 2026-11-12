import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { getScopedWorkOrderFilter } from './workOrderService';
import { getScopedAssetFilter } from './assetService';
import { appendAuditLog } from './auditService';

export interface ReportQueryParams {
  category: 'maintenance' | 'assets' | 'inventory' | 'procurement' | 'contractor' | 'finance';
  reportId: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  departmentId?: string;
  customerId?: string;
  siteId?: string;
  vendorId?: string;
  status?: string;
  assetId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportResult {
  reportId: string;
  title: string;
  totalCount: number;
  page: number;
  pageSize: number;
  summary?: Record<string, any>;
  columns: string[];
  data: (string | number | null)[][];
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a cell for CSV output — prevents spreadsheet formula injection
 * per OWASP CSV injection guidance.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) return `"'${str}"`;
  return `"${str}"`;
}

export function generateCsvString(
  headers: string[],
  rows: (string | number | null)[][]
): string {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(sanitizeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\n');
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function toFloat(d: any): number {
  if (d === null || d === undefined) return 0;
  return parseFloat(d.toString());
}

function toIsoDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d instanceof Date
    ? d.toISOString().slice(0, 10)
    : new Date(d).toISOString().slice(0, 10);
}

function buildDateFilter(
  startDate?: string,
  endDate?: string
): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: new Date(startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function executeReportQuery(
  user: AuthenticatedUser,
  params: ReportQueryParams
): Promise<ReportResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(500, Math.max(10, params.pageSize ?? 50));
  const skip = (page - 1) * pageSize;
  const dateFilter = buildDateFilter(params.startDate, params.endDate);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MAINTENANCE REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'maintenance') {
    const woScope = await getScopedWorkOrderFilter(user);

    // 1a. Work Order History
    if (params.reportId === 'work_order_history') {
      const where = {
        ...woScope,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            asset: { select: { name: true, assetTag: true } },
            branch: { select: { name: true } },
            assignedUser: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.aggregate({ where, _sum: { totalCost: true, actualHours: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Work Order History',
        totalCount,
        page,
        pageSize,
        summary: {
          totalCostGhs: toFloat(agg._sum.totalCost),
          totalHours: toFloat(agg._sum.actualHours),
        },
        columns: [
          'WO #', 'Title', 'Type', 'Priority', 'Status', 'Asset', 'Branch',
          'Assigned To', 'Actual Hours', 'Total Cost (GHS)', 'Created',
        ],
        data: items.map((w) => [
          w.workOrderNumber, w.title, w.type, w.priority, w.status,
          w.asset?.name ?? '', w.branch?.name ?? '',
          w.assignedUser?.name ?? 'Unassigned',
          w.actualHours.toString(), w.totalCost.toString(),
          toIsoDate(w.createdAt),
        ]),
      };
    }

    // 1b. Work Order Completion & Overdue Analysis
    if (params.reportId === 'work_order_completion') {
      const where = {
        ...woScope,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
      };
      const now = new Date();
      const [totalCount, items] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            asset: { select: { name: true, assetTag: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      const completed = items.filter((w) => w.status === 'COMPLETED').length;
      const overdue = items.filter(
        (w) =>
          w.plannedEnd &&
          new Date(w.plannedEnd) < now &&
          !['COMPLETED', 'CANCELLED'].includes(w.status)
      ).length;
      return {
        reportId: params.reportId,
        title: 'Work Order Completion & Overdue Analysis',
        totalCount,
        page,
        pageSize,
        summary: { completed, overdue },
        columns: [
          'WO #', 'Title', 'Status', 'Priority', 'Planned End', 'Actual End', 'Overdue', 'Branch',
        ],
        data: items.map((w) => {
          const isOverdue =
            w.plannedEnd &&
            new Date(w.plannedEnd) < now &&
            !['COMPLETED', 'CANCELLED'].includes(w.status);
          return [
            w.workOrderNumber, w.title, w.status, w.priority,
            toIsoDate(w.plannedEnd), toIsoDate(w.actualEnd),
            isOverdue ? 'Yes' : 'No', w.branch?.name ?? '',
          ];
        }),
      };
    }

    // 1c. Maintenance Costs by Branch & Type
    if (params.reportId === 'maintenance_costs') {
      const where = {
        ...woScope,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
      };
      const groups = await prisma.workOrder.groupBy({
        by: ['branchId', 'type'],
        where,
        _sum: { totalCost: true, actualHours: true },
        _count: { _all: true },
      });
      const branchIds = [...new Set(groups.map((g) => g.branchId))];
      const branches = await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      });
      const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
      const totalCost = groups.reduce((s, g) => s + toFloat(g._sum.totalCost), 0);
      return {
        reportId: params.reportId,
        title: 'Maintenance Costs by Branch & Type',
        totalCount: groups.length,
        page: 1,
        pageSize: groups.length,
        summary: { totalCostGhs: totalCost },
        columns: ['Branch', 'WO Type', 'Count', 'Total Hours', 'Total Cost (GHS)'],
        data: groups.map((g) => [
          branchMap[g.branchId] ?? g.branchId,
          g.type,
          g._count._all,
          toFloat(g._sum.actualHours).toFixed(1),
          toFloat(g._sum.totalCost).toFixed(2),
        ]),
      };
    }

    // 1d. Preventive Maintenance Compliance
    if (params.reportId === 'pm_compliance') {
      const where = {
        ...woScope,
        type: 'PREVENTIVE' as const,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
      };
      const now = new Date();
      const [totalCount, items] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            asset: { select: { name: true, assetTag: true } },
            branch: { select: { name: true } },
            assignedUser: { select: { name: true } },
          },
          orderBy: { plannedEnd: 'asc' },
        }),
      ]);
      const completed = items.filter((w) => w.status === 'COMPLETED').length;
      const overdue = items.filter(
        (w) => w.plannedEnd && new Date(w.plannedEnd) < now && w.status !== 'COMPLETED'
      ).length;
      const compliancePct =
        items.length > 0 ? Math.round((completed / items.length) * 100) : 100;
      return {
        reportId: params.reportId,
        title: 'Preventive Maintenance Compliance',
        totalCount,
        page,
        pageSize,
        summary: { compliancePercent: compliancePct, completed, overdue },
        columns: ['WO #', 'Title', 'Asset', 'Asset Tag', 'Branch', 'Planned Date', 'Status', 'Assigned To'],
        data: items.map((w) => [
          w.workOrderNumber, w.title,
          w.asset?.name ?? '', w.asset?.assetTag ?? '',
          w.branch?.name ?? '', toIsoDate(w.plannedEnd),
          w.status, w.assignedUser?.name ?? 'Unassigned',
        ]),
      };
    }

    // 1e. Technician Performance
    if (params.reportId === 'technician_performance') {
      const woScopeInner = await getScopedWorkOrderFilter(user);
      const woWhere = {
        ...woScopeInner,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        assignedUserId: { not: null as unknown as string },
      };
      const groups = await prisma.workOrder.groupBy({
        by: ['assignedUserId'],
        where: woWhere,
        _count: { _all: true },
        _sum: { totalCost: true, actualHours: true },
      });
      const userIds = groups
        .map((g) => g.assignedUserId)
        .filter((id): id is string => id !== null);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, branch: { select: { name: true } } },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      return {
        reportId: params.reportId,
        title: 'Technician Performance',
        totalCount: groups.length,
        page: 1,
        pageSize: groups.length,
        summary: {},
        columns: ['Technician', 'Branch', 'WOs Assigned', 'Total Hours', 'Total Cost Recorded (GHS)'],
        data: groups.map((g) => {
          const u = userMap[g.assignedUserId ?? ''];
          return [
            u?.name ?? 'Unknown', u?.branch?.name ?? '',
            g._count._all,
            toFloat(g._sum.actualHours).toFixed(1),
            toFloat(g._sum.totalCost).toFixed(2),
          ];
        }),
      };
    }

    // 1f. Asset Downtime Report
    if (params.reportId === 'asset_downtime') {
      const assetScope = await getScopedAssetFilter(user);
      const where = {
        asset: assetScope,
        ...(dateFilter ? { startedAt: dateFilter } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.assetDowntimeLog.count({ where }),
        prisma.assetDowntimeLog.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            asset: {
              select: { name: true, assetTag: true, branch: { select: { name: true } } },
            },
          },
          orderBy: { startedAt: 'desc' },
        }),
        prisma.assetDowntimeLog.aggregate({ where, _sum: { durationMinutes: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Asset Downtime Report',
        totalCount,
        page,
        pageSize,
        summary: { totalDowntimeMinutes: agg._sum.durationMinutes ?? 0 },
        columns: ['Asset', 'Asset Tag', 'Branch', 'Downtime Type', 'Started', 'Ended', 'Duration (min)', 'Reason'],
        data: items.map((d) => [
          d.asset?.name ?? '', d.asset?.assetTag ?? '',
          d.asset?.branch?.name ?? '',
          d.downtimeType,
          toIsoDate(d.startedAt), toIsoDate(d.endedAt),
          d.durationMinutes ?? '',
          d.reason,
        ]),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ASSET REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'assets') {
    const assetScope = await getScopedAssetFilter(user);

    // 2a. Master Asset Register
    if (params.reportId === 'master_asset_register') {
      const where = {
        ...assetScope,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            category: { select: { name: true } },
            branch: { select: { name: true } },
            location: { select: { name: true } },
          },
          orderBy: { assetTag: 'asc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Master Asset Register',
        totalCount,
        page,
        pageSize,
        columns: [
          'Asset Tag', 'Name', 'Category', 'Status', 'Criticality',
          'Branch', 'Location', 'Ownership Type', 'Purchase Cost (GHS)', 'Install Date',
        ],
        data: items.map((a) => [
          a.assetTag, a.name,
          a.category?.name ?? '', a.status, a.criticality.toString(),
          a.branch?.name ?? '', a.location?.name ?? '',
          a.ownershipType,
          a.purchaseCost ? toFloat(a.purchaseCost).toFixed(2) : '',
          toIsoDate(a.installationDate),
        ]),
      };
    }

    // 2b. Asset Lifecycle & Status
    if (params.reportId === 'asset_lifecycle') {
      const where = {
        ...assetScope,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            category: { select: { name: true } },
            branch: { select: { name: true } },
            _count: { select: { downtimeLogs: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Asset Lifecycle & Status',
        totalCount,
        page,
        pageSize,
        columns: [
          'Asset Tag', 'Name', 'Category', 'Status', 'Criticality',
          'Install Date', 'Warranty Expiry', 'Downtime Events', 'Branch',
        ],
        data: items.map((a) => [
          a.assetTag, a.name,
          a.category?.name ?? '', a.status, a.criticality.toString(),
          toIsoDate(a.installationDate), toIsoDate(a.warrantyExpiry),
          a._count.downtimeLogs, a.branch?.name ?? '',
        ]),
      };
    }

    // 2c. Asset Maintenance History
    if (params.reportId === 'asset_maintenance_history') {
      const woScope = await getScopedWorkOrderFilter(user);
      const where = {
        ...woScope,
        ...(params.assetId ? { assetId: params.assetId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        assetId: params.assetId ? params.assetId : { not: null as unknown as string },
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            asset: { select: { name: true, assetTag: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.aggregate({ where, _sum: { totalCost: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Asset Maintenance History',
        totalCount,
        page,
        pageSize,
        summary: { totalMaintenanceCostGhs: toFloat(agg._sum.totalCost) },
        columns: ['WO #', 'Asset', 'Asset Tag', 'Branch', 'Type', 'Status', 'Actual Hours', 'Total Cost (GHS)', 'Created'],
        data: items.map((w) => [
          w.workOrderNumber,
          w.asset?.name ?? '', w.asset?.assetTag ?? '',
          w.branch?.name ?? '', w.type, w.status,
          w.actualHours.toString(), w.totalCost.toString(),
          toIsoDate(w.createdAt),
        ]),
      };
    }

    // 2d. Asset Utilization (via meters — using actual schema fields)
    if (params.reportId === 'asset_utilization') {
      const assetWhere = {
        ...assetScope,
        ...(params.branchId ? { branchId: params.branchId } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.assetMeter.count({ where: { asset: assetWhere } }),
        prisma.assetMeter.findMany({
          where: { asset: assetWhere },
          skip,
          take: pageSize,
          include: {
            asset: {
              select: { name: true, assetTag: true, branch: { select: { name: true } } },
            },
          },
          orderBy: { currentReading: 'desc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Asset Utilization (Meter Readings)',
        totalCount,
        page,
        pageSize,
        columns: [
          'Asset', 'Asset Tag', 'Branch', 'Meter Name', 'Unit', 'Meter Type',
          'Initial Reading', 'Current Reading', 'Last Reading Date',
        ],
        data: items.map((m) => [
          m.asset.name, m.asset.assetTag, m.asset.branch?.name ?? '',
          m.name, m.unitOfMeasure, m.meterType,
          m.initialReading.toString(), m.currentReading.toString(),
          toIsoDate(m.lastReadingAt),
        ]),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. INVENTORY REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'inventory') {

    // 3a. Stock On Hand Valuation
    if (params.reportId === 'stock_on_hand_valuation') {
      const [totalCount, items, agg] = await Promise.all([
        prisma.stock.count(),
        prisma.stock.findMany({
          skip,
          take: pageSize,
          include: {
            store: { select: { name: true, code: true } },
            part: { select: { partNumber: true, name: true, category: true, uom: true } },
          },
          orderBy: [{ storeId: 'asc' }, { partId: 'asc' }],
        }),
        prisma.stock.aggregate({ _sum: { totalValue: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Stock On Hand Valuation',
        totalCount,
        page,
        pageSize,
        summary: { totalValuationGhs: toFloat(agg._sum.totalValue) },
        columns: ['Store', 'Part #', 'Item Name', 'Category', 'UOM', 'Qty On Hand', 'Qty Available', 'Avg Unit Cost (WAC)', 'Total Value (GHS)'],
        data: items.map((s) => [
          `${s.store.name} (${s.store.code})`,
          s.part.partNumber, s.part.name, s.part.category, s.part.uom,
          s.quantityOnHand.toString(), s.quantityAvailable.toString(),
          s.averageUnitCost.toString(), s.totalValue.toString(),
        ]),
      };
    }

    // 3b. Low Stock & Reorder Report
    if (params.reportId === 'low_stock_reorder') {
      const parts = await prisma.part.findMany({
        where: { isActive: true, deletedAt: null, reorderLevel: { gt: 0 } },
        include: {
          stocks: { select: { quantityOnHand: true } },
        },
        orderBy: { name: 'asc' },
      });
      const lowParts = parts.filter((p) => {
        const total = p.stocks.reduce((s, st) => s + toFloat(st.quantityOnHand), 0);
        return total <= toFloat(p.reorderLevel);
      });
      const paged = lowParts.slice(skip, skip + pageSize);
      return {
        reportId: params.reportId,
        title: 'Low Stock & Reorder Report',
        totalCount: lowParts.length,
        page,
        pageSize,
        summary: { itemsBelowReorder: lowParts.length },
        columns: ['Part #', 'Item Name', 'Category', 'UOM', 'Total On Hand', 'Reorder Level', 'Preferred Vendor'],
        data: paged.map((p) => {
          const totalOnHand = p.stocks.reduce((s, st) => s + toFloat(st.quantityOnHand), 0);
          return [
            p.partNumber, p.name, p.category, p.uom,
            totalOnHand.toFixed(2),
            p.reorderLevel.toString(),
            p.preferredVendor ?? '',
          ];
        }),
      };
    }

    // 3c. Stock Transaction History
    if (params.reportId === 'stock_transaction_history') {
      const txWhere = {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.stockTransaction.count({ where: txWhere }),
        prisma.stockTransaction.findMany({
          where: txWhere,
          skip,
          take: pageSize,
          include: {
            store: { select: { name: true } },
            part: { select: { partNumber: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Stock Transaction History',
        totalCount,
        page,
        pageSize,
        columns: ['Ref #', 'Date', 'Store', 'Part #', 'Item', 'Transaction Type', 'Qty', 'Unit Cost', 'Total Cost', 'WAC After'],
        data: items.map((t) => [
          t.transactionRef, toIsoDate(t.createdAt),
          t.store?.name ?? '', t.part?.partNumber ?? '', t.part?.name ?? '',
          t.transactionType,
          t.quantity.toString(), t.unitCost.toString(),
          t.totalCost.toString(), t.wacAfter.toString(),
        ]),
      };
    }

    // 3d. Parts Consumption Report
    if (params.reportId === 'parts_consumption') {
      const txWhere = {
        transactionType: { in: ['ISSUE'] as any[] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      };
      const groups = await prisma.stockTransaction.groupBy({
        by: ['partId'],
        where: txWhere,
        _sum: { quantity: true, totalCost: true },
        _count: { _all: true },
        orderBy: { _sum: { totalCost: 'desc' } },
      });
      const paged = groups.slice(skip, skip + pageSize);
      const partIds = paged.map((g) => g.partId).filter((id): id is string => !!id);
      const parts = await prisma.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true, partNumber: true, name: true, category: true, uom: true },
      });
      const partMap = Object.fromEntries(parts.map((p) => [p.id, p]));
      return {
        reportId: params.reportId,
        title: 'Parts Consumption Report',
        totalCount: groups.length,
        page,
        pageSize,
        columns: ['Part #', 'Item Name', 'Category', 'UOM', 'Issues', 'Total Qty Issued', 'Total Cost Issued (GHS)'],
        data: paged.map((g) => {
          const p = partMap[g.partId ?? ''];
          return [
            p?.partNumber ?? '', p?.name ?? '', p?.category ?? '', p?.uom ?? '',
            g._count._all,
            toFloat(g._sum.quantity).toFixed(2),
            toFloat(g._sum.totalCost).toFixed(2),
          ];
        }),
      };
    }

    // 3e. Inventory Valuation Summary by Store
    if (params.reportId === 'inventory_valuation') {
      const groups = await prisma.stock.groupBy({
        by: ['storeId'],
        _sum: { totalValue: true, quantityOnHand: true },
        _count: { _all: true },
      });
      const storeIds = groups.map((g) => g.storeId);
      const stores = await prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, name: true, code: true, branch: { select: { name: true } } },
      });
      const storeMap = Object.fromEntries(stores.map((s) => [s.id, s]));
      const totalVal = groups.reduce((s, g) => s + toFloat(g._sum.totalValue), 0);
      return {
        reportId: params.reportId,
        title: 'Inventory Valuation Summary by Store',
        totalCount: groups.length,
        page: 1,
        pageSize: groups.length,
        summary: { totalValuationGhs: totalVal },
        columns: ['Store', 'Store Code', 'Branch', 'Distinct Items', 'Total Qty', 'Total Valuation (GHS)'],
        data: groups.map((g) => {
          const st = storeMap[g.storeId];
          return [
            st?.name ?? '', st?.code ?? '', st?.branch?.name ?? '',
            g._count._all,
            toFloat(g._sum.quantityOnHand).toFixed(2),
            toFloat(g._sum.totalValue).toFixed(2),
          ];
        }),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PROCUREMENT REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'procurement') {

    // 4a. Purchase Order History
    if (params.reportId === 'purchase_order_history') {
      const where = {
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.vendorId ? { vendorId: params.vendorId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            vendor: { select: { registeredName: true, code: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.purchaseOrder.aggregate({ where, _sum: { totalAmount: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Purchase Order History',
        totalCount,
        page,
        pageSize,
        summary: { totalSpendGhs: toFloat(agg._sum.totalAmount) },
        columns: ['PO #', 'Vendor', 'Branch', 'Order Date', 'Expected Delivery', 'Status', 'Subtotal', 'Total (GHS)'],
        data: items.map((p) => [
          p.poNumber, p.vendor?.registeredName ?? '', p.branch?.name ?? '',
          toIsoDate(new Date(p.orderDate)), toIsoDate(p.expectedDeliveryDate),
          p.status, p.subtotal.toString(), p.totalAmount.toString(),
        ]),
      };
    }

    // 4b. Outstanding Purchase Orders
    if (params.reportId === 'outstanding_purchase_orders') {
      const where = {
        deletedAt: null,
        status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] as any[] },
        ...(params.branchId ? { branchId: params.branchId } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            vendor: { select: { registeredName: true } },
            branch: { select: { name: true } },
            _count: { select: { goodsReceivedNotes: true } },
          },
          orderBy: { issuedAt: 'asc' },
        }),
        prisma.purchaseOrder.aggregate({ where, _sum: { totalAmount: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Outstanding Purchase Orders',
        totalCount,
        page,
        pageSize,
        summary: { outstandingTotalGhs: toFloat(agg._sum.totalAmount) },
        columns: ['PO #', 'Vendor', 'Branch', 'Issued Date', 'Expected Delivery', 'GRNs Received', 'Total (GHS)', 'Status'],
        data: items.map((p) => [
          p.poNumber, p.vendor?.registeredName ?? '', p.branch?.name ?? '',
          toIsoDate(p.issuedAt), toIsoDate(p.expectedDeliveryDate),
          p._count.goodsReceivedNotes, p.totalAmount.toString(), p.status,
        ]),
      };
    }

    // 4c. Vendor Performance
    if (params.reportId === 'vendor_performance') {
      const where = {
        deletedAt: null,
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] as any[] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      };
      const groups = await prisma.purchaseOrder.groupBy({
        by: ['vendorId'],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      });
      const vendorIds = groups.map((g) => g.vendorId);
      const vendors = await prisma.vendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, registeredName: true, code: true, rating: true },
      });
      const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));
      return {
        reportId: params.reportId,
        title: 'Vendor Performance Report',
        totalCount: groups.length,
        page: 1,
        pageSize: groups.length,
        summary: {},
        columns: ['Vendor', 'Vendor Code', 'Rating', 'PO Count', 'Total Spend (GHS)'],
        data: groups.map((g) => {
          const v = vendorMap[g.vendorId];
          return [
            v?.registeredName ?? '', v?.code ?? '',
            v?.rating?.toString() ?? '',
            g._count._all,
            toFloat(g._sum.totalAmount).toFixed(2),
          ];
        }),
      };
    }

    // 4d. Goods Received Notes
    if (params.reportId === 'goods_received') {
      const where = {
        ...(dateFilter ? { deliveryDate: dateFilter } : {}),
        ...(params.branchId ? { po: { branchId: params.branchId } } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.goodsReceivedNote.count({ where }),
        prisma.goodsReceivedNote.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            po: { select: { poNumber: true, vendor: { select: { registeredName: true } } } },
            store: { select: { name: true, code: true } },
          },
          orderBy: { deliveryDate: 'desc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Goods Received Notes',
        totalCount,
        page,
        pageSize,
        columns: ['GRN #', 'PO #', 'Vendor', 'Store', 'Delivery Date', 'Status'],
        data: items.map((g) => [
          g.grnNumber,
          g.po?.poNumber ?? '',
          g.po?.vendor?.registeredName ?? '',
          g.store?.name ?? '',
          toIsoDate(new Date(g.deliveryDate)),
          g.status,
        ]),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CONTRACTOR / CUSTOMER REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'contractor') {

    // 5a. Customer Performance
    if (params.reportId === 'customer_performance') {
      const where = {
        deletedAt: null,
        ...(params.customerId ? { id: params.customerId } : {}),
      };
      const [totalCount, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            _count: { select: { workOrders: true, invoices: true, quotes: true } },
          },
          orderBy: { name: 'asc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Customer Performance Report',
        totalCount,
        page,
        pageSize,
        columns: ['Customer #', 'Customer Name', 'Work Orders', 'Invoices', 'Quotes', 'Outstanding Balance (GHS)', 'Status'],
        data: customers.map((c) => [
          c.customerNumber, c.name,
          c._count.workOrders, c._count.invoices, c._count.quotes,
          c.currentBalance.toString(),
          c.isActive ? 'Active' : 'Inactive',
        ]),
      };
    }

    // 5b. Contract & SLA Performance
    if (params.reportId === 'contract_sla_performance') {
      const where = {
        deletedAt: null,
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, contracts] = await Promise.all([
        prisma.customerContract.count({ where }),
        prisma.customerContract.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            customer: { select: { name: true, customerNumber: true } },
            _count: { select: { contractSites: true } },
          },
          orderBy: { startDate: 'desc' },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Contract & SLA Performance',
        totalCount,
        page,
        pageSize,
        columns: ['Contract #', 'Customer', 'Status', 'Start Date', 'End Date', 'Contract Value (GHS)', 'Sites'],
        data: contracts.map((c) => [
          c.contractNumber, c.customer?.name ?? '',
          c.status,
          toIsoDate(new Date(c.startDate)), toIsoDate(new Date(c.endDate)),
          c.contractValue.toString(), c._count.contractSites,
        ]),
      };
    }

    // 5c. Billable Work Orders
    if (params.reportId === 'billable_work') {
      const where = {
        deletedAt: null,
        customerId: { not: null as unknown as string },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            customer: { select: { name: true } },
            asset: { select: { name: true, assetTag: true } },
            site: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.aggregate({ where, _sum: { totalCost: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Billable Work Orders',
        totalCount,
        page,
        pageSize,
        summary: { totalBillableCostGhs: toFloat(agg._sum.totalCost) },
        columns: ['WO #', 'Customer', 'Site', 'Asset', 'Type', 'Status', 'Total Cost (GHS)', 'Created'],
        data: items.map((w) => [
          w.workOrderNumber, w.customer?.name ?? '',
          w.site?.name ?? '', w.asset?.name ?? '',
          w.type, w.status,
          w.totalCost.toString(), toIsoDate(w.createdAt),
        ]),
      };
    }

    // 5d. Quote Conversion
    if (params.reportId === 'quote_conversion') {
      const where = {
        deletedAt: null,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
      };
      const [totalCount, items] = await Promise.all([
        prisma.quote.count({ where }),
        prisma.quote.findMany({
          where,
          skip,
          take: pageSize,
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      const accepted = items.filter((q) => q.status === 'CUSTOMER_ACCEPTED').length;
      const conversionRate =
        items.length > 0 ? Math.round((accepted / items.length) * 100) : 0;
      return {
        reportId: params.reportId,
        title: 'Quote Conversion Report',
        totalCount,
        page,
        pageSize,
        summary: { conversionRatePercent: conversionRate, accepted, total: items.length },
        columns: ['Quote #', 'Version', 'Customer', 'Status', 'Total (GHS)', 'Valid Until', 'Created'],
        data: items.map((q) => [
          q.quoteNumber, q.version,
          q.customer?.name ?? '', q.status,
          q.totalAmount.toString(),
          toIsoDate(q.validUntil),
          toIsoDate(q.createdAt),
        ]),
      };
    }

    // 5e. Customer Site Maintenance History
    if (params.reportId === 'site_maintenance_history') {
      const where = {
        deletedAt: null,
        siteId: { not: null as unknown as string },
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.siteId ? { siteId: params.siteId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.workOrder.count({ where }),
        prisma.workOrder.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            customer: { select: { name: true } },
            site: { select: { name: true, siteCode: true } },
            asset: { select: { name: true, assetTag: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.workOrder.aggregate({ where, _sum: { totalCost: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Customer Site Maintenance History',
        totalCount,
        page,
        pageSize,
        summary: { totalMaintenanceCostGhs: toFloat(agg._sum.totalCost) },
        columns: ['WO #', 'Customer', 'Site', 'Site Code', 'Asset', 'Type', 'Status', 'Total Cost (GHS)', 'Created'],
        data: items.map((w) => [
          w.workOrderNumber, w.customer?.name ?? '',
          w.site?.name ?? '', w.site?.siteCode ?? '',
          w.asset?.name ?? '', w.type, w.status,
          w.totalCost.toString(), toIsoDate(w.createdAt),
        ]),
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FINANCE REPORTS
  // ──────────────────────────────────────────────────────────────────────────
  if (params.category === 'finance') {

    // 6a. Invoice Register
    if (params.reportId === 'commercial_invoice_register') {
      const where = {
        deletedAt: null,
        ...(dateFilter ? { issueDate: dateFilter } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status as any } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          include: { customer: { select: { name: true, customerNumber: true } } },
          orderBy: { issueDate: 'desc' },
        }),
        prisma.invoice.aggregate({
          where,
          _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
        }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Commercial Invoice Register',
        totalCount,
        page,
        pageSize,
        summary: {
          totalInvoicedGhs: toFloat(agg._sum.totalAmount),
          totalPaidGhs: toFloat(agg._sum.paidAmount),
          totalBalanceDueGhs: toFloat(agg._sum.balanceDue),
        },
        columns: ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Subtotal', 'Tax Total', 'Total (GHS)', 'Paid', 'Balance Due', 'Status'],
        data: items.map((inv) => {
          const taxTotal =
            toFloat(inv.vatAmount) + toFloat(inv.nhilAmount) + toFloat(inv.getFundAmount);
          return [
            inv.invoiceNumber ?? inv.draftReference,
            inv.customer.name,
            toIsoDate(new Date(inv.issueDate)),
            toIsoDate(new Date(inv.dueDate)),
            inv.subtotal.toString(),
            taxTotal.toFixed(2),
            inv.totalAmount.toString(),
            inv.paidAmount.toString(),
            inv.balanceDue.toString(),
            inv.status,
          ];
        }),
      };
    }

    // 6b. Outstanding Receivables
    if (params.reportId === 'outstanding_receivables') {
      const where = {
        deletedAt: null,
        status: { in: ['SENT', 'APPROVED', 'PARTIALLY_PAID', 'OVERDUE'] as any[] },
        ...(params.customerId ? { customerId: params.customerId } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
          where,
          skip,
          take: pageSize,
          include: { customer: { select: { name: true, customerNumber: true } } },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.invoice.aggregate({ where, _sum: { balanceDue: true } }),
      ]);
      const now = new Date();
      return {
        reportId: params.reportId,
        title: 'Outstanding Receivables',
        totalCount,
        page,
        pageSize,
        summary: { totalOutstandingGhs: toFloat(agg._sum.balanceDue) },
        columns: ['Invoice #', 'Customer', 'Issue Date', 'Due Date', 'Days Overdue', 'Balance Due (GHS)', 'Status'],
        data: items.map((inv) => {
          const dueDate = new Date(inv.dueDate);
          const daysOverdue = dueDate < now
            ? Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
            : 0;
          return [
            inv.invoiceNumber ?? inv.draftReference,
            inv.customer.name,
            toIsoDate(new Date(inv.issueDate)),
            toIsoDate(dueDate),
            daysOverdue > 0 ? daysOverdue : '',
            inv.balanceDue.toString(),
            inv.status,
          ];
        }),
      };
    }

    // 6c. Payment Allocation History
    if (params.reportId === 'payment_history') {
      const where = {
        ...(dateFilter ? { paymentDate: dateFilter } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            customer: { select: { name: true, customerNumber: true } },
            allocations: {
              take: 1,
              include: {
                invoice: { select: { invoiceNumber: true, draftReference: true } },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.payment.aggregate({ where, _sum: { amount: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Payment Allocation History',
        totalCount,
        page,
        pageSize,
        summary: { totalPaymentsGhs: toFloat(agg._sum.amount) },
        columns: ['Payment #', 'Customer', 'Invoice', 'Payment Date', 'Method', 'Reference', 'Amount (GHS)', 'Unallocated (GHS)'],
        data: items.map((p) => {
          const firstAlloc = p.allocations[0];
          const invRef =
            firstAlloc?.invoice?.invoiceNumber ??
            firstAlloc?.invoice?.draftReference ??
            '';
          return [
            p.paymentNumber, p.customer?.name ?? '',
            invRef,
            toIsoDate(new Date(p.paymentDate)),
            p.paymentMethod, p.referenceNumber ?? '',
            p.amount.toString(), p.unallocatedAmount.toString(),
          ];
        }),
      };
    }

    // 6d. Credit Note Register
    if (params.reportId === 'credit_note_register') {
      const where = {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.creditNote.count({ where }),
        prisma.creditNote.findMany({
          where,
          skip,
          take: pageSize,
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.creditNote.aggregate({ where, _sum: { totalAmount: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Credit Note Register',
        totalCount,
        page,
        pageSize,
        summary: { totalCreditedGhs: toFloat(agg._sum.totalAmount) },
        columns: ['Credit Note #', 'Customer', 'Reason', 'Total (GHS)', 'Status', 'Created'],
        data: items.map((cn) => [
          cn.creditNoteNumber, cn.customer?.name ?? '',
          cn.reason, cn.totalAmount.toString(),
          cn.status, toIsoDate(cn.createdAt),
        ]),
      };
    }

    // 6e. Internal Recharge Report
    if (params.reportId === 'internal_recharge') {
      const where = {
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...(params.departmentId
          ? {
              OR: [
                { fromDepartmentId: params.departmentId },
                { toDepartmentId: params.departmentId },
              ],
            }
          : {}),
      };
      const [totalCount, items, agg] = await Promise.all([
        prisma.internalRecharge.count({ where }),
        prisma.internalRecharge.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            fromDepartment: { select: { name: true } },
            toDepartment: { select: { name: true } },
            workOrder: { select: { workOrderNumber: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.internalRecharge.aggregate({ where, _sum: { amount: true } }),
      ]);
      return {
        reportId: params.reportId,
        title: 'Internal Recharge Report',
        totalCount,
        page,
        pageSize,
        summary: { totalRechargedGhs: toFloat(agg._sum.amount) },
        columns: ['Recharge #', 'Work Order', 'From Dept', 'To Dept', 'Amount (GHS)', 'Description', 'Date'],
        data: items.map((r) => [
          r.rechargeNumber,
          r.workOrder?.workOrderNumber ?? '',
          r.fromDepartment?.name ?? '',
          r.toDepartment?.name ?? '',
          r.amount.toString(),
          r.description,
          toIsoDate(r.createdAt),
        ]),
      };
    }
  }

  // Default: unrecognized reportId
  return {
    reportId: params.reportId,
    title: `Report: ${params.reportId}`,
    totalCount: 0,
    page,
    pageSize,
    summary: {},
    columns: ['Message'],
    data: [['Report not yet implemented for this combination of category and reportId.']],
  };
}
