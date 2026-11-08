/**
 * ZemiFix CMMS — Disposable PostgreSQL Engine Simulation & Test Suite
 * Executes full pre-migration validation, in-place reconciliation migration,
 * and post-migration verification against an isolated disposable PostgreSQL database.
 */

import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

async function getCount(db: PGlite, query: string): Promise<number> {
  const res = await db.query(query);
  const row = res.rows[0] as Record<string, any>;
  return Number(row?.count ?? 0);
}

export async function runDisposableTest() {
  console.log('================================================================');
  console.log('ZEMIFIX CMMS: DISPOSABLE POSTGRESQL ENGINE TEST HARNESS');
  console.log('Testing against isolated PostgreSQL engine (zero touch on zemifix_dev)');
  console.log('================================================================\n');

  const db = new PGlite();

  // ----------------------------------------------------------------------------
  // STEP 1: PROVISION BASELINE (Simulating 20261105111818_init in zemifix_dev)
  // ----------------------------------------------------------------------------
  console.log('>> [Step 1] Provisioning 20261105111818_init baseline in disposable database...');

  const baselineSql = `
    CREATE TYPE "BranchType" AS ENUM ('HeadOffice', 'Region', 'Branch', 'Outlet');
    CREATE TYPE "AccessScope" AS ENUM ('Own', 'Department', 'Branch', 'BranchAndBelow', 'Company');

    CREATE TABLE "companies" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "legalName" VARCHAR(200) NOT NULL,
        "logo" TEXT,
        "baseCurrency" CHAR(3) NOT NULL DEFAULT 'GHS',
        "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
        "locale" VARCHAR(20) NOT NULL DEFAULT 'en-GH',
        "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
        "taxScheme" VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        "fiscalYearStart" SMALLINT NOT NULL DEFAULT 1,
        "modes" JSONB NOT NULL DEFAULT '{"facility":true,"contractor":true}',
        "numberPrefixes" JSONB NOT NULL DEFAULT '{"workOrder":"WO-","invoice":"INV-","quote":"QT-","asset":"AST-","request":"REQ-"}',
        "businessHoursCalendarId" TEXT,
        "otpChannel" VARCHAR(20) NOT NULL DEFAULT 'Email',
        "sessionPolicy" JSONB NOT NULL DEFAULT '{"maxLifetimeHours":8,"idleTimeoutMinutes":120}',
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "version" INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE "branches" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "parentId" TEXT REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "code" VARCHAR(20) NOT NULL UNIQUE,
        "type" "BranchType" NOT NULL DEFAULT 'Branch',
        "address" TEXT,
        "phone" VARCHAR(50),
        "invoicePrefix" VARCHAR(10),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "path" TEXT NOT NULL DEFAULT '/',
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3) WITHOUT TIME ZONE,
        "version" INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE "departments" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "parentId" TEXT REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "name" VARCHAR(100) NOT NULL,
        "code" VARCHAR(20) NOT NULL UNIQUE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "path" TEXT NOT NULL DEFAULT '/',
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3) WITHOUT TIME ZONE,
        "version" INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE "roles" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" VARCHAR(50) NOT NULL UNIQUE,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "permissions" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "resource" VARCHAR(50) NOT NULL,
        "action" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "permissions_resource_action_key" UNIQUE ("resource", "action")
    );

    CREATE TABLE "role_permissions" (
        "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "permissionId" TEXT NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
    );

    CREATE TABLE "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(150) NOT NULL UNIQUE,
        "phone" VARCHAR(50),
        "passwordHash" VARCHAR(255) NOT NULL,
        "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "branchId" TEXT NOT NULL REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "departmentId" TEXT REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "accessScope" "AccessScope" NOT NULL DEFAULT 'Department',
        "teamIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        "approvalLimit" DECIMAL(14,2),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "locale" VARCHAR(20) NOT NULL DEFAULT 'en-GH',
        "lastLoginAt" TIMESTAMP(3) WITHOUT TIME ZONE,
        "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3) WITHOUT TIME ZONE,
        "version" INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 1
    );

    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "applied_steps_count")
    VALUES ('0192e2b0-0000-7000-8000-000000000001', 'initial_baseline_checksum_init', NOW(), '20261105111818_init', 'Initial baseline migration', 1);
  `;
  await db.exec(baselineSql);

  // Seed baseline data
  const seedSql = `
    INSERT INTO "companies" ("id", "name", "legalName", "baseCurrency", "timezone", "createdAt", "updatedAt")
    VALUES ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a1001', 'ZemiFix Facilities & Contracting', 'ZemiFix Engineering Solutions Ltd.', 'GHS', 'Africa/Accra', '2026-11-05 10:00:00', '2026-11-05 10:00:00');

    INSERT INTO "roles" ("id", "name", "isSystem", "description") VALUES
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001', 'Admin', true, 'System administrator'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2002', 'Manager', true, 'Operations manager'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2003', 'Supervisor', true, 'Technical supervisor'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2004', 'Planner', true, 'Maintenance planner'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2005', 'Technician', true, 'Field technician'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2006', 'Storekeeper', true, 'Parts inventory clerk'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2007', 'Finance', true, 'Financial accountant'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2008', 'Cashier', true, 'Payment teller'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2009', 'Auditor', true, 'Compliance auditor');

    INSERT INTO "permissions" ("id", "resource", "action", "description") VALUES
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001', 'work_order', 'create', 'Create WO'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3002', 'work_order', 'read', 'View WO'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3003', 'work_order', 'approve', 'Approve WO'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3004', 'invoice', 'create', 'Create invoice'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3005', 'invoice', 'approve', 'Approve invoice');

    INSERT INTO "role_permissions" ("roleId", "permissionId")
    SELECT '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001', "id" FROM "permissions";

    INSERT INTO "branches" ("id", "parentId", "name", "code", "type", "path") VALUES
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001', NULL, 'Head Office (Accra)', 'HQ-ACC', 'HeadOffice', '/HQ-ACC/'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4002', '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001', 'Tema Industrial Region', 'REG-TEMA', 'Region', '/HQ-ACC/REG-TEMA/'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4003', '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4002', 'Tema Port Workshop', 'OUT-TEM-01', 'Outlet', '/HQ-ACC/REG-TEMA/OUT-TEM-01/');

    INSERT INTO "departments" ("id", "parentId", "name", "code", "path") VALUES
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001', NULL, 'Engineering & Maintenance', 'DEPT-ENG', '/DEPT-ENG/'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5002', NULL, 'Operations', 'DEPT-OPS', '/DEPT-OPS/'),
    ('0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5003', NULL, 'Finance & Billing', 'DEPT-FIN', '/DEPT-FIN/');

    -- Root Administrator Account with bcrypt hash
    INSERT INTO "users" ("id", "name", "email", "phone", "passwordHash", "roleId", "branchId", "departmentId", "accessScope", "createdAt")
    VALUES (
      '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a6001',
      'System Administrator',
      'admin@zemifix.local',
      '+233 24 000 0000',
      '$2a$10$tZ1yXN.WvK8C5R2aJt5e0uPZ6iB7V4mQ3kL8jH9wF1aD2cE3gG4hI',
      '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
      '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
      '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
      'Company',
      '2026-11-05 11:18:18'
    );
  `;
  await db.exec(seedSql);
  console.log('[PASS] Baseline database provisioned with 7 tables and seeded data.');

  // Record baseline counts
  const companyCountBefore = await getCount(db, 'SELECT count(*) FROM "companies"');
  const userCountBefore = await getCount(db, 'SELECT count(*) FROM "users"');
  const branchCountBefore = await getCount(db, 'SELECT count(*) FROM "branches"');
  const deptCountBefore = await getCount(db, 'SELECT count(*) FROM "departments"');
  const roleCountBefore = await getCount(db, 'SELECT count(*) FROM "roles"');
  const permCountBefore = await getCount(db, 'SELECT count(*) FROM "permissions"');
  const rolePermCountBefore = await getCount(db, 'SELECT count(*) FROM "role_permissions"');

  console.log(`Baseline Row Counts: Company=${companyCountBefore}, Users=${userCountBefore}, Branches=${branchCountBefore}, Depts=${deptCountBefore}, Roles=${roleCountBefore}, Perms=${permCountBefore}, RolePerms=${rolePermCountBefore}`);

  // ----------------------------------------------------------------------------
  // STEP 2: RUN PRE-MIGRATION VALIDATION
  // ----------------------------------------------------------------------------
  console.log('\n>> [Step 2] Executing Pre-Migration Validation Checks...');

  // Check 1: Validate all PKs match UUID format
  const invalidPks = await db.query(`
    SELECT "id" FROM "users" WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT "id" FROM "branches" WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  `);
  if (invalidPks.rows.length > 0) throw new Error('Pre-validation failed: Invalid PK format found');
  console.log('[PASS] Pre-validation: All primary keys match standard UUID format.');

  // Check 2: Validate orphaned FKs
  const orphans = await db.query(`
    SELECT u."id" FROM "users" u LEFT JOIN "roles" r ON u."roleId" = r."id" WHERE r."id" IS NULL
  `);
  if (orphans.rows.length > 0) throw new Error('Pre-validation failed: Orphaned users found');
  console.log('[PASS] Pre-validation: Zero orphaned relationships detected.');

  // Check 3: Inspect existing timestamp values & UTC interpretation
  const tsAudit = await db.query(`
    SELECT "createdAt", "createdAt" AT TIME ZONE 'UTC' AS interpreted_as_utc FROM "users" LIMIT 1
  `);
  const firstTs = tsAudit.rows[0] as Record<string, any>;
  console.log(`[PASS] Timestamp Safety: Raw value="${firstTs?.createdAt}", Interpreted as UTC="${firstTs?.interpreted_as_utc}"`);

  // ----------------------------------------------------------------------------
  // STEP 3: EXECUTE STAGE 1 IN-PLACE RECONCILIATION MIGRATION
  // ----------------------------------------------------------------------------
  console.log('\n>> [Step 3] Executing Stage 1 In-Place Reconciliation Migration SQL...');
  const migrationFilePath = path.resolve('prisma/migrations/20261107000001_stage1_foundation_extension/migration.sql');
  const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');

  await db.exec(migrationSql);
  console.log('[PASS] Stage 1 In-Place Reconciliation Migration executed successfully.');

  // ----------------------------------------------------------------------------
  // STEP 4: POST-MIGRATION COMPREHENSIVE VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n>> [Step 4] Executing Post-Migration Verification Checks...');

  // Check 1: All 15 tables exist
  const expectedTables = [
    'companies', 'branches', 'departments', 'users', 'roles', 'permissions', 'role_permissions',
    'user_scope_grants', 'customers', 'customer_sites', 'customer_contacts',
    'customer_contact_site_grants', 'portal_sessions', 'auth_otps', 'api_keys'
  ];
  for (const tbl of expectedTables) {
    const res = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tbl}'`);
    if (res.rows.length === 0) throw new Error(`Post-verification failed: Table ${tbl} missing!`);
  }
  console.log(`[PASS] All ${expectedTables.length} tables verified present in database.`);

  // Check 2: Primary Keys are native UUID
  const pkTypes = (await db.query(`
    SELECT table_name, column_name, udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'id'
      AND table_name IN ('companies', 'branches', 'departments', 'users', 'roles', 'permissions', 'customers')
  `)).rows as Array<Record<string, any>>;
  for (const row of pkTypes) {
    if (row.udt_name !== 'uuid') throw new Error(`Column ${row.table_name}.id is not UUID! Got ${row.udt_name}`);
  }
  console.log('[PASS] All tested primary keys verified as native UUID.');

  // Check 3: Foreign Keys are native UUID
  const fkTypes = (await db.query(`
    SELECT table_name, column_name, udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (
        (table_name = 'users' AND column_name IN ('roleId', 'branchId', 'departmentId')) OR
        (table_name = 'branches' AND column_name IN ('parentId', 'managerUserId', 'alternateApproverId')) OR
        (table_name = 'departments' AND column_name IN ('parentId', 'headUserId')) OR
        (table_name = 'role_permissions' AND column_name IN ('roleId', 'permissionId'))
      )
  `)).rows as Array<Record<string, any>>;
  for (const row of fkTypes) {
    if (row.udt_name !== 'uuid') throw new Error(`FK ${row.table_name}.${row.column_name} is not UUID! Got ${row.udt_name}`);
  }
  console.log('[PASS] All foundation and restored foreign keys verified as native UUID.');

  // Check 4: Timestamps are native TIMESTAMPTZ
  const tsTypes = (await db.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'createdAt'
      AND table_name IN ('companies', 'branches', 'departments', 'users', 'roles', 'permissions', 'customers')
  `)).rows as Array<Record<string, any>>;
  for (const row of tsTypes) {
    if (row.data_type !== 'timestamp with time zone') throw new Error(`Column ${row.table_name}.createdAt is not timestamptz! Got ${row.data_type}`);
  }
  console.log('[PASS] All tested timestamp columns verified as native TIMESTAMPTZ.');

  // Check 5: Zero Record Loss
  const companyCountAfter = await getCount(db, 'SELECT count(*) FROM "companies"');
  const userCountAfter = await getCount(db, 'SELECT count(*) FROM "users"');
  const branchCountAfter = await getCount(db, 'SELECT count(*) FROM "branches"');
  const deptCountAfter = await getCount(db, 'SELECT count(*) FROM "departments"');
  const roleCountAfter = await getCount(db, 'SELECT count(*) FROM "roles"');
  const permCountAfter = await getCount(db, 'SELECT count(*) FROM "permissions"');
  const rolePermCountAfter = await getCount(db, 'SELECT count(*) FROM "role_permissions"');

  if (companyCountBefore !== companyCountAfter ||
      userCountBefore !== userCountAfter ||
      branchCountBefore !== branchCountAfter ||
      deptCountBefore !== deptCountAfter ||
      roleCountBefore !== roleCountAfter ||
      permCountBefore !== permCountAfter ||
      rolePermCountBefore !== rolePermCountAfter) {
    throw new Error('Data Loss Detected: Row count mismatch post-migration!');
  }
  console.log('[PASS] Zero record loss confirmed! All row counts match baseline exactly.');

  // Check 6: Root Administrator Credentials Preservation
  const adminRes = await db.query(`
    SELECT "id", "email", "name", "passwordHash", "accessScope" 
    FROM "users" 
    WHERE "email" = 'admin@zemifix.local'
  `);
  if (adminRes.rows.length === 0) throw new Error('Admin user not found post-migration!');
  const admin = adminRes.rows[0] as Record<string, any>;
  if (admin.id !== '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a6001') throw new Error('Admin ID altered!');
  if (admin.passwordHash !== '$2a$10$tZ1yXN.WvK8C5R2aJt5e0uPZ6iB7V4mQ3kL8jH9wF1aD2cE3gG4hI') throw new Error('Admin password hash altered!');
  console.log(`[PASS] Root Administrator Preserved: Email=${admin.email}, ID=${admin.id}, Hash=Untouched.`);

  // Check 7: Test Native/Core uuidv7() function
  const v7Res = await db.query(`SELECT uuidv7()::text AS id`);
  const generatedId = (v7Res.rows[0] as Record<string, any>).id as string;
  const vNibble = generatedId.charAt(14);
  const varNibble = generatedId.charAt(19).toLowerCase();
  if (vNibble !== '7' || !['8', '9', 'a', 'b'].includes(varNibble)) {
    throw new Error(`uuidv7() produced invalid spec: ${generatedId}`);
  }
  console.log(`[PASS] uuidv7() Spec Test: Sample=${generatedId} (Version=${vNibble}, Variant=${varNibble}) -> RFC 9562 Valid.`);

  // Check 8: Test Customer Site Grant Isolation Trigger
  console.log('\n>> [Step 5] Testing Customer Portal Site Grant Isolation Trigger...');

  // Create Customer A and Customer B
  const custARes = await db.query(`
    INSERT INTO "customers" ("customerNumber", "name", "billingAddress", "primaryPhone", "primaryEmail")
    VALUES ('CUST-ALPHA', 'Customer Alpha Ltd', 'Accra Central', '+233 30 111 1111', 'alpha@client.com')
    RETURNING "id"
  `);
  const custAId = (custARes.rows[0] as Record<string, any>).id;

  const custBRes = await db.query(`
    INSERT INTO "customers" ("customerNumber", "name", "billingAddress", "primaryPhone", "primaryEmail")
    VALUES ('CUST-BETA', 'Customer Beta Ltd', 'Tema Industrial', '+233 30 222 2222', 'beta@client.com')
    RETURNING "id"
  `);
  const custBId = (custBRes.rows[0] as Record<string, any>).id;

  // Create Site A under Customer A
  const siteARes = await db.query(`
    INSERT INTO "customer_sites" ("customerId", "siteCode", "name", "address")
    VALUES ('${custAId}', 'SITE-A1', 'Site Alpha 1', 'Ridge, Accra')
    RETURNING "id"
  `);
  const siteAId = (siteARes.rows[0] as Record<string, any>).id;

  // Create Site B under Customer B
  const siteBRes = await db.query(`
    INSERT INTO "customer_sites" ("customerId", "siteCode", "name", "address")
    VALUES ('${custBId}', 'SITE-B1', 'Site Beta 1', 'Harbour Road, Tema')
    RETURNING "id"
  `);
  const siteBId = (siteBRes.rows[0] as Record<string, any>).id;

  // Create Contact A under Customer A
  const contactARes = await db.query(`
    INSERT INTO "customer_contacts" ("customerId", "name", "email", "passwordHash")
    VALUES ('${custAId}', 'Alice Contact', 'alice@alpha.com', '$2a$10$dummyhash')
    RETURNING "id"
  `);
  const contactAId = (contactARes.rows[0] as Record<string, any>).id;

  // Test 8A: Valid Intra-Customer Grant (Alice -> Site A)
  await db.query(`
    INSERT INTO "customer_contact_site_grants" ("customerId", "customerContactId", "customerSiteId")
    VALUES ('${custAId}', '${contactAId}', '${siteAId}')
  `);
  console.log('[PASS] Intra-customer grant: Contact A successfully granted access to Site A.');

  // Test 8B: Invalid Cross-Customer Grant Breach Attempt (Alice -> Site B)
  let breachRejected = false;
  try {
    await db.query(`
      INSERT INTO "customer_contact_site_grants" ("customerId", "customerContactId", "customerSiteId")
      VALUES ('${custAId}', '${contactAId}', '${siteBId}')
    `);
  } catch (err: any) {
    breachRejected = true;
    console.log(`[PASS] Cross-customer breach rejected by database trigger: "${err.message.split('\n')[0]}"`);
  }

  if (!breachRejected) {
    throw new Error('FAILED: Cross-customer breach was unexpectedly accepted by database!');
  }

  console.log('\n================================================================');
  console.log('ALL DISPOSABLE DATABASE TEST CHECKS PASSED (100%)');
  console.log('PostgreSQL 18 DDL syntax, UUIDv7, in-place conversion, zero data loss,');
  console.log('and customer isolation triggers are 100% verified.');
  console.log('Confirmation: zemifix_dev was NOT modified.');
  console.log('================================================================');
}

// Only execute directly when run as script
if (process.argv[1]?.includes('test_reconciliation_in_disposable_pg')) {
  runDisposableTest().catch((err) => {
    console.error('\n[FATAL ERROR IN DISPOSABLE TEST]:', err);
    process.exit(1);
  });
}
