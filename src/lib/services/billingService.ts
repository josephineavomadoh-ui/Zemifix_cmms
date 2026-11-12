import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { notifyCustomerContact, notifyStaff } from './notificationService';

async function assertInvoiceScope(tx: any, user: AuthenticatedUser, invoice: { createdByUserId: string }) {
  const creator = await tx.user.findUnique({
    where: { id: invoice.createdByUserId },
    select: { branchId: true, departmentId: true },
  });
  if (!creator) throw new Error('INVOICE_OWNER_NOT_FOUND');
  if (user.accessScope === 'Company') {
    return { branchId: creator.branchId, departmentId: creator.departmentId };
  }
  if (user.accessScope === 'Own') {
    if (invoice.createdByUserId !== user.id) throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
    return { branchId: creator.branchId, departmentId: creator.departmentId };
  }

  const grants = await tx.userScopeGrant.findMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { branchId: true, departmentId: true },
  });
  const grantedBranches = grants.map((grant: any) => grant.branchId).filter(Boolean);
  const grantedDepartments = grants.map((grant: any) => grant.departmentId).filter(Boolean);
  const branchAllowed = creator.branchId === user.branchId || grantedBranches.includes(creator.branchId);

  if (user.accessScope === 'Branch' && !branchAllowed) {
    throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
  }
  if (user.accessScope === 'BranchAndBelow' && !branchAllowed) {
    const [userBranch, invoiceBranch, grantedBranchRows] = await Promise.all([
      tx.branch.findUnique({ where: { id: user.branchId }, select: { path: true } }),
      tx.branch.findUnique({ where: { id: creator.branchId }, select: { path: true } }),
      grantedBranches.length
        ? tx.branch.findMany({ where: { id: { in: grantedBranches } }, select: { path: true } })
        : Promise.resolve([]),
    ]);
    const roots = [userBranch?.path, ...grantedBranchRows.map((branch: any) => branch.path)]
      .filter((path): path is string => Boolean(path));
    const allowed = roots.some((root) => {
      const prefix = root.endsWith('/') ? root : `${root}/`;
      return invoiceBranch?.path === root || Boolean(invoiceBranch?.path?.startsWith(prefix));
    });
    if (!allowed) throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
  }
  if (user.accessScope === 'Department') {
    if (!branchAllowed) throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
    if (creator.departmentId) {
      if (creator.departmentId !== user.departmentId && !grantedDepartments.includes(creator.departmentId)) {
        throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
      }
    } else if (!branchAllowed) {
      throw new Error('UNAUTHORIZED_INVOICE_SCOPE');
    }
  }
  if (!['Branch', 'BranchAndBelow', 'Department'].includes(user.accessScope)) {
    throw new Error('UNSUPPORTED_ACCESS_SCOPE');
  }
  return { branchId: creator.branchId, departmentId: creator.departmentId };
}

async function notifyFinancialPortalContacts(
  tx: any,
  input: {
    customerId: string;
    siteId?: string | null;
    eventType: string;
    eventKey: string;
    context?: { branchId?: string | null; departmentId?: string | null };
    link: string;
  }
) {
  const contacts = await tx.customerContact.findMany({
    where: {
      customerId: input.customerId,
      canViewFinancials: true,
      isActive: true,
      deletedAt: null,
      ...(input.siteId
        ? { siteGrants: { some: { customerSiteId: input.siteId, customerId: input.customerId } } }
        : {}),
    },
    select: { id: true },
  });
  for (const contact of contacts) {
    await notifyCustomerContact(tx, {
      recipientContactId: contact.id,
      customerId: input.customerId,
      eventType: input.eventType,
      eventKey: `${input.eventKey}:${contact.id}`,
      variables: {},
      context: { ...input.context, customerId: input.customerId, siteId: input.siteId },
      link: input.link,
    });
  }
}

/**
 * Atomic Concurrency-Safe Document Number Allocator (Gapless Sequence)
 */
export async function allocateDocumentNumber(tx: any, prefix: string): Promise<string> {
  // Upsert sequence row if first allocation for this prefix
  let seq = await tx.numberSequence.findUnique({ where: { prefix } });
  if (!seq) {
    seq = await tx.numberSequence.create({
      data: { id: generateUuidV7(), prefix, nextValue: 1 },
    });
  }

  // Row-level lock FOR UPDATE
  const [lockedSeq] = await tx.$queryRaw<Array<{ id: string; nextValue: number }>>`
    SELECT id, "nextValue" FROM "number_sequences" WHERE prefix = ${prefix} FOR UPDATE
  `;

  const allocatedVal = lockedSeq.nextValue;
  const nextVal = allocatedVal + 1;

  await tx.numberSequence.update({
    where: { prefix },
    data: { nextValue: nextVal },
  });

  const formattedNumber = `${prefix}-${allocatedVal.toString().padStart(6, '0')}`;
  return formattedNumber;
}

/**
 * 1. CREATE DRAFT COMMERCIAL INVOICE
 */
export async function createInvoice(
  user: AuthenticatedUser,
  params: {
    invoiceType?: 'JOB_INVOICE' | 'CONSOLIDATED_INVOICE' | 'CONTRACT_INVOICE' | 'PROFORMA_INVOICE';
    customerId: string;
    siteId?: string | null;
    contractId?: string | null;
    quoteId?: string | null;
    workOrderId?: string | null;
    dueDate: Date;
    items: Array<{
      workOrderId?: string | null;
      partId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
    }>;
  }
) {
  if (params.items.length === 0) {
    throw new Error('EMPTY_INVOICE: Invoice must contain at least one line item.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND: Customer account does not exist.');

    const invoiceUuid = generateUuidV7();
    const ts = Date.now();
    const draftReference = `DRAFT-INV-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    let subtotal = new Prisma.Decimal(0);
    const lineData = params.items.map((i) => {
      const qty = new Prisma.Decimal(i.quantity);
      const price = new Prisma.Decimal(i.unitPrice);
      const disc = new Prisma.Decimal(i.discountAmount ?? 0);

      if (qty.lte(0) || price.lt(0) || disc.lt(0)) {
        throw new Error('INVALID_LINE_PRICING: Line quantity must be positive, prices non-negative.');
      }

      const lineTotal = qty.mul(price).sub(disc);
      subtotal = subtotal.add(lineTotal);

      return {
        id: generateUuidV7(),
        workOrderId: i.workOrderId ?? params.workOrderId ?? null,
        partId: i.partId ?? null,
        description: i.description,
        quantity: qty,
        unitPrice: price,
        discountAmount: disc,
        lineTotal,
      };
    });

    // Ghana Statutory Tax Engine (VAT 15%, NHIL 2.5%, GETFund 2.5% = Total 20%)
    const vatAmount = subtotal.mul(new Prisma.Decimal(0.15));
    const nhilAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const getFundAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const totalAmount = subtotal.add(vatAmount).add(nhilAmount).add(getFundAmount);

    const invoice = await tx.invoice.create({
      data: {
        id: invoiceUuid,
        draftReference,
        invoiceType: params.invoiceType ?? 'JOB_INVOICE',
        customerId: customer.id,
        siteId: params.siteId ?? null,
        contractId: params.contractId ?? null,
        quoteId: params.quoteId ?? null,
        workOrderId: params.workOrderId ?? null,
        issueDate: new Date(),
        dueDate: params.dueDate,
        subtotal,
        vatAmount,
        nhilAmount,
        getFundAmount,
        totalAmount,
        paidAmount: new Prisma.Decimal(0),
        creditedAmount: new Prisma.Decimal(0),
        balanceDue: totalAmount,
        status: 'DRAFT',
        createdByUserId: user.id,
        lines: { create: lineData },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_DRAFT_INVOICE',
      resource: 'invoice',
      resourceId: invoice.id,
      payload: { draftReference, customerId: customer.id, totalAmount: totalAmount.toString() },
    });

    return invoice;
  });
}

/**
 * 2. APPROVE INVOICE & ALLOCATE GAPLESS INVOICE NUMBER ATOMICALLY
 */
export async function approveInvoice(user: AuthenticatedUser, invoiceId: string) {
  return await prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND: Invoice does not exist.');
    const invoiceContext = await assertInvoiceScope(tx, user, invoice);

    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_APPROVAL') {
      throw new Error(`INVALID_INVOICE_STATUS: Only DRAFT or PENDING_APPROVAL invoices can be approved (current: ${invoice.status}).`);
    }

    // Allocate Gapless Permanent Invoice Number (e.g. INV-2026-000101)
    const prefix = `INV-${new Date().getFullYear()}`;
    const invoiceNumber = await allocateDocumentNumber(tx, prefix);

    const approvedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceNumber,
        status: 'APPROVED',
        approvedByUserId: user.id,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'APPROVED_COMMERCIAL_INVOICE',
      resource: 'invoice',
      resourceId: invoice.id,
      payload: { invoiceNumber, draftReference: invoice.draftReference, totalAmount: invoice.totalAmount.toString() },
    });

    const branch = await tx.branch.findUnique({
      where: { id: invoiceContext.branchId },
      select: { managerUserId: true },
    });
    const recipients = [...new Set([invoice.createdByUserId, branch?.managerUserId].filter(
      (id): id is string => Boolean(id && id !== user.id)
    ))];
    for (const recipientUserId of recipients) {
      for (const eventType of ['INVOICE_APPROVED', 'INVOICE_ISSUED']) {
        await notifyStaff(tx, {
          recipientUserId,
          eventType,
          eventKey: `${eventType.toLowerCase()}:${invoice.id}`,
          variables: { invoiceNumber },
          context: invoiceContext,
          link: '/finance/invoices',
        });
      }
    }

    return approvedInvoice;
  });
}

export async function submitInvoiceForApproval(user: AuthenticatedUser, invoiceId: string) {
  return prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND: Invoice does not exist.');
    const invoiceContext = await assertInvoiceScope(tx, user, invoice);
    if (invoice.status !== 'DRAFT') {
      throw new Error(`INVALID_INVOICE_STATUS: Only DRAFT invoices can be submitted (current: ${invoice.status}).`);
    }

    const submitted = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PENDING_APPROVAL' },
    });
    const branch = await tx.branch.findUnique({
      where: { id: invoiceContext.branchId },
      select: { managerUserId: true },
    });
    if (branch?.managerUserId && branch.managerUserId !== user.id) {
      await notifyStaff(tx, {
        recipientUserId: branch.managerUserId,
        eventType: 'INVOICE_APPROVAL_REQUESTED',
        eventKey: `invoice-approval-requested:${invoice.id}`,
        variables: {},
        context: invoiceContext,
        link: '/finance/invoices',
      });
    }
    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'SUBMITTED_INVOICE_FOR_APPROVAL',
      resource: 'invoice',
      resourceId: invoice.id,
      payload: { draftReference: invoice.draftReference },
    });
    return submitted;
  });
}

export async function markInvoiceSent(user: AuthenticatedUser, invoiceId: string) {
  return prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND: Invoice does not exist.');
    const invoiceContext = await assertInvoiceScope(tx, user, invoice);
    if (invoice.status !== 'APPROVED') {
      throw new Error(`INVALID_INVOICE_STATUS: Only APPROVED invoices can be sent (current: ${invoice.status}).`);
    }

    const sentAt = new Date();
    const sent = await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT', sentAt },
    });
    await notifyFinancialPortalContacts(tx, {
      customerId: invoice.customerId,
      siteId: invoice.siteId,
      eventType: 'CUSTOMER_INVOICE_ISSUED',
      eventKey: `customer-invoice-issued:${invoice.id}`,
      context: invoiceContext,
      link: '/portal/invoices',
    });
    const recipients = [...new Set([invoice.createdByUserId, invoice.approvedByUserId].filter(
      (id): id is string => Boolean(id && id !== user.id)
    ))];
    for (const recipientUserId of recipients) {
      await notifyStaff(tx, {
        recipientUserId,
        eventType: 'INVOICE_SENT',
        eventKey: `invoice-sent:${invoice.id}`,
        variables: { invoiceNumber: invoice.invoiceNumber ?? invoice.draftReference },
        context: invoiceContext,
        link: '/finance/invoices',
      });
    }
    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'SENT_COMMERCIAL_INVOICE',
      resource: 'invoice',
      resourceId: invoice.id,
      payload: { invoiceNumber: invoice.invoiceNumber },
    });
    return sent;
  });
}

/**
 * 3. RECORD PAYMENT REMITTANCE & ALLOCATE TO INVOICE
 */
export async function recordPaymentRemittance(
  user: AuthenticatedUser,
  params: {
    customerId: string;
    invoiceId: string;
    amount: number;
    paymentMethod?: 'BANK_TRANSFER' | 'CHEQUE' | 'MOBILE_MONEY' | 'CASH' | 'CREDIT_CARD';
    referenceNumber?: string;
    notes?: string;
  }
) {
  if (params.amount <= 0) {
    throw new Error('INVALID_PAYMENT_AMOUNT: Payment remittance amount must be greater than zero.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findUnique({ where: { id: params.invoiceId } });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND: Target invoice does not exist.');
    const invoiceContext = await assertInvoiceScope(tx, user, invoice);
    if (invoice.customerId !== params.customerId) {
      throw new Error('CUSTOMER_INVOICE_MISMATCH: Payment customer must match the target invoice customer.');
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'PENDING_APPROVAL') {
      throw new Error('UNAPPROVED_INVOICE: Cannot allocate payments to unapproved draft invoices.');
    }

    const currentBalance = new Prisma.Decimal(invoice.balanceDue);
    const paymentAmt = new Prisma.Decimal(params.amount);

    if (paymentAmt.gt(currentBalance)) {
      throw new Error(`OVERPAYMENT_PROHIBITED: Payment amount (${paymentAmt}) exceeds invoice balance due (${currentBalance}).`);
    }

    // Allocate Payment Number
    const prefix = `PAY-${new Date().getFullYear()}`;
    const paymentNumber = await allocateDocumentNumber(tx, prefix);

    const payment = await tx.payment.create({
      data: {
        id: generateUuidV7(),
        paymentNumber,
        customerId: params.customerId,
        amount: paymentAmt,
        unallocatedAmount: new Prisma.Decimal(0),
        paymentMethod: params.paymentMethod ?? 'BANK_TRANSFER',
        referenceNumber: params.referenceNumber ?? null,
        notes: params.notes ?? null,
        recordedByUserId: user.id,
        allocations: {
          create: [
            {
              id: generateUuidV7(),
              invoiceId: invoice.id,
              amountAllocated: paymentAmt,
            },
          ],
        },
      },
    });

    const newPaid = new Prisma.Decimal(invoice.paidAmount).add(paymentAmt);
    const newBalance = new Prisma.Decimal(invoice.totalAmount).sub(newPaid).sub(new Prisma.Decimal(invoice.creditedAmount));
    const newStatus = newBalance.equals(0) ? 'PAID' : 'PARTIALLY_PAID';

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newStatus,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'RECORDED_PAYMENT_REMITTANCE',
      resource: 'payment',
      resourceId: payment.id,
      payload: { paymentNumber, invoiceNumber: invoice.invoiceNumber, amount: paymentAmt.toString(), newStatus },
    });

    const branch = await tx.branch.findUnique({
      where: { id: invoiceContext.branchId },
      select: { managerUserId: true },
    });
    if (branch?.managerUserId && branch.managerUserId !== user.id) {
      await notifyStaff(tx, {
        recipientUserId: branch.managerUserId,
        eventType: 'PAYMENT_RECORDED',
        eventKey: `payment-recorded:${payment.id}`,
        variables: { customerName: (await tx.customer.findUnique({
          where: { id: params.customerId },
          select: { name: true },
        }))?.name ?? 'Customer' },
        context: invoiceContext,
        link: '/finance',
      });
      await notifyStaff(tx, {
        recipientUserId: branch.managerUserId,
        eventType: 'PAYMENT_ALLOCATED',
        eventKey: `payment-allocated:${payment.id}:${invoice.id}`,
        variables: { invoiceNumber: invoice.invoiceNumber ?? invoice.draftReference },
        context: invoiceContext,
        link: '/finance',
      });
    }
    await notifyFinancialPortalContacts(tx, {
      customerId: params.customerId,
      siteId: invoice.siteId,
      eventType: 'CUSTOMER_PAYMENT_RECORDED',
      eventKey: `customer-payment-recorded:${payment.id}`,
      context: invoiceContext,
      link: '/portal/invoices',
    });
    await notifyFinancialPortalContacts(tx, {
      customerId: params.customerId,
      siteId: invoice.siteId,
      eventType: 'CUSTOMER_PAYMENT_ALLOCATED',
      eventKey: `customer-payment-allocated:${payment.id}:${invoice.id}`,
      context: invoiceContext,
      link: '/portal/invoices',
    });

    return { payment, newBalanceDue: newBalance.toString(), newInvoiceStatus: newStatus };
  });
}

/**
 * 4. ISSUE CREDIT NOTE
 */
export async function issueCreditNote(
  user: AuthenticatedUser,
  params: {
    invoiceId: string;
    reason: string;
    subtotal: number;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const invoice = await tx.invoice.findUnique({ where: { id: params.invoiceId } });
    if (!invoice) throw new Error('INVOICE_NOT_FOUND: Target invoice does not exist.');
    const invoiceContext = await assertInvoiceScope(tx, user, invoice);

    const sub = new Prisma.Decimal(params.subtotal);
    const vat = sub.mul(new Prisma.Decimal(0.15));
    const nhil = sub.mul(new Prisma.Decimal(0.025));
    const getFund = sub.mul(new Prisma.Decimal(0.025));
    const totalCredit = sub.add(vat).add(nhil).add(getFund);

    const prefix = `CN-${new Date().getFullYear()}`;
    const creditNoteNumber = await allocateDocumentNumber(tx, prefix);

    const creditNote = await tx.creditNote.create({
      data: {
        id: generateUuidV7(),
        creditNoteNumber,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        reason: params.reason,
        subtotal: sub,
        vatAmount: vat,
        nhilAmount: nhil,
        getFundAmount: getFund,
        totalAmount: totalCredit,
        status: 'ISSUED',
        issuedByUserId: user.id,
      },
    });

    // Update Invoice creditedAmount and balanceDue
    const newCredited = new Prisma.Decimal(invoice.creditedAmount).add(totalCredit);
    const newBalance = new Prisma.Decimal(invoice.totalAmount).sub(new Prisma.Decimal(invoice.paidAmount)).sub(newCredited);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        creditedAmount: newCredited,
        balanceDue: newBalance,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'ISSUED_CREDIT_NOTE',
      resource: 'credit_note',
      resourceId: creditNote.id,
      payload: { creditNoteNumber, invoiceNumber: invoice.invoiceNumber, totalCredit: totalCredit.toString() },
    });

    const branch = await tx.branch.findUnique({
      where: { id: invoiceContext.branchId },
      select: { managerUserId: true },
    });
    if (branch?.managerUserId && branch.managerUserId !== user.id) {
      await notifyStaff(tx, {
        recipientUserId: branch.managerUserId,
        eventType: 'CREDIT_NOTE_ISSUED',
        eventKey: `credit-note-issued:${creditNote.id}`,
        variables: { creditNoteNumber },
        context: invoiceContext,
        link: '/finance',
      });
    }
    await notifyFinancialPortalContacts(tx, {
      customerId: invoice.customerId,
      siteId: invoice.siteId,
      eventType: 'CUSTOMER_CREDIT_NOTE_ISSUED',
      eventKey: `customer-credit-note-issued:${creditNote.id}`,
      context: invoiceContext,
      link: '/portal/invoices',
    });

    return creditNote;
  });
}

/**
 * 5. FACILITY MODE INTERNAL DEPARTMENTAL RECHARGE
 */
export async function recordInternalRecharge(
  user: AuthenticatedUser,
  params: {
    workOrderId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
    amount: number;
    description: string;
  }
) {
  if (params.fromDepartmentId === params.toDepartmentId) {
    throw new Error('INVALID_RECHARGE: Source and destination departments must be different.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const wo = await tx.workOrder.findUnique({ where: { id: params.workOrderId } });
    if (!wo) throw new Error('WORK_ORDER_NOT_FOUND: Work order does not exist.');

    // Check for duplicate internal recharge for this work order
    const existingRecharge = await tx.internalRecharge.findUnique({
      where: { workOrderId: wo.id },
    });
    if (existingRecharge) {
      throw new Error('DUPLICATE_RECHARGE: Internal recharge already recorded for this work order.');
    }

    const prefix = `RCH-${new Date().getFullYear()}`;
    const rechargeNumber = await allocateDocumentNumber(tx, prefix);

    const recharge = await tx.internalRecharge.create({
      data: {
        id: generateUuidV7(),
        rechargeNumber,
        workOrderId: wo.id,
        fromDepartmentId: params.fromDepartmentId,
        toDepartmentId: params.toDepartmentId,
        amount: new Prisma.Decimal(params.amount),
        description: params.description,
        rechargeDate: new Date(),
        recordedByUserId: user.id,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'RECORDED_INTERNAL_RECHARGE',
      resource: 'internal_recharge',
      resourceId: recharge.id,
      payload: { rechargeNumber, workOrderNumber: wo.workOrderNumber, amount: params.amount },
    });

    return recharge;
  });
}
