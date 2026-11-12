import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyStaff } from './notificationService';
import { getScopedAssetFilter } from './assetService';

/**
 * 1. MASTER PARTS CATALOG MANAGEMENT
 */
export async function createPart(
  user: AuthenticatedUser,
  params: {
    partNumber: string;
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    uom?: string;
    barcode?: string;
    manufacturer?: string;
    brand?: string;
    modelNumber?: string;
    preferredVendor?: string;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderLevel?: number;
    reorderQuantity?: number;
    standardCost?: number;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const partUuid = generateUuidV7();

    const part = await tx.part.create({
      data: {
        id: partUuid,
        partNumber: params.partNumber,
        name: params.name,
        description: params.description ?? null,
        category: params.category ?? 'SPARE_PARTS',
        subcategory: params.subcategory ?? null,
        uom: params.uom ?? 'PCS',
        barcode: params.barcode ?? null,
        manufacturer: params.manufacturer ?? null,
        brand: params.brand ?? null,
        modelNumber: params.modelNumber ?? null,
        preferredVendor: params.preferredVendor ?? null,
        minStockLevel: new Prisma.Decimal(params.minStockLevel ?? 0),
        maxStockLevel: params.maxStockLevel ? new Prisma.Decimal(params.maxStockLevel) : null,
        reorderLevel: new Prisma.Decimal(params.reorderLevel ?? 0),
        reorderQuantity: new Prisma.Decimal(params.reorderQuantity ?? 1),
        standardCost: new Prisma.Decimal(params.standardCost ?? 0),
        averageCost: new Prisma.Decimal(params.standardCost ?? 0),
        isActive: true,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_INVENTORY_PART',
      resource: 'part',
      resourceId: part.id,
      payload: { partNumber: params.partNumber, name: params.name, category: params.category },
    });

    return part;
  });
}

export async function getParts(search?: string, category?: string) {
  return await prisma.part.findMany({
    where: {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { partNumber: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      stocks: { include: { store: { select: { name: true, code: true } } } },
    },
    orderBy: { partNumber: 'asc' },
  });
}

/**
 * 2. WAREHOUSE & STORE MANAGEMENT
 */
export async function createStore(
  user: AuthenticatedUser,
  params: {
    code: string;
    name: string;
    type?: 'MAIN' | 'BRANCH' | 'DEPARTMENT';
    branchId?: string;
    departmentId?: string | null;
    isMain?: boolean;
    managerUserId?: string | null;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const storeUuid = generateUuidV7();
    const branchId = params.branchId ?? user.branchId;

    const store = await tx.store.create({
      data: {
        id: storeUuid,
        code: params.code,
        name: params.name,
        type: params.type ?? 'MAIN',
        branchId,
        departmentId: params.departmentId ?? null,
        isMain: params.isMain ?? false,
        isActive: true,
        managerUserId: params.managerUserId ?? user.id,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_STORE',
      resource: 'store',
      resourceId: store.id,
      payload: { code: params.code, name: params.name, branchId },
    });

    return store;
  });
}

export async function getStores(user: AuthenticatedUser) {
  return await prisma.store.findMany({
    where: {
      deletedAt: null,
      branchId: user.accessScope === 'Company' ? undefined : user.branchId,
    },
    include: {
      branch: { select: { name: true, code: true } },
      department: { select: { name: true, code: true } },
      managerUser: { select: { name: true, email: true } },
      stocks: { include: { part: { select: { partNumber: true, name: true, uom: true } } } },
    },
    orderBy: { code: 'asc' },
  });
}

/**
 * 3. AUTHORITATIVE APPEND-ONLY STOCK TRANSACTION LEDGER & WAC VALUATION
 */
export async function postStockTransaction(
  tx: any,
  params: {
    transactionType: 'OPENING_BALANCE' | 'RECEIPT' | 'ISSUE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'RETURN_IN' | 'RETURN_OUT' | 'REVERSAL';
    storeId: string;
    partId: string;
    quantity: number;
    unitCost: number;
    referenceDoc?: string | null;
    workOrderId?: string | null;
    transactionGroupId?: string | null;
    actingUserId: string;
    approvalRequestId?: string | null;
  }
) {
  if (params.quantity <= 0) {
    throw new Error('INVALID_QUANTITY: Transaction quantity must be strictly greater than zero.');
  }

  // 1. Lock Part Master row FOR UPDATE
  const [part] = await tx.$queryRaw<Array<{ id: string; partNumber: string; reorderLevel: string }>>`
    SELECT id, "partNumber", "reorderLevel"::text as "reorderLevel"
      FROM "parts" WHERE id = ${params.partId}::uuid FOR UPDATE
  `;
  if (!part) throw new Error('PART_NOT_FOUND: Master part does not exist.');

  // 2. Lock Store Stock row FOR UPDATE (Upsert if first stock movement for store-item)
  let stock = await tx.stock.findUnique({
    where: { storeId_partId: { storeId: params.storeId, partId: params.partId } },
  });
  const isNewStockRow = !stock;

  if (!stock) {
    stock = await tx.stock.create({
      data: {
        id: generateUuidV7(),
        storeId: params.storeId,
        partId: params.partId,
        quantityOnHand: new Prisma.Decimal(0),
        quantityReserved: new Prisma.Decimal(0),
        quantityAvailable: new Prisma.Decimal(0),
        quantityOnOrder: new Prisma.Decimal(0),
        averageUnitCost: new Prisma.Decimal(params.unitCost),
        totalValue: new Prisma.Decimal(0),
      },
    });
  }

  // Lock Stock row FOR UPDATE in transaction
  const [lockedStock] = await tx.$queryRaw<Array<{
    id: string;
    quantityOnHand: string;
    quantityReserved: string;
    quantityAvailable: string;
    averageUnitCost: string;
  }>>`
    SELECT id, "quantityOnHand"::text as "quantityOnHand", "quantityReserved"::text as "quantityReserved",
           "quantityAvailable"::text as "quantityAvailable", "averageUnitCost"::text as "averageUnitCost"
      FROM "stock"
     WHERE id = ${stock.id}::uuid
    FOR UPDATE
  `;

  const currQty = new Prisma.Decimal(lockedStock.quantityOnHand);
  const currWac = new Prisma.Decimal(lockedStock.averageUnitCost);
  const txQty = new Prisma.Decimal(params.quantity);
  const txCost = new Prisma.Decimal(params.unitCost);

  let newQty = currQty;
  let newWac = currWac;

  const isInflow = ['OPENING_BALANCE', 'RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'RETURN_IN'].includes(params.transactionType);
  const isOutflow = ['ISSUE', 'TRANSFER_OUT', 'ADJUSTMENT_OUT', 'RETURN_OUT'].includes(params.transactionType);

  if (isInflow) {
    newQty = currQty.add(txQty);
    // Weighted Average Cost (WAC) Formula:
    // New WAC = ((Current Qty * Current WAC) + (Received Qty * Received Unit Cost)) / (Current Qty + Received Qty)
    if (newQty.gt(0)) {
      const currentTotalValue = currQty.mul(currWac);
      const incomingTotalValue = txQty.mul(txCost);
      newWac = currentTotalValue.add(incomingTotalValue).div(newQty);
    } else {
      newWac = txCost;
    }
  } else if (isOutflow) {
    if (currQty.lt(txQty)) {
      throw new Error(`INSUFFICIENT_STOCK: Available stock (${currQty}) is less than requested outflow quantity (${txQty}).`);
    }
    newQty = currQty.sub(txQty);
    newWac = currWac; // Outflows do not alter the store WAC
  } else if (params.transactionType === 'REVERSAL') {
    newQty = currQty.add(txQty); // Reversal restores quantity
    newWac = currWac;
  }

  const newTotalValue = newQty.mul(newWac);
  const newAvailable = newQty.sub(new Prisma.Decimal(lockedStock.quantityReserved));

  // 3. Update Materialized Store Stock Row
  await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantityOnHand: newQty,
      quantityAvailable: newAvailable,
      averageUnitCost: newWac,
      totalValue: newTotalValue,
    },
  });

  // Update Global Part Average Cost (WAC)
  await tx.part.update({
    where: { id: params.partId },
    data: { averageCost: newWac },
  });

  // 4. Insert Append-Only Stock Transaction Ledger Record
  const ts = Date.now();
  const transactionRef = `TXN-${new Date().getFullYear()}-${ts.toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const txnUuid = generateUuidV7();
  const txTotalCost = txQty.mul(txCost);

  const txn = await tx.$executeRaw`
    INSERT INTO "stock_transactions" (
      "id", "transactionRef", "transactionType", "storeId", "partId",
      "quantity", "unitCost", "totalCost", "balanceAfter", "wacAfter",
      "referenceDoc", "workOrderId", "transactionGroupId", "actingUserId", "approvalRequestId", "createdAt"
    ) VALUES (
      ${txnUuid}::uuid, ${transactionRef}, ${params.transactionType}::"InventoryTransactionType",
      ${params.storeId}::uuid, ${params.partId}::uuid, ${txQty}, ${txCost}, ${txTotalCost},
      ${newQty}, ${newWac}, ${params.referenceDoc ?? null}, ${params.workOrderId ? params.workOrderId : null}::uuid,
      ${params.transactionGroupId ? params.transactionGroupId : null}::uuid, ${params.actingUserId}::uuid,
      ${params.approvalRequestId ? params.approvalRequestId : null}::uuid, NOW()
    )
  `;

  const reorderLevel = new Prisma.Decimal(part.reorderLevel);
  const crossedReorderLevel = newQty.lte(reorderLevel) &&
    (currQty.gt(reorderLevel) || isNewStockRow);
  if (crossedReorderLevel) {
    const store = await tx.store.findUnique({
      where: { id: params.storeId },
      select: { name: true, managerUserId: true, branchId: true, departmentId: true },
    });
    if (store?.managerUserId) {
      await notifyStaff(tx, {
        recipientUserId: store.managerUserId,
        eventType: 'LOW_STOCK',
        eventKey: `low-stock:${txnUuid}`,
        variables: { partNumber: part.partNumber, storeName: store.name },
        context: { branchId: store.branchId, departmentId: store.departmentId },
        link: '/inventory/reorder',
      });
    }
  }

  return {
    transactionId: txnUuid,
    transactionRef,
    newQuantityOnHand: newQty.toString(),
    newWac: newWac.toString(),
    newTotalValue: newTotalValue.toString(),
  };
}

/**
 * 4. WORK ORDER MATERIAL ISSUES & RETURNS
 */
export async function issueMaterialToWorkOrder(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    storeId: string;
    partId: string;
    quantity: number;
    unitCost?: number;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const wo = await tx.workOrder.findUnique({ where: { id: params.workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    // Fetch store stock to obtain current store WAC if unitCost is not specified
    const stock = await tx.stock.findUnique({
      where: { storeId_partId: { storeId: params.storeId, partId: params.partId } },
      include: { part: true },
    });

    if (!stock) throw new Error('STOCK_NOT_FOUND: Item stock record does not exist in target warehouse.');

    const cost = params.unitCost ?? Number(stock.averageUnitCost);

    // Post ISSUE transaction to authoritative inventory ledger
    const txnResult = await postStockTransaction(tx, {
      transactionType: 'ISSUE',
      storeId: params.storeId,
      partId: params.partId,
      quantity: params.quantity,
      unitCost: cost,
      workOrderId: wo.id,
      referenceDoc: wo.workOrderNumber,
      actingUserId: user.id,
    });

    // Update WorkOrderPart record
    const existingPart = await tx.workOrderPart.findFirst({
      where: { workOrderId: wo.id, partId: params.partId },
    });

    if (existingPart) {
      await tx.workOrderPart.update({
        where: { id: existingPart.id },
        data: {
          quantityConsumed: new Prisma.Decimal(existingPart.quantityConsumed).add(params.quantity),
          unitCost: new Prisma.Decimal(cost),
        },
      });
    } else {
      await tx.workOrderPart.create({
        data: {
          id: generateUuidV7(),
          workOrderId: wo.id,
          partId: params.partId,
          partNumber: stock.part.partNumber,
          partName: stock.part.name,
          quantityPlanned: new Prisma.Decimal(params.quantity),
          quantityConsumed: new Prisma.Decimal(params.quantity),
          unitCost: new Prisma.Decimal(cost),
          uom: stock.part.uom,
        },
      });
    }

    // Update WorkOrder totalCost
    const issueCost = new Prisma.Decimal(params.quantity).mul(new Prisma.Decimal(cost));
    await tx.workOrder.update({
      where: { id: wo.id },
      data: {
        totalCost: new Prisma.Decimal(wo.totalCost).add(issueCost),
      },
    });

    return txnResult;
  });
}

/**
 * 5. WAREHOUSE TRANSFERS (Source STORE_OUT -> Destination STORE_IN)
 */
export async function executeStoreTransfer(
  user: AuthenticatedUser,
  params: {
    sourceStoreId: string;
    destinationStoreId: string;
    partId: string;
    quantity: number;
    notes?: string;
  }
) {
  if (params.sourceStoreId === params.destinationStoreId) {
    throw new Error('INVALID_TRANSFER: Source and destination warehouses must be different.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const groupId = generateUuidV7();
    const ts = Date.now();
    const transferNumber = `TRF-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    // Fetch source store stock WAC
    const sourceStock = await tx.stock.findUnique({
      where: { storeId_partId: { storeId: params.sourceStoreId, partId: params.partId } },
    });

    if (!sourceStock) throw new Error('SOURCE_STOCK_NOT_FOUND: Item does not exist in source warehouse.');
    const cost = Number(sourceStock.averageUnitCost);

    // 1. Post TRANSFER_OUT from Source Store
    const outTxn = await postStockTransaction(tx, {
      transactionType: 'TRANSFER_OUT',
      storeId: params.sourceStoreId,
      partId: params.partId,
      quantity: params.quantity,
      unitCost: cost,
      transactionGroupId: groupId,
      referenceDoc: transferNumber,
      actingUserId: user.id,
    });

    // 2. Post TRANSFER_IN to Destination Store
    const inTxn = await postStockTransaction(tx, {
      transactionType: 'TRANSFER_IN',
      storeId: params.destinationStoreId,
      partId: params.partId,
      quantity: params.quantity,
      unitCost: cost,
      transactionGroupId: groupId,
      referenceDoc: transferNumber,
      actingUserId: user.id,
    });

    // Create StoreTransfer record
    const transfer = await tx.storeTransfer.create({
      data: {
        id: generateUuidV7(),
        transferNumber,
        sourceStoreId: params.sourceStoreId,
        destinationStoreId: params.destinationStoreId,
        status: 'RECEIVED',
        requestedByUserId: user.id,
        approvedByUserId: user.id,
        dispatchedAt: new Date(),
        receivedAt: new Date(),
        notes: params.notes ?? null,
        lines: {
          create: [
            {
              id: generateUuidV7(),
              partId: params.partId,
              quantityRequested: new Prisma.Decimal(params.quantity),
              quantityDispatched: new Prisma.Decimal(params.quantity),
              quantityReceived: new Prisma.Decimal(params.quantity),
            },
          ],
        },
      },
    });

    return { transfer, outTxn, inTxn };
  });
}

/**
 * 6. WORK ORDER MATERIAL RETURNS
 */
export async function returnMaterialFromWorkOrder(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    storeId: string;
    partId: string;
    quantity: number;
    unitCost?: number;
    reason?: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const wo = await tx.workOrder.findUnique({ where: { id: params.workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    const woPart = await tx.workOrderPart.findFirst({
      where: { workOrderId: wo.id, partId: params.partId },
    });

    if (!woPart) throw new Error('WORK_ORDER_PART_NOT_FOUND: Part was not issued to this work order.');

    const qtyConsumed = Number(woPart.quantityConsumed);
    const qtyReturned = Number(woPart.quantityReturned);
    const availableToReturn = qtyConsumed - qtyReturned;

    if (params.quantity > availableToReturn) {
      throw new Error(`EXCEEDS_ISSUED_QUANTITY: Cannot return ${params.quantity} PCS; only ${availableToReturn} PCS available to return.`);
    }

    const cost = params.unitCost ?? Number(woPart.unitCost);

    // Post RETURN_IN transaction to authoritative inventory ledger
    const txnResult = await postStockTransaction(tx, {
      transactionType: 'RETURN_IN',
      storeId: params.storeId,
      partId: params.partId,
      quantity: params.quantity,
      unitCost: cost,
      workOrderId: wo.id,
      referenceDoc: `RET-${wo.workOrderNumber}`,
      actingUserId: user.id,
    });

    // Update WorkOrderPart.quantityReturned
    await tx.workOrderPart.update({
      where: { id: woPart.id },
      data: {
        quantityReturned: new Prisma.Decimal(woPart.quantityReturned).add(params.quantity),
      },
    });

    // Credit WorkOrder.totalCost
    const returnCredit = new Prisma.Decimal(params.quantity).mul(new Prisma.Decimal(cost));
    await tx.workOrder.update({
      where: { id: wo.id },
      data: {
        totalCost: new Prisma.Decimal(wo.totalCost).sub(returnCredit),
      },
    });

    return txnResult;
  });
}

/**
 * 7. STOCK RESERVATION & RELEASE
 */
export async function reserveStockForWorkOrder(
  tx: any,
  params: {
    storeId: string;
    partId: string;
    quantity: number;
  }
) {
  const stock = await tx.stock.findUnique({
    where: { storeId_partId: { storeId: params.storeId, partId: params.partId } },
  });

  if (!stock) throw new Error('STOCK_NOT_FOUND: Item stock record does not exist.');

  const currAvailable = new Prisma.Decimal(stock.quantityAvailable);
  const qtyToReserve = new Prisma.Decimal(params.quantity);

  if (currAvailable.lt(qtyToReserve)) {
    throw new Error(`INSUFFICIENT_AVAILABLE_STOCK: Available stock (${currAvailable}) is less than requested reservation (${qtyToReserve}).`);
  }

  const newReserved = new Prisma.Decimal(stock.quantityReserved).add(qtyToReserve);
  const newAvailable = new Prisma.Decimal(stock.quantityOnHand).sub(newReserved);

  return await tx.stock.update({
    where: { id: stock.id },
    data: {
      quantityReserved: newReserved,
      quantityAvailable: newAvailable,
    },
  });
}

/**
 * 8. LEDGER TRANSACTION REVERSALS
 */
export async function reverseStockTransaction(
  user: AuthenticatedUser,
  params: {
    originalTransactionRef: string;
    reason: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const origTxn = await tx.stockTransaction.findUnique({
      where: { transactionRef: params.originalTransactionRef },
    });

    if (!origTxn) throw new Error('TRANSACTION_NOT_FOUND: Original stock transaction does not exist.');

    const reversalQty = Number(origTxn.quantity);
    const reversalCost = Number(origTxn.unitCost);

    // Post REVERSAL transaction (does NOT edit original record)
    const result = await postStockTransaction(tx, {
      transactionType: 'REVERSAL',
      storeId: origTxn.storeId,
      partId: origTxn.partId,
      quantity: reversalQty,
      unitCost: reversalCost,
      transactionGroupId: origTxn.transactionGroupId ?? origTxn.id,
      referenceDoc: `REV-${origTxn.transactionRef}`,
      actingUserId: user.id,
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'REVERSED_STOCK_TRANSACTION',
      resource: 'stock_transaction',
      resourceId: origTxn.id,
      payload: { originalTransactionRef: params.originalTransactionRef, reason: params.reason },
    });

    return result;
  });
}

/**
 * 9. STOCK COUNT & ADJUSTMENTS
 */
export async function createStockAdjustment(
  user: AuthenticatedUser,
  params: {
    storeId: string;
    partId: string;
    countedQuantity: number;
    reason: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const stock = await tx.stock.findUnique({
      where: { storeId_partId: { storeId: params.storeId, partId: params.partId } },
    });

    if (!stock) throw new Error('STOCK_NOT_FOUND: Store stock record does not exist.');

    const sysQty = Number(stock.quantityOnHand);
    const variance = params.countedQuantity - sysQty;
    const unitCost = Number(stock.averageUnitCost);
    const adjustmentType = variance >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const absQty = Math.abs(variance);

    if (absQty === 0) {
      throw new Error('NO_VARIANCE: Counted quantity matches system quantity; no adjustment needed.');
    }

    // Post adjustment transaction to inventory ledger
    const txnResult = await postStockTransaction(tx, {
      transactionType: adjustmentType as any,
      storeId: params.storeId,
      partId: params.partId,
      quantity: absQty,
      unitCost,
      referenceDoc: 'STOCK_COUNT',
      actingUserId: user.id,
    });

    return txnResult;
  });
}

/**
 * 10. REORDER MANAGEMENT & LOW STOCK RECOMMENDATIONS
 */
export async function getReorderRecommendations(user: AuthenticatedUser) {
  const parts = await prisma.part.findMany({
    where: { deletedAt: null, isActive: true },
    include: {
      stocks: {
        include: { store: { select: { name: true, code: true } } },
      },
    },
  });

  const recommendations = [];

  for (const part of parts) {
    const reorderLevel = Number(part.reorderLevel);
    if (reorderLevel <= 0) continue;

    for (const stock of part.stocks) {
      const onHand = Number(stock.quantityOnHand);
      const reserved = Number(stock.quantityReserved);
      const onOrder = Number(stock.quantityOnOrder);
      const available = onHand - reserved + onOrder;

      if (available <= reorderLevel) {
        recommendations.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.name,
          category: part.category,
          storeId: stock.storeId,
          storeName: stock.store.name,
          quantityOnHand: onHand,
          quantityReserved: reserved,
          quantityAvailable: available,
          reorderLevel,
          reorderQuantity: Number(part.reorderQuantity),
          suggestedOrderQty: Math.max(Number(part.reorderQuantity), reorderLevel - available + Number(part.minStockLevel)),
          unitCost: Number(stock.averageUnitCost),
        });
      }
    }
  }

  return recommendations;
}
