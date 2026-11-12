import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

export async function createVendor(
  user: AuthenticatedUser,
  params: {
    code: string;
    registeredName: string;
    tradingName?: string;
    vendorType?: string;
    contactPerson?: string;
    email: string;
    phone: string;
    address: string;
    ghanaPostGps?: string;
    country?: string;
    taxId?: string;
    vatRegistered?: boolean;
    paymentTermsDays?: number;
    bankDetails?: any;
    preferredVendor?: boolean;
  }
) {
  return await prisma.$transaction(async (tx: any) => {
    const vendorUuid = generateUuidV7();

    const vendor = await tx.vendor.create({
      data: {
        id: vendorUuid,
        code: params.code,
        registeredName: params.registeredName,
        tradingName: params.tradingName ?? null,
        vendorType: params.vendorType ?? 'SUPPLIER',
        contactPerson: params.contactPerson ?? null,
        email: params.email,
        phone: params.phone,
        address: params.address,
        ghanaPostGps: params.ghanaPostGps ?? null,
        country: params.country ?? 'Ghana',
        taxId: params.taxId ?? null,
        vatRegistered: params.vatRegistered ?? true,
        paymentTermsDays: params.paymentTermsDays ?? 30,
        bankDetails: params.bankDetails ?? {},
        preferredVendor: params.preferredVendor ?? false,
        branchId: user.branchId,
        status: 'ACTIVE',
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'CREATED_VENDOR',
      resource: 'vendor',
      resourceId: vendor.id,
      payload: { code: params.code, registeredName: params.registeredName, email: params.email },
    });

    return vendor;
  });
}

export async function getVendors(search?: string) {
  return await prisma.vendor.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { registeredName: { contains: search, mode: 'insensitive' } },
              { tradingName: { contains: search, mode: 'insensitive' } },
              { taxId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      purchaseOrders: { select: { id: true, poNumber: true, totalAmount: true, status: true } },
    },
    orderBy: { code: 'asc' },
  });
}
