import { prisma } from '../prisma';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

export async function createLocation(params: {
  branchId: string;
  name: string;
  code: string;
  parentId?: string | null;
  departmentId?: string | null;
  building?: string;
  floor?: string;
  room?: string;
  createdByUserId: string;
}) {
  return await prisma.$transaction(async (tx: any) => {
    // 1. Verify branch exists
    const branch = await tx.branch.findUnique({ where: { id: params.branchId } });
    if (!branch || !branch.isActive || branch.deletedAt !== null) {
      throw new Error('BRANCH_NOT_FOUND: Assigned branch does not exist.');
    }

    let parentPath = '/';
    if (params.parentId) {
      const parent = await tx.location.findUnique({ where: { id: params.parentId } });
      if (!parent || !parent.isActive || parent.deletedAt !== null) {
        throw new Error('PARENT_LOCATION_NOT_FOUND: Parent location is invalid or deleted.');
      }
      if (parent.branchId !== params.branchId) {
        throw new Error('BRANCH_MISMATCH: Parent location belongs to a different branch.');
      }
      parentPath = parent.path.endsWith('/') ? parent.path : `${parent.path}/`;
    }

    if (params.departmentId) {
      const dept = await tx.department.findUnique({ where: { id: params.departmentId } });
      if (!dept || !dept.isActive || dept.deletedAt !== null) {
        throw new Error('DEPARTMENT_NOT_FOUND: Assigned department does not exist.');
      }
    }

    const locationId = generateUuidV7();
    const path = `${parentPath}${locationId}/`;

    const location = await tx.location.create({
      data: {
        id: locationId,
        branchId: params.branchId,
        parentId: params.parentId ?? null,
        departmentId: params.departmentId ?? null,
        name: params.name,
        code: params.code,
        building: params.building ?? null,
        floor: params.floor ?? null,
        room: params.room ?? null,
        path,
        isActive: true,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: params.createdByUserId,
      action: 'CREATED_LOCATION',
      resource: 'location',
      resourceId: location.id,
      payload: { name: params.name, code: params.code, branchId: params.branchId, path },
    });

    return location;
  });
}

export async function getLocationTree(branchId?: string) {
  return await prisma.location.findMany({
    where: {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: [{ path: 'asc' }, { name: 'asc' }],
  });
}

export async function softDeleteLocation(id: string, userId: string) {
  return await prisma.$transaction(async (tx: any) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: { children: { where: { deletedAt: null } }, assets: { where: { deletedAt: null } } },
    });

    if (!location || location.deletedAt !== null) {
      throw new Error('LOCATION_NOT_FOUND: Location does not exist.');
    }

    if (location.children.length > 0) {
      throw new Error('HAS_CHILDREN: Cannot delete location with active child locations.');
    }

    if (location.assets.length > 0) {
      throw new Error('HAS_ASSETS: Cannot delete location containing active assets.');
    }

    const updated = await tx.location.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await appendAuditLog(tx, {
      actorUserId: userId,
      action: 'DELETED_LOCATION',
      resource: 'location',
      resourceId: id,
      payload: { code: location.code, name: location.name, branchId: location.branchId },
    });

    return updated;
  });
}
