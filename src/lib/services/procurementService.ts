import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyStaff } from './notificationService';
import { postStockTransaction } from './inventoryService';

/**
 * 1. PURCHASE REQUISITIONS & APPROVALS
 */
export async function createPurchaseRequisition(
  user: AuthenticatedUser,
  params: {
    justification: string;
    requiredDate?: Date;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY';
    items: Array<{
      partId?: string | null;
      description: string;
      quantity: number;
      estimatedUnitPrice?: number;
    }>;
  }
) {
  if (params.items.length === 0) {
    throw new Error('EMPTY_REQUISITION: Requisition must contain at least one line item.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const reqUuid = generateUuidV7();
    const ts = Date.now();
    const requisitionNumber = `PR-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    let totalEst = new Prisma.Decimal(0);
    const itemData = params.items.map((i) => {
      const qty = new Prisma.Decimal(i.quantity);
      const price = new Prisma.Decimal(i.estimatedUnitPrice ?? 0);
      const lineTotal = qty.mul(price);
      totalEst = totalEst.add(lineTotal);

      return {
        id: generateUuidV7(),
        partId: i.partId ?? null,
        description: i.description,
        quantity: qty,
        estimatedUnitPrice: price,
        estimatedTotal: lineTotal,
      };
    });

    const req = await tx.purchaseRequisition.create({
      data: {
        id: reqUuid,
        requisitionNumber,
        branchId: user.branchId,
        departmentId: user.departmentId ?? null,
        requesterUserId: user.id,
        requestDate: new Date(),
        requiredDate: params.requiredDate ?? null,
        priority: params.priority ?? 'MEDIUM',
        justification: params.justification,
        estimatedTotal: totalEst,
        status: 'SUBMITTED',
        items: {
          create: itemData,
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_PURCHASE_REQUISITION',
      resource: 'purchase_requisition',
      resourceId: req.id,
      payload: { requisitionNumber, estimatedTotal: totalEst.toString(), priority: params.priority },
    });

    return req;
  });
}

export async function getPurchaseRequisitions(user: AuthenticatedUser) {
  return await prisma.purchaseRequisition.findMany({
    where: {
      deletedAt: null,
      branchId: user.accessScope === 'Company' ? undefined : user.branchId,
    },
    include: {
      requesterUser: { select: { name: true, email: true } },
      branch: { select: { name: true, code: true } },
      department: { select: { name: true, code: true } },
      items: { include: { part: { select: { partNumber: true, name: true, uom: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 2. REQUEST FOR QUOTATION (RFQ) & COMPARISON
 */
export async function createRfq(
  user: AuthenticatedUser,
  params: {
    title: string;
    requisitionId?: string | null;
    vendorIds: string[];
    closingDate?: Date;
    notes?: string;
  }
) {
  if (params.vendorIds.length === 0) {
    throw new Error('NO_VENDORS: RFQ must be sent to at least one vendor.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const rfqUuid = generateUuidV7();
    const ts = Date.now();
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    const rfq = await tx.rfq.create({
      data: {
        id: rfqUuid,
        rfqNumber,
        requisitionId: params.requisitionId ?? null,
        title: params.title,
        status: 'SENT',
        closingDate: params.closingDate ?? null,
        notes: params.notes ?? null,
        createdByUserId: user.id,
        rfqVendors: {
          create: params.vendorIds.map((vId) => ({
            id: generateUuidV7(),
            vendorId: vId,
          })),
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_RFQ',
      resource: 'rfq',
      resourceId: rfq.id,
      payload: { rfqNumber, vendorCount: params.vendorIds.length },
    });

    return rfq;
  });
}

/**
 * 3. PURCHASE ORDERS (WITH GHANA TAX: 15% VAT, 2.5% NHIL, 2.5% GETFUND)
 */
export async function createPurchaseOrder(
  user: AuthenticatedUser,
  params: {
    vendorId: string;
    requisitionId?: string | null;
    expectedDeliveryDate?: Date;
    deliveryAddress: string;
    paymentTermsDays?: number;
    items: Array<{
      partId?: string | null;
      description: string;
      quantityOrdered: number;
      unitPrice: number;
      discountAmount?: number;
    }>;
  }
) {
  if (params.items.length === 0) {
    throw new Error('EMPTY_PO: Purchase order must contain at least one line item.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const poUuid = generateUuidV7();
    const ts = Date.now();
    const poNumber = `PO-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    let subtotal = new Prisma.Decimal(0);
    const itemData = params.items.map((i) => {
      const qty = new Prisma.Decimal(i.quantityOrdered);
      const price = new Prisma.Decimal(i.unitPrice);
      const disc = new Prisma.Decimal(i.discountAmount ?? 0);
      const lineTotal = qty.mul(price).sub(disc);
      subtotal = subtotal.add(lineTotal);

      return {
        id: generateUuidV7(),
        partId: i.partId ?? null,
        description: i.description,
        quantityOrdered: qty,
        quantityReceived: new Prisma.Decimal(0),
        unitPrice: price,
        discountAmount: disc,
        lineTotal,
      };
    });

    // Ghana Statutory Tax Breakdown (VAT 15%, NHIL 2.5%, GETFund 2.5% = Total 20% Tax)
    const vatAmount = subtotal.mul(new Prisma.Decimal(0.15));
    const nhilAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const getFundAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const totalAmount = subtotal.add(vatAmount).add(nhilAmount).add(getFundAmount);

    const po = await tx.purchaseOrder.create({
      data: {
        id: poUuid,
        poNumber,
        vendorId: params.vendorId,
        requisitionId: params.requisitionId ?? null,
        branchId: user.branchId,
        departmentId: user.departmentId ?? null,
        orderDate: new Date(),
        expectedDeliveryDate: params.expectedDeliveryDate ?? null,
        subtotal,
        vatAmount,
        nhilAmount,
        getFundAmount,
        totalAmount,
        paymentTermsDays: params.paymentTermsDays ?? 30,
        deliveryAddress: params.deliveryAddress,
        status: 'ISSUED',
        issuedAt: new Date(),
        approvedByUserId: user.id,
        items: {
          create: itemData,
        },
      },
      include: {
        items: true,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_PURCHASE_ORDER',
      resource: 'purchase_order',
      resourceId: po.id,
      payload: { poNumber, totalAmount: totalAmount.toString(), vendorId: params.vendorId },
    });

    const branch = await tx.branch.findUnique({
      where: { id: user.branchId },
      select: { managerUserId: true },
    });
    if (branch?.managerUserId && branch.managerUserId !== user.id) {
      await notifyStaff(tx, {
        recipientUserId: branch.managerUserId,
        eventType: 'PURCHASE_ORDER_ISSUED',
        eventKey: `purchase-order-issued:${po.id}`,
        variables: { poNumber },
        context: { branchId: po.branchId, departmentId: po.departmentId },
        link: '/procurement/purchase-orders',
      });
    }

    return po;
  });
}

export async function getPurchaseOrders(user: AuthenticatedUser) {
  return await prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      branchId: user.accessScope === 'Company' ? undefined : user.branchId,
    },
    include: {
      vendor: { select: { registeredName: true, code: true } },
      branch: { select: { name: true, code: true } },
      items: { include: { part: { select: { partNumber: true, name: true, uom: true } } } },
      goodsReceivedNotes: { select: { id: true, grnNumber: true, deliveryDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 4. GOODS RECEIVED NOTES (GRN) — AUTHORITATIVE INVENTORY RECEIPT INTEGRATION
 */
export async function postGoodsReceivedNote(
  user: AuthenticatedUser,
  params: {
    poId: string;
    storeId: string;
    deliveryDate?: Date;
    invoiceReference?: string;
    notes?: string;
    items: Array<{
      poItemId: string;
      partId?: string | null;
      quantityReceived: number;
      quantityAccepted: number;
      quantityRejected?: number;
      unitCost: number;
    }>;
  }
) {
  if (params.items.length === 0) {
    throw new Error('EMPTY_GRN: Goods Received Note must contain at least one item.');
  }

  return await prisma.$transaction(async (tx: any) => {
    // Lock PurchaseOrder FOR UPDATE
    const [po] = await tx.$queryRaw<Array<{
      id: string;
      vendorId: string;
      poNumber: string;
      status: string;
    }>>`
      SELECT id, "vendorId", "poNumber", status FROM "purchase_orders" WHERE id = ${params.poId}::uuid FOR UPDATE
    `;

    if (!po) throw new Error('PO_NOT_FOUND: Purchase order does not exist.');
    if (po.status === 'CLOSED' || po.status === 'CANCELLED') {
      throw new Error('FINALIZED_PO: Cannot receive goods against a closed or cancelled purchase order.');
    }

    const grnUuid = generateUuidV7();
    const ts = Date.now();
    const grnNumber = `GRN-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    // Create GRN Header
    const grn = await tx.goodsReceivedNote.create({
      data: {
        id: grnUuid,
        grnNumber,
        poId: po.id,
        vendorId: po.vendorId,
        storeId: params.storeId,
        deliveryDate: params.deliveryDate ?? new Date(),
        invoiceReference: params.invoiceReference ?? null,
        notes: params.notes ?? null,
        status: 'ACCEPTED',
        receivedByUserId: user.id,
      },
    });

    let allItemsReceived = true;

    for (const item of params.items) {
      if (item.quantityAccepted < 0) {
        throw new Error('INVALID_ACCEPTED_QUANTITY: Accepted quantity cannot be negative.');
      }

      // Lock PO Item FOR UPDATE
      const [poItem] = await tx.$queryRaw<Array<{
        id: string;
        quantityOrdered: string;
        quantityReceived: string;
        partId: string | null;
      }>>`
        SELECT id, "quantityOrdered"::text as "quantityOrdered", "quantityReceived"::text as "quantityReceived", "partId"
          FROM "purchase_order_items"
         WHERE id = ${item.poItemId}::uuid
        FOR UPDATE
      `;

      if (!poItem) throw new Error('PO_ITEM_NOT_FOUND: Line item does not exist on purchase order.');

      const currReceived = new Prisma.Decimal(poItem.quantityReceived);
      const newReceived = currReceived.add(new Prisma.Decimal(item.quantityAccepted));
      const ordered = new Prisma.Decimal(poItem.quantityOrdered);

      if (newReceived.lt(ordered)) {
        allItemsReceived = false;
      }

      // Update PO Item quantityReceived
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { quantityReceived: newReceived },
      });

      // Create GRN Line Item
      await tx.goodsReceivedNoteItem.create({
        data: {
          id: generateUuidV7(),
          grnId: grn.id,
          poItemId: poItem.id,
          partId: item.partId ?? poItem.partId ?? null,
          quantityReceived: new Prisma.Decimal(item.quantityReceived),
          quantityAccepted: new Prisma.Decimal(item.quantityAccepted),
          quantityRejected: new Prisma.Decimal(item.quantityRejected ?? 0),
          unitCost: new Prisma.Decimal(item.unitCost),
        },
      });

      // MANDATORY STAGE D.3 INVENTORY RECEIPT INTEGRATION:
      // Invoke postStockTransaction if accepted quantity > 0 and partId is linked
      const targetPartId = item.partId ?? poItem.partId;
      if (item.quantityAccepted > 0 && targetPartId) {
        await postStockTransaction(tx, {
          transactionType: 'RECEIPT',
          storeId: params.storeId,
          partId: targetPartId,
          quantity: item.quantityAccepted,
          unitCost: item.unitCost,
          referenceDoc: grnNumber,
          actingUserId: user.id,
        });
      }
    }

    // Update PurchaseOrder status
    const newPoStatus = allItemsReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: newPoStatus },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'POSTED_GOODS_RECEIVED_NOTE',
      resource: 'goods_received_note',
      resourceId: grn.id,
      payload: { grnNumber, poNumber: po.poNumber, status: newPoStatus },
    });

    const purchaseOrder = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      select: { branchId: true, departmentId: true, approvedByUserId: true },
    });
    const branch = await tx.branch.findUnique({
      where: { id: purchaseOrder?.branchId ?? '' },
      select: { managerUserId: true },
    });
    const recipients = [...new Set([purchaseOrder?.approvedByUserId, branch?.managerUserId].filter(
      (id): id is string => Boolean(id)
    ))];
    for (const recipientUserId of recipients) {
      await notifyStaff(tx, {
        recipientUserId,
        eventType: 'GOODS_RECEIVED',
        eventKey: `goods-received:${grn.id}:${recipientUserId}`,
        variables: { grnNumber, poNumber: po.poNumber },
        context: { branchId: purchaseOrder?.branchId, departmentId: purchaseOrder?.departmentId },
        link: '/procurement/purchase-orders',
      });
    }

    return { grn, poStatus: newPoStatus };
  });
}

/**
 * 5. SUPPLIER RETURNS — AUTHORITATIVE INVENTORY RETURN_OUT INTEGRATION
 */
export async function createSupplierReturn(
  user: AuthenticatedUser,
  params: {
    grnId: string;
    reason: string;
    items: Array<{
      partId: string;
      quantityReturned: number;
      unitCost: number;
    }>;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const grn = await tx.goodsReceivedNote.findUnique({
      where: { id: params.grnId },
      include: { po: true },
    });

    if (!grn) throw new Error('GRN_NOT_FOUND: Goods Received Note does not exist.');

    const returnUuid = generateUuidV7();
    const ts = Date.now();
    const returnNumber = `RET-SUP-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    const supplierReturn = await tx.supplierReturn.create({
      data: {
        id: returnUuid,
        returnNumber,
        grnId: grn.id,
        vendorId: grn.vendorId,
        storeId: grn.storeId,
        returnDate: new Date(),
        reason: params.reason,
        status: 'COMPLETED',
        createdByUserId: user.id,
      },
    });

    for (const item of params.items) {
      await tx.supplierReturnItem.create({
        data: {
          id: generateUuidV7(),
          returnId: supplierReturn.id,
          partId: item.partId,
          quantityReturned: new Prisma.Decimal(item.quantityReturned),
          unitCost: new Prisma.Decimal(item.unitCost),
        },
      });

      // MANDATORY STAGE D.3 INVENTORY RETURN_OUT INTEGRATION:
      // Invoke postStockTransaction for RETURN_OUT
      await postStockTransaction(tx, {
        transactionType: 'RETURN_OUT',
        storeId: grn.storeId,
        partId: item.partId,
        quantity: item.quantityReturned,
        unitCost: item.unitCost,
        referenceDoc: returnNumber,
        actingUserId: user.id,
      });
    }

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_SUPPLIER_RETURN',
      resource: 'supplier_return',
      resourceId: supplierReturn.id,
      payload: { returnNumber, grnNumber: grn.grnNumber, reason: params.reason },
    });

    return supplierReturn;
  });
}
