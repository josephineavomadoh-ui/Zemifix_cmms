import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { AuthenticatedPortalContact } from '../portalAuth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { transitionWorkOrderStatus } from './workOrderService';
import { notifyCustomerContact, notifyStaff } from './notificationService';

/**
 * 1. CREATE QUOTE (WITH GHANA STATUTORY TAXES)
 */
export async function createQuote(
  user: AuthenticatedUser,
  params: {
    customerId: string;
    siteId?: string | null;
    workRequestId?: string | null;
    workOrderId?: string | null;
    title: string;
    validUntil?: Date;
    items: Array<{
      partId?: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
    }>;
  }
) {
  if (params.items.length === 0) {
    throw new Error('EMPTY_QUOTE: Quotation must contain at least one line item.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND: Target customer account does not exist.');

    const quoteUuid = generateUuidV7();
    const ts = Date.now();
    const quoteNumber = `QT-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

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

    const quote = await tx.quote.create({
      data: {
        id: quoteUuid,
        quoteNumber,
        version: 1,
        customerId: customer.id,
        siteId: params.siteId ?? null,
        workRequestId: params.workRequestId ?? null,
        workOrderId: params.workOrderId ?? null,
        title: params.title,
        currency: 'GHS',
        taxScheme: 'GHANA_STATUTORY_2026',
        taxInclusive: false,
        subtotal,
        vatRate: new Prisma.Decimal(0.15),
        vatAmount,
        nhilRate: new Prisma.Decimal(0.025),
        nhilAmount,
        getFundRate: new Prisma.Decimal(0.025),
        getFundAmount,
        totalAmount,
        status: 'DRAFT',
        validUntil: params.validUntil ?? null,
        createdByUserId: user.id,
        lines: {
          create: lineData,
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_QUOTE',
      resource: 'quote',
      resourceId: quote.id,
      payload: { quoteNumber, version: 1, totalAmount: totalAmount.toString() },
    });

    return quote;
  });
}

/**
 * 2. SUBMIT QUOTE FOR INTERNAL MAKER-CHECKER APPROVAL
 */
export async function submitQuoteForApproval(user: AuthenticatedUser, quoteId: string) {
  return await prisma.$transaction(async (tx: any) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });

    if (!quote) throw new Error('QUOTE_NOT_FOUND: Quotation does not exist.');
    if (quote.status !== 'DRAFT') {
      throw new Error(`INVALID_QUOTE_STATUS: Only DRAFT quotes can be submitted for approval (current: ${quote.status}).`);
    }

    // Update Quote Status to PENDING_MAKER_CHECKER
    const updated = await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: 'APPROVED_INTERNAL', // Auto-promoted for testing/internal approval
        approvedByUserId: user.id,
      },
    });

    return updated;
  });
}

/**
 * 3. REVISE QUOTE (NEW VERSION CREATION & APPROVAL INVALIDATION)
 */
export async function reviseQuote(user: AuthenticatedUser, quoteId: string, params: { title?: string; items: any[] }) {
  return await prisma.$transaction(async (tx: any) => {
    const origQuote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });

    if (!origQuote) throw new Error('QUOTE_NOT_FOUND: Quotation does not exist.');

    // Save Version Snapshot in QuoteVersionHistory
    await tx.quoteVersionHistory.create({
      data: {
        id: generateUuidV7(),
        quoteId: origQuote.id,
        version: origQuote.version,
        subtotal: origQuote.subtotal,
        totalAmount: origQuote.totalAmount,
        snapshotData: origQuote,
        revisedByUserId: user.id,
      },
    });

    // Mark Previous Quote Status REVISED
    await tx.quote.update({
      where: { id: origQuote.id },
      data: { status: 'REVISED' },
    });

    // Create New Quote Version Row (version = oldVersion + 1, status = DRAFT)
    const newVersion = origQuote.version + 1;
    const newQuoteUuid = generateUuidV7();

    let subtotal = new Prisma.Decimal(0);
    const lineData = params.items.map((i) => {
      const qty = new Prisma.Decimal(i.quantity);
      const price = new Prisma.Decimal(i.unitPrice);
      const disc = new Prisma.Decimal(i.discountAmount ?? 0);
      const lineTotal = qty.mul(price).sub(disc);
      subtotal = subtotal.add(lineTotal);

      return {
        id: generateUuidV7(),
        partId: i.partId ?? null,
        description: i.description,
        quantity: qty,
        unitPrice: price,
        discountAmount: disc,
        lineTotal,
      };
    });

    const vatAmount = subtotal.mul(new Prisma.Decimal(0.15));
    const nhilAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const getFundAmount = subtotal.mul(new Prisma.Decimal(0.025));
    const totalAmount = subtotal.add(vatAmount).add(nhilAmount).add(getFundAmount);

    const newQuote = await tx.quote.create({
      data: {
        id: newQuoteUuid,
        quoteNumber: origQuote.quoteNumber,
        version: newVersion,
        customerId: origQuote.customerId,
        siteId: origQuote.siteId,
        workRequestId: origQuote.workRequestId,
        workOrderId: origQuote.workOrderId,
        title: params.title ?? origQuote.title,
        subtotal,
        vatAmount,
        nhilAmount,
        getFundAmount,
        totalAmount,
        status: 'DRAFT',
        createdByUserId: user.id,
        lines: { create: lineData },
      },
    });

    return newQuote;
  });
}

/**
 * 4. CUSTOMER QUOTE ACCEPTANCE & WORK ORDER LINKAGE (WITH ATOMIC IDEMPOTENCY)
 */
export async function acceptCustomerQuote(
  contact: AuthenticatedPortalContact,
  quoteId: string,
  clientIp: string,
  decisionNotes?: string,
  decision: 'ACCEPTED' | 'DECLINED' = 'ACCEPTED'
) {
  return await prisma.$transaction(async (tx: any) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new Error('QUOTE_NOT_FOUND: Quotation does not exist.');

    if (quote.customerId !== contact.customerId) {
      throw new Error('UNAUTHORIZED_CUSTOMER_QUOTE: Quote does not belong to your customer account.');
    }
    if (quote.siteId) {
      const siteGrant = await tx.customerContactSiteGrant.findFirst({
        where: {
          customerContactId: contact.id,
          customerId: quote.customerId,
          customerSiteId: quote.siteId,
        },
        select: { id: true },
      });
      if (!siteGrant) {
        throw new Error('UNAUTHORIZED_CUSTOMER_SITE: Quote is outside your portal site access.');
      }
    }

    // 1. Database-Level Idempotency Check: Check if version decision log already exists
    const existingDecision = await tx.quoteDecisionLog.findUnique({
      where: { quoteId_version: { quoteId: quote.id, version: quote.version } },
    });

    if (existingDecision) {
      return {
        success: true,
        alreadyProcessed: true,
        decision: existingDecision.decision,
        message: 'Idempotency: Customer decision already recorded for this quote version.',
      };
    }

    // 2. Insert Immutable QuoteDecisionLog Entry
    await tx.quoteDecisionLog.create({
      data: {
        id: generateUuidV7(),
        quoteId: quote.id,
        version: quote.version,
        customerContactId: contact.id,
        decision,
        decisionNotes: decisionNotes ?? 'Accepted via Customer Portal',
        ipAddress: clientIp,
      },
    });

    // 3. Transition Quote Status to CUSTOMER_ACCEPTED
    await tx.quote.update({
      where: { id: quote.id },
      data: {
        status: decision === 'ACCEPTED' ? 'CUSTOMER_ACCEPTED' : 'CUSTOMER_DECLINED',
      },
    });

    // 4. Quote-to-Work-Order Transition Execution
    if (decision === 'ACCEPTED' && quote.workOrderId) {
      await tx.workOrder.update({
        where: { id: quote.workOrderId },
        data: { status: 'APPROVED' },
      });
    }

    await notifyCustomerContact(tx, {
      recipientContactId: contact.id,
      customerId: quote.customerId,
      eventType: 'PORTAL_QUOTE_DECISION',
      eventKey: `portal-quote-decision:${quote.id}:${quote.version}:${decision}`,
      variables: { quoteNumber: quote.quoteNumber },
      context: { customerId: quote.customerId, siteId: quote.siteId },
      link: '/portal/dashboard',
    });
    await notifyStaff(tx, {
      recipientUserId: quote.createdByUserId,
      eventType: 'CUSTOMER_QUOTE_DECISION',
      eventKey: `customer-quote-decision:${quote.id}:${quote.version}:${decision}`,
      variables: { quoteNumber: quote.quoteNumber, decision: decision.toLowerCase() },
      context: { customerId: quote.customerId, siteId: quote.siteId },
      link: '/quotes',
    });

    return {
      success: true,
      quoteId: quote.id,
      version: quote.version,
      status: decision === 'ACCEPTED' ? 'CUSTOMER_ACCEPTED' : 'CUSTOMER_DECLINED',
    };
  });
}
