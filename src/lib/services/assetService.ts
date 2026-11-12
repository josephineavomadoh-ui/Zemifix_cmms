import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

/**
 * Resolves scoped asset query filters based on user accessScope.
 */
export async function getScopedAssetFilter(user: AuthenticatedUser) {
  const now = new Date();

  if (!user || !user.accessScope || typeof user.accessScope !== 'string') {
    throw new Error('UNAUTHORIZED_ACCESS_SCOPE: Missing or invalid access scope on user context.');
  }

  const accessScope = user.accessScope;

  const grants = await prisma.userScopeGrant.findMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { branchId: true, departmentId: true },
  });

  const grantedBranchIds = grants.map((g) => g.branchId).filter((id): id is string => Boolean(id));
  const grantedDeptIds = grants.map((g) => g.departmentId).filter((id): id is string => Boolean(id));

  const userBranch = user.branchId
    ? await prisma.branch.findUnique({ where: { id: user.branchId }, select: { path: true } })
    : null;

  if (accessScope === 'Company') {
    return { deletedAt: null };
  }

  if (accessScope === 'BranchAndBelow') {
    if (!userBranch || !userBranch.path) {
      throw new Error('UNAUTHORIZED_BRANCH_SCOPE: User has no valid branch path assigned.');
    }

    const userBranchPathPrefix = userBranch.path.endsWith('/') ? userBranch.path : `${userBranch.path}/`;

    let grantedBranchPaths: string[] = [];
    if (grantedBranchIds.length > 0) {
      const gBranches = await prisma.branch.findMany({
        where: { id: { in: grantedBranchIds } },
        select: { path: true },
      });
      grantedBranchPaths = gBranches.map((b) => (b.path.endsWith('/') ? b.path : `${b.path}/`));
    }

    const pathOrConditions = [
      { branch: { path: { startsWith: userBranchPathPrefix } } },
      { managingBranch: { path: { startsWith: userBranchPathPrefix } } },
      ...grantedBranchPaths.map((p) => ({ branch: { path: { startsWith: p } } })),
      ...grantedBranchPaths.map((p) => ({ managingBranch: { path: { startsWith: p } } })),
    ];

    return {
      deletedAt: null,
      OR: pathOrConditions,
    };
  }

  if (accessScope === 'Branch') {
    const validBranchIds = [user.branchId, ...grantedBranchIds].filter((id): id is string => Boolean(id));
    if (validBranchIds.length === 0) {
      return { deletedAt: null, id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      deletedAt: null,
      OR: [
        { branchId: { in: validBranchIds } },
        { managingBranchId: { in: validBranchIds } }
      ],
    };
  }

  if (accessScope === 'Department') {
    const validDeptIds = [user.departmentId, ...grantedDeptIds].filter((id): id is string => Boolean(id));
    if (validDeptIds.length === 0) {
      return { deletedAt: null, id: '00000000-0000-0000-0000-000000000000' };
    }
    return {
      deletedAt: null,
      OR: [
        { location: { departmentId: { in: validDeptIds } } },
        { responsibleDepartmentId: { in: validDeptIds } },
      ],
    };
  }

  if (accessScope === 'Own') {
    return {
      deletedAt: null,
      OR: [
        { custodianUserId: user.id },
        { responsibleUserId: user.id },
      ],
    };
  }

  throw new Error(`UNSUPPORTED_ACCESS_SCOPE: Access scope "${accessScope}" is unknown.`);
}

export async function createAsset(params: {
  assetTag: string;
  serialNumber?: string;
  barcode?: string;
  name: string;
  description?: string;
  ownershipType?: 'COMPANY_OWNED' | 'CUSTOMER_OWNED' | 'LEASED';
  managingOrgType?: 'INTERNAL_BRANCH' | 'EXTERNAL_CONTRACTOR';
  ownerCustomerId?: string | null;
  managingBranchId?: string | null;
  managingCustomerId?: string | null;
  categoryId: string;
  branchId?: string | null;
  locationId?: string | null;
  physicalSiteCustomerId?: string | null;
  siteId?: string | null;
  responsibleUserId?: string | null;
  responsibleDepartmentId?: string | null;
  custodianUserId?: string | null;
  parentAssetId?: string | null;
  criticality?: number;
  manufacturer?: string;
  modelNumber?: string;
  purchaseCost?: number;
  createdByUserId: string;
}) {
  return await prisma.$transaction(async (tx: any) => {
    const assetUuid = generateUuidV7();

    const asset = await tx.asset.create({
      data: {
        id: assetUuid,
        assetTag: params.assetTag,
        serialNumber: params.serialNumber ?? null,
        barcode: params.barcode ?? null,
        name: params.name,
        description: params.description ?? null,
        ownershipType: params.ownershipType ?? 'COMPANY_OWNED',
        managingOrgType: params.managingOrgType ?? 'INTERNAL_BRANCH',
        ownerCustomerId: params.ownerCustomerId ?? null,
        managingBranchId: params.managingBranchId ?? null,
        managingCustomerId: params.managingCustomerId ?? null,
        categoryId: params.categoryId,
        branchId: params.branchId ?? null,
        locationId: params.locationId ?? null,
        physicalSiteCustomerId: params.physicalSiteCustomerId ?? null,
        siteId: params.siteId ?? null,
        responsibleUserId: params.responsibleUserId ?? null,
        responsibleDepartmentId: params.responsibleDepartmentId ?? null,
        custodianUserId: params.custodianUserId ?? null,
        parentAssetId: params.parentAssetId ?? null,
        criticality: params.criticality ?? 3,
        manufacturer: params.manufacturer ?? null,
        modelNumber: params.modelNumber ?? null,
        purchaseCost: params.purchaseCost ? new Prisma.Decimal(params.purchaseCost) : null,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: params.createdByUserId,
      action: 'CREATED_ASSET',
      resource: 'asset',
      resourceId: asset.id,
      payload: { assetTag: params.assetTag, name: params.name, categoryId: params.categoryId },
    });

    return asset;
  });
}

export async function relocateAsset(
  tx: any,
  params: {
    assetId: string;
    toLocationId?: string | null;
    toSiteId?: string | null;
    toPhysicalSiteCustomerId?: string | null;
    reason?: string;
    movedByUserId: string;
  }
) {
  if (params.toLocationId && params.toSiteId) {
    throw new Error('CONFLICTING_RELOCATION_INPUT: Cannot specify both toLocationId and toSiteId.');
  }

  // 1. LOCK ASSET ROW FOR UPDATE FIRST
  const [asset] = await tx.$queryRaw<Array<{
    id: string;
    branchId: string | null;
    locationId: string | null;
    ownerCustomerId: string | null;
    physicalSiteCustomerId: string | null;
    siteId: string | null;
    ownershipType: string;
    managingOrgType: string;
  }>>`
    SELECT id, "branchId", "locationId", "ownerCustomerId", "physicalSiteCustomerId", "siteId",
           "ownershipType", "managingOrgType"
      FROM "assets"
     WHERE id = ${params.assetId}::uuid
    FOR UPDATE
  `;

  if (!asset) throw new Error('ASSET_NOT_FOUND: Target asset does not exist.');

  // Check no-op relocation
  if (
    (params.toLocationId && asset.locationId === params.toLocationId) ||
    (params.toSiteId && asset.siteId === params.toSiteId && params.toPhysicalSiteCustomerId === asset.physicalSiteCustomerId)
  ) {
    throw new Error('NOOP_RELOCATION_REJECTED: Target location/site matches asset current physical location.');
  }

  const fromLocationId = asset.locationId;
  const fromSiteId = asset.siteId;
  const fromPhysicalSiteCustomerId = asset.physicalSiteCustomerId;
  const moveUuid = generateUuidV7();
  const now = new Date();

  // Operation 1: Unplaced -> Internal Location
  if (!fromLocationId && !fromSiteId && params.toLocationId) {
    const toLoc = await tx.location.findUnique({ where: { id: params.toLocationId } });
    if (!toLoc) throw new Error('TARGET_LOCATION_NOT_FOUND: Target internal location does not exist.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "toLocationId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid, ${params.toLocationId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Initial Internal Placement'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { branchId: toLoc.branchId, locationId: params.toLocationId, siteId: null, physicalSiteCustomerId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'UNPLACED_TO_INTERNAL' };
  }

  // Operation 2: Unplaced -> Customer Site
  if (!fromLocationId && !fromSiteId && params.toSiteId && params.toPhysicalSiteCustomerId) {
    const toSite = await tx.customerSite.findUnique({
      where: { id_customerId: { id: params.toSiteId, customerId: params.toPhysicalSiteCustomerId } },
    });
    if (!toSite) throw new Error('TARGET_SITE_NOT_FOUND: Target site does not belong to specified customer.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "toPhysicalSiteCustomerId", "toSiteId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid, ${params.toPhysicalSiteCustomerId}::uuid, ${params.toSiteId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Initial Customer Site Placement'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { siteId: params.toSiteId, physicalSiteCustomerId: params.toPhysicalSiteCustomerId, locationId: null, branchId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'UNPLACED_TO_SITE' };
  }

  // Operation 3: Internal -> Internal
  if (fromLocationId && params.toLocationId) {
    const toLoc = await tx.location.findUnique({ where: { id: params.toLocationId } });
    if (!toLoc) throw new Error('TARGET_LOCATION_NOT_FOUND: Target internal location does not exist.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromLocationId", "toLocationId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid, ${fromLocationId}::uuid, ${params.toLocationId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Internal Relocation'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { branchId: toLoc.branchId, locationId: params.toLocationId, siteId: null, physicalSiteCustomerId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'INTERNAL_TO_INTERNAL' };
  }

  // Operation 4: Customer Site -> Customer Site
  if (fromSiteId && params.toSiteId && params.toPhysicalSiteCustomerId) {
    const toSite = await tx.customerSite.findUnique({
      where: { id_customerId: { id: params.toSiteId, customerId: params.toPhysicalSiteCustomerId } },
    });
    if (!toSite) throw new Error('TARGET_SITE_NOT_FOUND: Target site does not belong to specified customer.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromPhysicalSiteCustomerId", "fromSiteId", "toPhysicalSiteCustomerId", "toSiteId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid,
        ${fromPhysicalSiteCustomerId ? fromPhysicalSiteCustomerId : null}::uuid, ${fromSiteId}::uuid,
        ${params.toPhysicalSiteCustomerId}::uuid, ${params.toSiteId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Site Relocation'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { siteId: params.toSiteId, physicalSiteCustomerId: params.toPhysicalSiteCustomerId, locationId: null, branchId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'SITE_TO_SITE' };
  }

  // Operation 5: Internal -> Customer Site (Dispatch)
  if (fromLocationId && params.toSiteId && params.toPhysicalSiteCustomerId) {
    const toSite = await tx.customerSite.findUnique({
      where: { id_customerId: { id: params.toSiteId, customerId: params.toPhysicalSiteCustomerId } },
    });
    if (!toSite) throw new Error('TARGET_SITE_NOT_FOUND: Target customer site does not exist.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromLocationId", "toPhysicalSiteCustomerId", "toSiteId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid, ${fromLocationId}::uuid,
        ${params.toPhysicalSiteCustomerId}::uuid, ${params.toSiteId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Dispatched to Customer Site'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: {
        siteId: params.toSiteId,
        physicalSiteCustomerId: params.toPhysicalSiteCustomerId,
        locationId: null,
        branchId: null,
      },
    });

    return { moveHistoryId: moveUuid, movementType: 'INTERNAL_TO_SITE' };
  }

  // Operation 6: Customer Site -> Internal Location (Receipt into Workshop)
  if (fromSiteId && params.toLocationId) {
    const toLoc = await tx.location.findUnique({ where: { id: params.toLocationId } });
    if (!toLoc) throw new Error('TARGET_LOCATION_NOT_FOUND: Target location does not exist.');

    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromPhysicalSiteCustomerId", "fromSiteId", "toLocationId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid,
        ${fromPhysicalSiteCustomerId ? fromPhysicalSiteCustomerId : null}::uuid, ${fromSiteId}::uuid, ${params.toLocationId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Received into Internal Location'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: {
        locationId: params.toLocationId,
        branchId: toLoc.branchId,
        siteId: null,
        physicalSiteCustomerId: null,
      },
    });

    return { moveHistoryId: moveUuid, movementType: 'SITE_TO_INTERNAL' };
  }

  // Operation 7: Internal -> Unplaced
  if (fromLocationId && params.toLocationId === null && params.toSiteId === null) {
    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromLocationId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid, ${fromLocationId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Unplaced from Internal Location'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { locationId: null, branchId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'INTERNAL_TO_UNPLACED' };
  }

  // Operation 8: Customer Site -> Unplaced
  if (fromSiteId && params.toLocationId === null && params.toSiteId === null) {
    await tx.$executeRaw`
      INSERT INTO "asset_locations_history" (
        "id", "assetId", "fromPhysicalSiteCustomerId", "fromSiteId",
        "snapshotOwnershipType", "snapshotOwnerCustomerId", "snapshotManagingOrg",
        "movedByUserId", "reason", "movedAt"
      ) VALUES (
        ${moveUuid}::uuid, ${asset.id}::uuid,
        ${fromPhysicalSiteCustomerId ? fromPhysicalSiteCustomerId : null}::uuid, ${fromSiteId}::uuid,
        ${asset.ownershipType}::"OwnershipType", ${asset.ownerCustomerId ? asset.ownerCustomerId : null}::uuid, ${asset.managingOrgType}::"ManagingOrgType",
        ${params.movedByUserId}::uuid, ${params.reason ?? 'Unplaced from Customer Site'}, ${now}
      )
    `;

    await tx.asset.update({
      where: { id: asset.id },
      data: { siteId: null, physicalSiteCustomerId: null },
    });

    return { moveHistoryId: moveUuid, movementType: 'SITE_TO_UNPLACED' };
  }

  throw new Error('INVALID_RELOCATION_STATE: Asset current placement does not match input movement parameters.');
}

export async function updateAssetStatus(
  tx: any,
  params: {
    assetId: string;
    newStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'IN_MAINTENANCE' | 'STANDBY' | 'RETIRED' | 'DISPOSED';
    reason?: string;
    changedByUserId: string;
  }
) {
  const [asset] = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT id, status FROM "assets" WHERE id = ${params.assetId}::uuid FOR UPDATE
  `;

  if (!asset) throw new Error('ASSET_NOT_FOUND: Target asset does not exist.');

  const fromStatus = asset.status;
  const statusHistUuid = generateUuidV7();
  const now = new Date();

  await tx.asset.update({
    where: { id: asset.id },
    data: { status: params.newStatus as any },
  });

  await tx.$executeRaw`
    INSERT INTO "asset_status_history" ("id", "assetId", "fromStatus", "toStatus", "changedByUserId", "reason", "changedAt")
    VALUES (${statusHistUuid}::uuid, ${asset.id}::uuid, ${fromStatus}::"AssetStatus", ${params.newStatus}::"AssetStatus", ${params.changedByUserId}::uuid, ${params.reason ?? 'Status update'}, ${now})
  `;

  await appendAuditLog(tx, {
    actorUserId: params.changedByUserId,
    action: 'UPDATED_ASSET_STATUS',
    resource: 'asset',
    resourceId: asset.id,
    payload: { fromStatus, toStatus: params.newStatus, reason: params.reason },
  });

  return { statusHistoryId: statusHistUuid, fromStatus, toStatus: params.newStatus };
}
