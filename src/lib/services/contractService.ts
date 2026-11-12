import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

/**
 * 1. CUSTOMER MAINTENANCE CONTRACTS
 */
export async function createCustomerContract(
  user: AuthenticatedUser,
  params: {
    customerId: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    slaPolicyId?: string | null;
    billingFrequency?: string;
    contractValue?: number;
    siteIds?: string[];
  }
) {
  if (params.startDate >= params.endDate) {
    throw new Error('INVALID_CONTRACT_DATES: Contract start date must precede end date.');
  }

  return await prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND: Customer root account does not exist.');

    const contractUuid = generateUuidV7();
    const ts = Date.now();
    const contractNumber = `CNT-${new Date().getFullYear()}-${ts.toString().slice(-6)}`;

    const contract = await tx.customerContract.create({
      data: {
        id: contractUuid,
        contractNumber,
        customerId: customer.id,
        title: params.title,
        description: params.description ?? null,
        startDate: params.startDate,
        endDate: params.endDate,
        status: 'ACTIVE',
        slaPolicyId: params.slaPolicyId ?? null,
        billingFrequency: params.billingFrequency ?? 'MONTHLY',
        contractValue: new Prisma.Decimal(params.contractValue ?? 0),
        contractSites: {
          create: (params.siteIds ?? []).map((sId) => ({
            siteId: sId,
          })),
        },
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_CUSTOMER_CONTRACT',
      resource: 'customer_contract',
      resourceId: contract.id,
      payload: { contractNumber, customerId: customer.id, title: params.title },
    });

    return contract;
  });
}

export async function getContracts() {
  return await prisma.customerContract.findMany({
    where: { deletedAt: null },
    include: {
      customer: { select: { name: true, customerNumber: true } },
      slaPolicy: { select: { name: true, policyNumber: true } },
      contractSites: { include: { site: { select: { name: true, siteCode: true } } } },
      rateCards: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 2. CONTRACT RATE CARDS
 */
export async function createContractRateCard(
  user: AuthenticatedUser,
  params: {
    contractId: string;
    category: 'REGULAR' | 'OVERTIME' | 'EMERGENCY' | 'SPECIALIST';
    hourlyRate: number;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const contract = await tx.customerContract.findUnique({ where: { id: params.contractId } });
    if (!contract) throw new Error('CONTRACT_NOT_FOUND: Customer contract does not exist.');

    const rateCard = await tx.contractRateCard.upsert({
      where: {
        contractId_category: {
          contractId: contract.id,
          category: params.category,
        },
      },
      update: {
        hourlyRate: new Prisma.Decimal(params.hourlyRate),
      },
      create: {
        id: generateUuidV7(),
        contractId: contract.id,
        category: params.category,
        hourlyRate: new Prisma.Decimal(params.hourlyRate),
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_CONTRACT_RATE_CARD',
      resource: 'contract_rate_card',
      resourceId: rateCard.id,
      payload: { contractId: contract.id, category: params.category, hourlyRate: params.hourlyRate },
    });

    return rateCard;
  });
}

/**
 * Validates Contract Active Status, Customer Matching & Site Coverage
 */
export async function validateContractForWorkOrder(
  tx: any,
  contractId: string,
  customerId: string,
  siteId?: string | null
) {
  const contract = await tx.customerContract.findUnique({
    where: { id: contractId },
    include: { contractSites: true },
  });

  if (!contract) throw new Error('CONTRACT_NOT_FOUND: Linked maintenance contract does not exist.');
  if (contract.status !== 'ACTIVE') {
    throw new Error(`INACTIVE_CONTRACT: Contract is ${contract.status}; only ACTIVE contracts can be linked to work orders.`);
  }
  if (contract.customerId !== customerId) {
    throw new Error('CONTRACT_CUSTOMER_MISMATCH: Contract does not belong to specified customer.');
  }

  const now = new Date();
  if (now < contract.startDate || now > contract.endDate) {
    throw new Error('EXPIRED_CONTRACT: Current date is outside contract valid coverage period.');
  }

  if (siteId && contract.contractSites.length > 0) {
    const siteCovered = contract.contractSites.some((cs: any) => cs.siteId === siteId);
    if (!siteCovered) {
      throw new Error('UNCOVERED_SITE: Target customer site is not included in contract coverage.');
    }
  }

  return contract;
}
