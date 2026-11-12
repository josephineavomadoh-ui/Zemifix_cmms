import { prisma } from '../prisma';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';

export async function createAssetCategory(params: {
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  createdByUserId: string;
}) {
  return await prisma.$transaction(async (tx: any) => {
    let parentPath = '/';
    if (params.parentId) {
      const parent = await tx.assetCategory.findUnique({ where: { id: params.parentId } });
      if (!parent || !parent.isActive || parent.deletedAt !== null) {
        throw new Error('PARENT_CATEGORY_NOT_FOUND: Parent asset category is invalid or deleted.');
      }
      parentPath = parent.path.endsWith('/') ? parent.path : `${parent.path}/`;
    }

    const categoryId = generateUuidV7();
    const path = `${parentPath}${categoryId}/`;

    const category = await tx.assetCategory.create({
      data: {
        id: categoryId,
        name: params.name,
        code: params.code,
        description: params.description ?? null,
        parentId: params.parentId ?? null,
        path,
        isActive: true,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: params.createdByUserId,
      action: 'CREATED_ASSET_CATEGORY',
      resource: 'asset_category',
      resourceId: category.id,
      payload: { name: params.name, code: params.code, path },
    });

    return category;
  });
}

export async function getAssetCategoryTree() {
  return await prisma.assetCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ path: 'asc' }, { name: 'asc' }],
  });
}

export async function softDeleteAssetCategory(id: string, userId: string) {
  return await prisma.$transaction(async (tx: any) => {
    const category = await tx.assetCategory.findUnique({
      where: { id },
      include: { children: { where: { deletedAt: null } }, assets: { where: { deletedAt: null } } },
    });

    if (!category || category.deletedAt !== null) {
      throw new Error('CATEGORY_NOT_FOUND: Category does not exist.');
    }

    if (category.children.length > 0) {
      throw new Error('HAS_CHILDREN: Cannot delete asset category with active subcategories.');
    }

    if (category.assets.length > 0) {
      throw new Error('HAS_ASSETS: Cannot delete asset category linked to active assets.');
    }

    const updated = await tx.assetCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await appendAuditLog(tx, {
      actorUserId: userId,
      action: 'DELETED_ASSET_CATEGORY',
      resource: 'asset_category',
      resourceId: id,
      payload: { code: category.code, name: category.name },
    });

    return updated;
  });
}
