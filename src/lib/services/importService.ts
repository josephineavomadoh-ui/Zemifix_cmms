import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthenticatedUser } from '../auth';
import { generateUuidV7 } from '../uuid';
import { appendAuditLog } from './auditService';
import { sanitizeCsvCell } from './reportService';
import { postStockTransaction } from './inventoryService';
import { createAsset } from './assetService';
import { hashPassword } from '../auth';
import { notifyStaff } from './notificationService';
import crypto from 'crypto';

export interface ImportValidationResult {
  batchId: string;
  valid: boolean;
  totalRows: number;
  successRows: number;
  errorRows: number;
  rows: Array<{
    rowIndex: number;
    data: Record<string, string>;
    errors: string[];
    status: 'VALID' | 'ERROR';
  }>;
}

export interface ImportExecuteParams {
  batchId?: string;
  entityType: 'ASSET' | 'CUSTOMER' | 'INVENTORY' | 'USER';
  fileName: string;
  csvContent: string;
  mapping?: Record<string, string>;
  workerId?: string;
}

/**
 * RFC 4180 compliant CSV parser
 */
export function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (c === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (c === '\n' || c === '\r') {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += c;
      }
    }
  }
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    lines.push(currentRow);
  }

  const validLines = lines.filter((l) => l.some((cell) => cell.length > 0));
  if (validLines.length === 0) return [];

  const headers = validLines[0];
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < validLines.length; r++) {
    const row = validLines[r];
    const obj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      const headerName = headers[h] ?? `col_${h}`;
      obj[headerName] = row[h] ?? '';
    }
    records.push(obj);
  }

  return records;
}

/**
 * Helper to check branch scope authorization
 */
async function verifyBranchScope(user: AuthenticatedUser, branchId: string): Promise<boolean> {
  if (user.accessScope === 'Company') return true;
  if (!user.branchId) return false;
  if (user.branchId === branchId) return true;

  const userBranch = await prisma.branch.findUnique({ where: { id: user.branchId }, select: { path: true } });
  const targetBranch = await prisma.branch.findUnique({ where: { id: branchId }, select: { path: true } });
  if (!userBranch || !targetBranch) return false;

  const prefix = userBranch.path.endsWith('/') ? userBranch.path : `${userBranch.path}/`;
  return targetBranch.path.startsWith(prefix) || targetBranch.path === userBranch.path;
}

/**
 * Validate Import Batch before committing to PostgreSQL & persist state (Composite Idempotency: contentHash + entityType + mappingHash)
 */
export async function validateImportBatch(
  user: AuthenticatedUser,
  params: ImportExecuteParams
): Promise<ImportValidationResult> {
  const rawRows = parseCsv(params.csvContent);
  if (rawRows.length === 0) {
    throw new Error('INVALID_CSV: CSV file is empty or missing headers.');
  }
  if (rawRows.length > 5000) {
    throw new Error('ROW_LIMIT_EXCEEDED: Maximum allowed batch size is 5,000 rows.');
  }

  const contentHash = crypto.createHash('sha256').update(params.csvContent).digest('hex');
  const mappingHash = crypto.createHash('sha256').update(JSON.stringify(params.mapping ?? {})).digest('hex');

  const evaluatedRows: Array<{
    rowIndex: number;
    data: Record<string, string>;
    errors: string[];
    status: 'VALID' | 'ERROR';
  }> = [];

  let successRows = 0;
  let errorRows = 0;

  const [branches, categories, stores, customers, roles, departments] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, code: true } }),
    prisma.assetCategory.findMany({ select: { id: true, name: true } }),
    prisma.store.findMany({ select: { id: true, code: true } }),
    prisma.customer.findMany({ select: { id: true, customerNumber: true } }),
    prisma.role.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, code: true } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));
  const categoryNameSet = new Set(categories.map((c) => c.name.toUpperCase()));
  const storeCodeSet = new Set(stores.map((s) => s.code.toUpperCase()));
  const roleNameSet = new Set(roles.map((r) => r.name.toUpperCase()));
  const deptCodeSet = new Set(departments.map((d) => d.code.toUpperCase()));

  const existingAssetTags = new Set<string>();
  const existingPartNumbers = new Set<string>();
  const existingCustomerNumbers = new Set<string>();
  const existingUserEmails = new Set<string>();

  if (params.entityType === 'ASSET') {
    const assets = await prisma.asset.findMany({ select: { assetTag: true } });
    assets.forEach((a) => existingAssetTags.add(a.assetTag.toUpperCase()));
  } else if (params.entityType === 'INVENTORY') {
    const parts = await prisma.part.findMany({ select: { partNumber: true } });
    parts.forEach((p) => existingPartNumbers.add(p.partNumber.toUpperCase()));
  } else if (params.entityType === 'CUSTOMER') {
    const custs = await prisma.customer.findMany({ select: { customerNumber: true } });
    custs.forEach((c) => existingCustomerNumbers.add(c.customerNumber.toUpperCase()));
  } else if (params.entityType === 'USER') {
    const usrs = await prisma.user.findMany({ select: { email: true } });
    usrs.forEach((u) => existingUserEmails.add(u.email.toUpperCase()));
  }

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const errors: string[] = [];
    const rowIndex = i + 1;

    if (params.entityType === 'ASSET') {
      const assetTag = row['assetTag'] || row['Asset Tag'] || row['TAG'];
      const name = row['name'] || row['Name'] || row['ASSET NAME'];
      const category = row['category'] || row['Category'] || row['CATEGORY'];
      const branchCode = row['branchCode'] || row['Branch Code'] || row['BRANCH'];

      if (!assetTag) errors.push('Missing required field: assetTag');
      else if (existingAssetTags.has(assetTag.toUpperCase())) errors.push(`Duplicate assetTag already exists: ${assetTag}`);

      if (!name) errors.push('Missing required field: name');
      if (!category) errors.push('Missing required field: category');
      else if (!categoryNameSet.has(category.toUpperCase())) errors.push(`Unknown asset category: ${category}`);

      if (branchCode) {
        const bId = branchMap.get(branchCode.toUpperCase());
        if (!bId) errors.push(`Unknown branch code: ${branchCode}`);
        else {
          const authorized = await verifyBranchScope(user, bId);
          if (!authorized) errors.push(`Unauthorized branch scope for branch: ${branchCode}`);
        }
      }
    } else if (params.entityType === 'CUSTOMER') {
      const customerNumber = row['customerNumber'] || row['Customer Number'] || row['CUST #'];
      const name = row['name'] || row['Name'] || row['CUSTOMER NAME'];
      const email = row['email'] || row['Primary Email'] || row['EMAIL'];

      if (customerNumber && existingCustomerNumbers.has(customerNumber.toUpperCase())) {
        errors.push(`Duplicate customerNumber already exists: ${customerNumber}`);
      }
      if (!name) errors.push('Missing required field: name');
      if (email && !email.includes('@')) errors.push(`Invalid email format: ${email}`);
    } else if (params.entityType === 'INVENTORY') {
      const partNumber = row['partNumber'] || row['Part Number'] || row['PART #'];
      const name = row['name'] || row['Name'] || row['PART NAME'];
      const storeCode = row['storeCode'] || row['Store Code'] || row['STORE'];
      const openingQty = row['openingQty'] || row['Opening Qty'] || row['QTY'];
      const unitCost = row['unitCost'] || row['Unit Cost'] || row['COST'];

      if (!partNumber) errors.push('Missing required field: partNumber');
      else if (existingPartNumbers.has(partNumber.toUpperCase())) errors.push(`Duplicate partNumber already exists: ${partNumber}`);

      if (!name) errors.push('Missing required field: name');
      if (!storeCode) errors.push('Missing required field: storeCode');
      else if (!storeCodeSet.has(storeCode.toUpperCase())) errors.push(`Unknown store code: ${storeCode}`);

      if (openingQty && isNaN(Number(openingQty))) errors.push(`Invalid opening quantity: ${openingQty}`);
      if (unitCost && isNaN(Number(unitCost))) errors.push(`Invalid unit cost: ${unitCost}`);
    } else if (params.entityType === 'USER') {
      const email = row['email'] || row['Email'] || row['EMAIL'];
      const name = row['name'] || row['Name'] || row['FULL NAME'];
      const roleName = row['roleName'] || row['Role'] || 'Technician';
      const branchCode = row['branchCode'] || row['Branch Code'];
      const deptCode = row['departmentCode'] || row['Department Code'];

      if (!email) errors.push('Missing required field: email');
      else if (existingUserEmails.has(email.toUpperCase())) errors.push(`Duplicate user email already exists: ${email}`);

      if (!name) errors.push('Missing required field: name');
      if (roleName && !roleNameSetCheck(roleName, roleNameSet)) errors.push(`Invalid or unauthorized role: ${roleName}`);

      if (branchCode) {
        const bId = branchMap.get(branchCode.toUpperCase());
        if (!bId) errors.push(`Unknown branch code: ${branchCode}`);
        else {
          const authorized = await verifyBranchScope(user, bId);
          if (!authorized) errors.push(`Unauthorized branch scope for user branch: ${branchCode}`);
        }
      }
      if (deptCode && !deptCodeSet.has(deptCode.toUpperCase())) {
        errors.push(`Unknown department code: ${deptCode}`);
      }
    }

    const status = errors.length > 0 ? 'ERROR' : 'VALID';
    if (status === 'VALID') successRows++;
    else errorRows++;

    evaluatedRows.push({
      rowIndex,
      data: row,
      errors: errors.map(sanitizeCsvCell),
      status,
    });
  }

  // Persist or update validated batch with composite idempotency (contentHash + entityType + mappingHash)
  let batch = await prisma.importBatch.findFirst({
    where: { contentHash, entityType: params.entityType, mappingHash },
  });

  if (batch) {
    if (batch.status === 'COMPLETED') {
      throw new Error('BATCH_ALREADY_COMPLETED: This exact import file, entity type, and mapping has already been successfully executed.');
    }
    batch = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: errorRows === 0 ? 'VALIDATED' : 'PARTIAL',
        totalRows: rawRows.length,
        successRows,
        errorRows,
        summaryJson: { successRows, errorRows },
        errorsJson: evaluatedRows.filter((r) => r.status === 'ERROR'),
        mappingJson: params.mapping ?? {},
      },
    });
  } else {
    batch = await prisma.importBatch.create({
      data: {
        id: generateUuidV7(),
        entityType: params.entityType,
        status: errorRows === 0 ? 'VALIDATED' : 'PARTIAL',
        fileName: params.fileName,
        contentHash,
        mappingHash,
        totalRows: rawRows.length,
        successRows,
        errorRows,
        actorUserId: user.id,
        summaryJson: { successRows, errorRows },
        errorsJson: evaluatedRows.filter((r) => r.status === 'ERROR'),
        mappingJson: params.mapping ?? {},
      },
    });
  }

  return {
    batchId: batch.id,
    valid: errorRows === 0,
    totalRows: rawRows.length,
    successRows,
    errorRows,
    rows: evaluatedRows,
  };
}

function roleNameNameSetCheck(roleName: string, roleNameSet: Set<string>): boolean {
  return roleNameSet.has(roleName.toUpperCase());
}

/**
 * Execute Import Batch idempotently and atomically with Execution Lease / Crash Recovery
 */
export async function executeImportBatch(
  user: AuthenticatedUser,
  params: ImportExecuteParams
) {
  if (!params.batchId) {
    throw new Error('MISSING_BATCH_ID: Execution requires a valid validated batchId.');
  }

  const batch = await prisma.importBatch.findUnique({ where: { id: params.batchId } });
  if (!batch) {
    throw new Error('BATCH_NOT_FOUND: Import batch not found. Run validation preflight first.');
  }
  if (batch.status === 'COMPLETED') {
    throw new Error('BATCH_ALREADY_COMPLETED: This batch has already been executed successfully.');
  }

  const now = new Date();
  const workerId = params.workerId ?? `worker-${crypto.randomBytes(4).toString('hex')}`;
  const leaseDurationMs = 10 * 60 * 1000; // 10 minute lease
  const newExpiresAt = new Date(now.getTime() + leaseDurationMs);

  // Atomic lease claim: allow claim if status is VALIDATED, PARTIAL, or if EXECUTING lease has expired (Crash Recovery)
  const claimed = await prisma.importBatch.updateMany({
    where: {
      id: batch.id,
      OR: [
        { status: { in: ['VALIDATED', 'PARTIAL'] } },
        { status: 'EXECUTING', expiresAt: { lt: now } }, // Crash recovery: expired lease
      ],
    },
    data: {
      status: 'EXECUTING',
      workerId,
      startedAt: now,
      expiresAt: newExpiresAt,
    },
  });

  if (claimed.count === 0) {
    throw new Error('CONCURRENT_EXECUTION_LOCKED: Batch is currently executing under an active lease or already completed.');
  }

  // Bind execution to exact validated content hash and persisted mapping
  const currentHash = crypto.createHash('sha256').update(params.csvContent).digest('hex');
  if (batch.contentHash && batch.contentHash !== currentHash) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: 'FAILED' } });
    throw new Error('CONTENT_TAMPERED: CSV content does not match the validated preflight hash.');
  }

  const validation = await validateImportBatch(user, {
    ...params,
    mapping: (batch.mappingJson as Record<string, string>) || params.mapping,
  });
  const validRows = validation.rows.filter((r) => r.status === 'VALID');

  let successCount = 0;
  let failCount = 0;
  const executionErrors: Array<{ rowIndex: number; error: string }> = [];

  const branchMap = new Map(
    (await prisma.branch.findMany({ select: { id: true, code: true } })).map((b) => [b.code.toUpperCase(), b.id])
  );
  const categoryMap = new Map(
    (await prisma.assetCategory.findMany({ select: { id: true, name: true } })).map((c) => [c.name.toUpperCase(), c.id])
  );
  const storeMap = new Map(
    (await prisma.store.findMany({ select: { id: true, code: true } })).map((s) => [s.code.toUpperCase(), s.id])
  );
  const roleMap = new Map(
    (await prisma.role.findMany({ select: { id: true, name: true } })).map((r) => [r.name.toUpperCase(), r.id])
  );
  const deptMap = new Map(
    (await prisma.department.findMany({ select: { id: true, code: true } })).map((d) => [d.code.toUpperCase(), d.id])
  );

  for (const rowObj of validRows) {
    // Row-level transactional safety & resume safety
    try {
      await prisma.$transaction(async (tx: any) => {
        const row = rowObj.data;

        if (params.entityType === 'ASSET') {
          const assetTag = row['assetTag'] || row['Asset Tag'] || row['TAG'];
          const name = row['name'] || row['Name'] || row['ASSET NAME'];
          const categoryName = row['category'] || row['Category'] || row['CATEGORY'];
          const branchCode = row['branchCode'] || row['Branch Code'] || row['BRANCH'];
          const serialNumber = row['serialNumber'] || row['Serial Number'] || '';
          const ownershipType = (row['ownershipType'] || 'COMPANY_OWNED') as any;

          const categoryId = categoryMap.get(categoryName.toUpperCase());
          const branchId = branchCode ? branchMap.get(branchCode.toUpperCase()) ?? user.branchId : user.branchId;

          if (!categoryId) throw new Error(`Category not found: ${categoryName}`);

          const existingAsset = await tx.asset.findUnique({ where: { assetTag } });
          if (!existingAsset) {
            const defaultLoc = await tx.location.findFirst({
              where: { branchId },
              select: { id: true },
            });

            await createAsset({
              assetTag,
              name,
              categoryId,
              branchId,
              managingBranchId: branchId,
              managingOrgType: 'INTERNAL_BRANCH',
              locationId: defaultLoc?.id,
              serialNumber: serialNumber || null,
              ownershipType: ['COMPANY_OWNED', 'CUSTOMER_OWNED', 'LEASED'].includes(ownershipType) ? ownershipType : 'COMPANY_OWNED',
              criticality: 3,
              createdByUserId: user.id,
            });
          }
        } else if (params.entityType === 'CUSTOMER') {
          const customerNumber = row['customerNumber'] || row['Customer Number'] || `CUST-${Date.now().toString().slice(-6)}`;
          const name = row['name'] || row['Name'] || row['CUSTOMER NAME'];
          const primaryEmail = row['email'] || row['Primary Email'] || '';
          const primaryPhone = row['phone'] || row['Phone'] || '0240000000';
          const billingAddress = row['address'] || row['Billing Address'] || 'Accra Industrial Area';

          let existingCust = await tx.customer.findUnique({ where: { customerNumber } });
          if (!existingCust) {
            existingCust = await tx.customer.create({
              data: {
                id: generateUuidV7(),
                customerNumber,
                name,
                primaryEmail: primaryEmail || null,
                primaryPhone,
                billingAddress,
              },
            });
          }

          const siteCode = row['siteCode'] || row['Site Code'];
          const siteName = row['siteName'] || row['Site Name'];
          const siteAddress = row['siteAddress'] || row['Site Address'];
          if (siteCode && siteName) {
            const existingSite = await tx.customerSite.findFirst({
              where: { customerId: existingCust.id, siteCode },
            });
            if (!existingSite) {
              await tx.customerSite.create({
                data: {
                  id: generateUuidV7(),
                  customerId: existingCust.id,
                  siteCode,
                  name: siteName,
                  address: siteAddress || billingAddress,
                },
              });
            }
          }
        } else if (params.entityType === 'INVENTORY') {
          const partNumber = row['partNumber'] || row['Part Number'] || row['PART #'];
          const name = row['name'] || row['Name'] || row['PART NAME'];
          const category = row['category'] || 'SPARE_PARTS';
          const uom = row['uom'] || 'PCS';
          const storeCode = row['storeCode'] || row['Store Code'];
          const openingQty = parseFloat(row['openingQty'] || '0');
          const unitCost = parseFloat(row['unitCost'] || '0');

          const storeId = storeMap.get(storeCode.toUpperCase());
          if (!storeId) throw new Error(`Store code not found: ${storeCode}`);

          let part = await tx.part.findUnique({ where: { partNumber } });
          if (!part) {
            const partId = generateUuidV7();
            part = await tx.part.create({
              data: {
                id: partId,
                partNumber,
                name,
                category,
                uom,
                standardCost: new Prisma.Decimal(unitCost),
                averageCost: new Prisma.Decimal(unitCost),
                isActive: true,
              },
            });

            if (openingQty > 0) {
              await postStockTransaction(tx, {
                transactionType: 'OPENING_BALANCE',
                storeId,
                partId: part.id,
                quantity: openingQty,
                unitCost,
                referenceDoc: `IMPORT-${params.fileName}`,
                actingUserId: user.id,
              });
            }
          }
        } else if (params.entityType === 'USER') {
          const email = row['email'] || row['Email'];
          const name = row['name'] || row['Name'];
          const roleName = row['roleName'] || row['Role'] || 'Technician';
          const branchCode = row['branchCode'] || row['Branch Code'];
          const deptCode = row['departmentCode'] || row['Department Code'];
          const phone = row['phone'] || row['Phone'] || '0240000000';

          const roleId = roleMap.get(roleName.toUpperCase());
          if (!roleId) throw new Error(`Invalid role: ${roleName}`);

          const branchId = branchCode ? branchMap.get(branchCode.toUpperCase()) ?? user.branchId : user.branchId;
          const departmentId = deptCode ? deptMap.get(deptCode.toUpperCase()) ?? null : null;

          // Secure imported user activation workflow:
          // Generate secure expiring activation token, store SHA-256 hash, set locked password placeholder
          const rawActivationToken = crypto.randomBytes(32).toString('hex');
          const activationTokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
          const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

          const lockedPasswordPlaceholder = `LOCKED_PENDING_ACTIVATION:${crypto.randomBytes(16).toString('hex')}`;
          const passwordHash = await hashPassword(lockedPasswordPlaceholder);

          const existingUsr = await tx.user.findUnique({ where: { email } });
          if (!existingUsr) {
            const createdUser = await tx.user.create({
              data: {
                id: generateUuidV7(),
                email,
                name,
                phone,
                passwordHash,
                roleId,
                branchId,
                departmentId,
                accessScope: 'Branch',
                isActive: true,
                activationTokenHash,
                activationExpiresAt,
              },
            });

            await tx.notificationTemplate.upsert({
              where: { realm_eventType: { realm: 'STAFF', eventType: 'USER_ACTIVATION' } },
              update: {},
              create: {
                id: generateUuidV7(),
                realm: 'STAFF',
                eventType: 'USER_ACTIVATION',
                titleTemplate: 'Account Activation — ZemiFix CMMS',
                bodyTemplate: 'Hello {{name}}, your account has been provisioned. Activate at {{link}}',
                emailSubject: 'Welcome to ZemiFix CMMS — Activate Your Account',
                emailBody: 'Hello {{name}},\n\nYour staff account has been created. Click the link below to set your password and activate your account:\n\n{{link}}',
              },
            });

            // Dispatch activation notification using existing notification infrastructure
            await notifyStaff(tx, {
              recipientUserId: createdUser.id,
              eventType: 'USER_ACTIVATION',
              eventKey: `user-activation:${createdUser.id}`,
              variables: { name: createdUser.name, email: createdUser.email },
              context: { branchId: createdUser.branchId, departmentId: createdUser.departmentId },
              link: `/auth/activate?token=${rawActivationToken}`,
            });
          }
        }
      });

      successCount++;
    } catch (err: any) {
      failCount++;
      executionErrors.push({ rowIndex: rowObj.rowIndex, error: err.message });
    }
  }

  const finalStatus = failCount === 0 ? 'COMPLETED' : 'PARTIAL';
  await prisma.$transaction(async (tx: any) => {
    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        successRows: successCount,
        errorRows: validation.errorRows + failCount,
        summaryJson: { successCount, failCount },
        errorsJson: [...validation.rows.filter((r) => r.status === 'ERROR'), ...executionErrors],
        expiresAt: null, // Clear lease upon completion
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'EXECUTED_DATA_IMPORT',
      resource: 'import_batch',
      resourceId: batch.id,
      payload: { entityType: params.entityType, fileName: params.fileName, successCount, failCount },
    });
  });

  return {
    success: true,
    batchId: batch.id,
    totalRows: validation.totalRows,
    successRows: successCount,
    errorRows: validation.errorRows + failCount,
    errors: executionErrors,
  };
}

/**
 * Secure account activation / password-setup for imported users
 */
export async function activateImportedUserAccount(params: {
  activationToken: string;
  newPassword: string;
}) {
  const tokenHash = crypto.createHash('sha256').update(params.activationToken).digest('hex');

  return await prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findFirst({
      where: {
        activationTokenHash: tokenHash,
        activationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new Error('INVALID_OR_EXPIRED_ACTIVATION_TOKEN: The activation token is invalid or has expired.');
    }

    if (params.newPassword.length < 8) {
      throw new Error('WEAK_PASSWORD: Password must be at least 8 characters long.');
    }

    const newPasswordHash = await hashPassword(params.newPassword);

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        activationTokenHash: null,
        activationExpiresAt: null,
      },
    });

    await appendAuditLog(tx, {
      actorUserId: user.id,
      action: 'ACTIVATED_USER_ACCOUNT',
      resource: 'user',
      resourceId: user.id,
      payload: { email: user.email },
    });

    return { success: true, message: 'Account successfully activated.' };
  });
}

export async function getImportBatches(user: AuthenticatedUser) {
  if (!user || !user.id) {
    throw new Error('UNAUTHORIZED: Staff authentication required.');
  }
  return await prisma.importBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actorUser: { select: { name: true, email: true } } },
  });
}

export async function getImportBatchById(user: AuthenticatedUser, id: string) {
  if (!user || !user.id) {
    throw new Error('UNAUTHORIZED: Staff authentication required.');
  }
  return await prisma.importBatch.findUnique({
    where: { id },
    include: { actorUser: { select: { name: true, email: true } } },
  });
}

function roleNameSetCheck(roleName: string, roleNameSet: Set<string>): boolean {
  return roleNameSet.has(roleName.toUpperCase());
}
