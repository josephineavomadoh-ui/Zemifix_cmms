import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { hashPassword } from '../auth';

/**
 * 1. CUSTOMER CONTACT MANAGEMENT
 */
export async function createCustomerContact(
  user: AuthenticatedUser,
  params: {
    customerId: string;
    name: string;
    email: string;
    phone?: string;
    isPrimaryContact?: boolean;
    canViewFinancials?: boolean;
    canApproveQuotes?: boolean;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND: Customer root account does not exist.');

    const contactUuid = generateUuidV7();
    const defaultPasswordHash = await hashPassword('CustomerPass123!');

    const contact = await tx.customerContact.create({
      data: {
        id: contactUuid,
        customerId: customer.id,
        name: params.name,
        email: params.email,
        phone: params.phone ?? null,
        passwordHash: defaultPasswordHash,
        isPrimaryContact: params.isPrimaryContact ?? false,
        canViewFinancials: params.canViewFinancials ?? false,
        canApproveQuotes: params.canApproveQuotes ?? false,
        canRequestWork: true,
        isActive: true,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_CUSTOMER_CONTACT',
      resource: 'customer_contact',
      resourceId: contact.id,
      payload: { customerId: customer.id, name: params.name, email: params.email },
    });

    return contact;
  });
}

export async function updateCustomerContact(
  user: AuthenticatedUser,
  contactId: string,
  params: Partial<{
    name: string;
    phone: string;
    isPrimaryContact: boolean;
    isActive: boolean;
  }>
) {
  return await prisma.$transaction(async (tx: any) => {
    const contact = await tx.customerContact.update({
      where: { id: contactId },
      data: {
        ...(params.name ? { name: params.name } : {}),
        ...(params.phone ? { phone: params.phone } : {}),
        ...(params.isPrimaryContact !== undefined ? { isPrimaryContact: params.isPrimaryContact } : {}),
        ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'UPDATED_CUSTOMER_CONTACT',
      resource: 'customer_contact',
      resourceId: contact.id,
      payload: params,
    });

    return contact;
  });
}

/**
 * 2. CUSTOMER SITE ACCESS GRANTS
 */
export async function grantCustomerContactSite(
  user: AuthenticatedUser,
  params: {
    customerId: string;
    customerContactId: string;
    customerSiteId: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    // Validate that contact and site both belong to the same customer
    const contact = await tx.customerContact.findFirst({
      where: { id: params.customerContactId, customerId: params.customerId },
    });
    if (!contact) throw new Error('INVALID_CONTACT: Contact does not belong to specified customer.');

    const site = await tx.customerSite.findFirst({
      where: { id: params.customerSiteId, customerId: params.customerId },
    });
    if (!site) throw new Error('INVALID_SITE: Customer site does not belong to specified customer.');

    const grant = await tx.customerContactSiteGrant.create({
      data: {
        id: generateUuidV7(),
        customerId: params.customerId,
        customerContactId: params.customerContactId,
        customerSiteId: params.customerSiteId,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'GRANTED_CUSTOMER_CONTACT_SITE',
      resource: 'customer_contact_site_grant',
      resourceId: grant.id,
      payload: params,
    });

    return grant;
  });
}

export async function revokeCustomerContactSite(
  user: AuthenticatedUser,
  params: {
    customerContactId: string;
    customerSiteId: string;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const grant = await tx.customerContactSiteGrant.findUnique({
      where: {
        customerContactId_customerSiteId: {
          customerContactId: params.customerContactId,
          customerSiteId: params.customerSiteId,
        },
      },
    });

    if (!grant) throw new Error('GRANT_NOT_FOUND: Site access grant does not exist.');

    await tx.customerContactSiteGrant.delete({ where: { id: grant.id } });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'REVOKED_CUSTOMER_CONTACT_SITE',
      resource: 'customer_contact_site_grant',
      resourceId: grant.id,
      payload: params,
    });

    return { success: true };
  });
}
