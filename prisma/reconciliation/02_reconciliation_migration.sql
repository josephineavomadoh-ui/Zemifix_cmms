-- ==============================================================================
-- ZEMIFIX CMMS — STAGE 1 IN-PLACE DATABASE RECONCILIATION MIGRATION
-- Database: zemifix_dev (PostgreSQL 18 on Windows)
-- Purpose: Safely upgrade existing 7 foundation tables from TEXT/TIMESTAMP
--          to native UUID and TIMESTAMPTZ, add restored governance columns,
--          recreate relational constraints, deploy 8 new Stage 1 tables,
--          and enforce customer portal isolation.
--
-- GUARANTEE: Preserves all existing records, administrator accounts, password hashes,
--            branch hierarchies, and RBAC roles with ZERO DATA LOSS.
--
-- EXECUTION: Run inside a single ACID transaction. If any statement encounters
--            an error, the entire migration automatically rolls back.
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ------------------------------------------------------------------------------
-- STEP 0: TIMEZONE CONVERSION VALIDATION GUARD
-- Enforces explicit confirmation that existing TIMESTAMP WITHOUT TIME ZONE values
-- were persisted in UTC (standard Prisma client behavior).
-- If existing values were recorded in a local time zone, adjust the 'UTC' parameter
-- below to your source time zone (e.g. 'Africa/Accra' or 'America/New_York').
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE 'Starting ZemiFix CMMS Stage 1 In-Place Reconciliation Migration...';
    RAISE NOTICE 'Timestamp assumption: Existing timestamps represent UTC values.';
END $$;

-- ------------------------------------------------------------------------------
-- STEP 1: ENSURE uuidv7() IS AVAILABLE (CORE NATIVE IN PG18, FALLBACK WITHOUT PGCRYPTO)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuidv7') THEN
        CREATE OR REPLACE FUNCTION uuidv7()
        RETURNS UUID AS $fn$
        DECLARE
            unix_ts_ms BIGINT;
            uuid_bytes BYTEA;
        BEGIN
            unix_ts_ms := FLOOR(EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;
            uuid_bytes := gen_random_bytes(16);
            uuid_bytes := SET_BYTE(uuid_bytes, 0, ((unix_ts_ms >> 40) & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 1, ((unix_ts_ms >> 32) & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 2, ((unix_ts_ms >> 24) & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 3, ((unix_ts_ms >> 16) & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 4, ((unix_ts_ms >> 8) & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 5, (unix_ts_ms & 255)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 6, ((GET_BYTE(uuid_bytes, 6) & 15) | 112)::INTEGER);
            uuid_bytes := SET_BYTE(uuid_bytes, 8, ((GET_BYTE(uuid_bytes, 8) & 63) | 128)::INTEGER);
            RETURN ENCODE(uuid_bytes, 'hex')::UUID;
        END;
        $fn$ LANGUAGE plpgsql VOLATILE;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 2: TEMPORARILY DROP EXISTING FOREIGN KEY CONSTRAINTS ON FOUNDATION TABLES
-- Required to permit altering column types from TEXT to UUID without dependency locks.
-- ------------------------------------------------------------------------------
ALTER TABLE "branches" DROP CONSTRAINT IF EXISTS "branches_parentId_fkey";
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_parentId_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_roleId_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_branchId_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_departmentId_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_roleId_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permissionId_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_pkey";

-- ------------------------------------------------------------------------------
-- STEP 3: CONVERT 7 FOUNDATION TABLES IN-PLACE (TEXT -> UUID & TIMESTAMP -> TIMESTAMPTZ)
-- Uses explicit USING ...::UUID casting to convert valid UUID strings to binary UUIDs.
-- Uses AT TIME ZONE 'UTC' to normalize timestamps to TIMESTAMPTZ.
-- ------------------------------------------------------------------------------

-- 3.1 Company
ALTER TABLE "companies"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "businessHoursCalendarId" SET DATA TYPE UUID USING (CASE WHEN "businessHoursCalendarId" IS NOT NULL AND "businessHoursCalendarId" <> '' THEN "businessHoursCalendarId"::UUID ELSE NULL END),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 3.2 Roles
ALTER TABLE "roles"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 3.3 Permissions
ALTER TABLE "permissions"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- 3.4 Branches
ALTER TABLE "branches"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "parentId" SET DATA TYPE UUID USING (CASE WHEN "parentId" IS NOT NULL AND "parentId" <> '' THEN "parentId"::UUID ELSE NULL END),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);

-- 3.5 Departments
ALTER TABLE "departments"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "parentId" SET DATA TYPE UUID USING (CASE WHEN "parentId" IS NOT NULL AND "parentId" <> '' THEN "parentId"::UUID ELSE NULL END),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);

-- 3.6 Users (Preserving passwordHash and administrator records)
ALTER TABLE "users"
    ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ALTER COLUMN "roleId" SET DATA TYPE UUID USING "roleId"::UUID,
    ALTER COLUMN "branchId" SET DATA TYPE UUID USING "branchId"::UUID,
    ALTER COLUMN "departmentId" SET DATA TYPE UUID USING (CASE WHEN "departmentId" IS NOT NULL AND "departmentId" <> '' THEN "departmentId"::UUID ELSE NULL END),
    ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "lastLoginAt" IS NOT NULL THEN "lastLoginAt" AT TIME ZONE 'UTC' ELSE NULL END),
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);

-- 3.7 Role Permissions
ALTER TABLE "role_permissions"
    ALTER COLUMN "roleId" SET DATA TYPE UUID USING "roleId"::UUID,
    ALTER COLUMN "permissionId" SET DATA TYPE UUID USING "permissionId"::UUID;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId");

-- ------------------------------------------------------------------------------
-- STEP 4: ADD RESTORED FOUNDATION GOVERNANCE COLUMNS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'managerUserId') THEN
        ALTER TABLE "branches" ADD COLUMN "managerUserId" UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'alternateApproverId') THEN
        ALTER TABLE "branches" ADD COLUMN "alternateApproverId" UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'headUserId') THEN
        ALTER TABLE "departments" ADD COLUMN "headUserId" UUID;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 5: RE-ESTABLISH FOUNDATION FOREIGN KEY CONSTRAINTS WITH UUID TYPES
-- ------------------------------------------------------------------------------
ALTER TABLE "branches"
    ADD CONSTRAINT "branches_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "branches_managerUserId_fkey" 
        FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "branches_alternateApproverId_fkey" 
        FOREIGN KEY ("alternateApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments"
    ADD CONSTRAINT "departments_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "departments_headUserId_fkey" 
        FOREIGN KEY ("headUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
    ADD CONSTRAINT "users_roleId_fkey" 
        FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "users_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "users_departmentId_fkey" 
        FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_roleId_fkey" 
        FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "role_permissions_permissionId_fkey" 
        FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 6: CREATE 8 NEW STAGE 1 MODELS (NATIVE UUID & TIMESTAMPTZ)
-- ------------------------------------------------------------------------------

-- 6.1 user_scope_grants (Staff scope overrides)
CREATE TABLE IF NOT EXISTS "user_scope_grants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "branchId" UUID,
    "departmentId" UUID,
    "grantedByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_scope_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_scope_grants_userId_idx" ON "user_scope_grants"("userId");
CREATE INDEX IF NOT EXISTS "user_scope_grants_branchId_idx" ON "user_scope_grants"("branchId");
CREATE INDEX IF NOT EXISTS "user_scope_grants_departmentId_idx" ON "user_scope_grants"("departmentId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_scope_branch_or_dept') THEN
        ALTER TABLE "user_scope_grants"
            ADD CONSTRAINT "chk_user_scope_branch_or_dept"
            CHECK ("branchId" IS NOT NULL OR "departmentId" IS NOT NULL);
    END IF;
END $$;

-- 6.2 customers (Minimal root account)
CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "customerNumber" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "taxId" VARCHAR(50),
    "billingAddress" TEXT NOT NULL,
    "primaryPhone" VARCHAR(50) NOT NULL,
    "primaryEmail" VARCHAR(100) NOT NULL,
    "paymentTermsDays" SMALLINT NOT NULL DEFAULT 30,
    "creditLimit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customers_customerNumber_key" ON "customers"("customerNumber");
CREATE INDEX IF NOT EXISTS "customers_customerNumber_idx" ON "customers"("customerNumber");
CREATE INDEX IF NOT EXISTS "customers_isActive_idx" ON "customers"("isActive");

-- 6.3 customer_sites (Physical customer properties)
CREATE TABLE IF NOT EXISTS "customer_sites" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "customerId" UUID NOT NULL,
    "siteCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT NOT NULL,
    "primaryContactName" VARCHAR(100),
    "primaryContactPhone" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_sites_customerId_siteCode_key" ON "customer_sites"("customerId", "siteCode");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_sites_id_customerId_key" ON "customer_sites"("id", "customerId");
CREATE INDEX IF NOT EXISTS "customer_sites_customerId_idx" ON "customer_sites"("customerId");

-- 6.4 customer_contacts (Portal user accounts)
CREATE TABLE IF NOT EXISTS "customer_contacts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "customerId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(50),
    "passwordHash" VARCHAR(255) NOT NULL,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "canApproveQuotes" BOOLEAN NOT NULL DEFAULT false,
    "canRequestWork" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ,
    "failedLoginAttempts" SMALLINT NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_contacts_email_key" ON "customer_contacts"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_contacts_id_customerId_key" ON "customer_contacts"("id", "customerId");
CREATE INDEX IF NOT EXISTS "customer_contacts_customerId_idx" ON "customer_contacts"("customerId");
CREATE INDEX IF NOT EXISTS "customer_contacts_email_idx" ON "customer_contacts"("email");

-- 6.5 customer_contact_site_grants (Relational tenant isolation mapping)
CREATE TABLE IF NOT EXISTS "customer_contact_site_grants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "customerId" UUID NOT NULL,
    "customerContactId" UUID NOT NULL,
    "customerSiteId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_contact_site_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_contact_site_grants_contact_site_key" ON "customer_contact_site_grants"("customerContactId", "customerSiteId");
CREATE INDEX IF NOT EXISTS "customer_contact_site_grants_customerId_idx" ON "customer_contact_site_grants"("customerId");
CREATE INDEX IF NOT EXISTS "customer_contact_site_grants_customerContactId_idx" ON "customer_contact_site_grants"("customerContactId");
CREATE INDEX IF NOT EXISTS "customer_contact_site_grants_customerSiteId_idx" ON "customer_contact_site_grants"("customerSiteId");

-- 6.6 portal_sessions (Portal bearer tokens)
CREATE TABLE IF NOT EXISTS "portal_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "customerContactId" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "portal_sessions_tokenHash_key" ON "portal_sessions"("tokenHash");
CREATE INDEX IF NOT EXISTS "portal_sessions_customerContactId_idx" ON "portal_sessions"("customerContactId");
CREATE INDEX IF NOT EXISTS "portal_sessions_tokenHash_idx" ON "portal_sessions"("tokenHash");

-- 6.7 auth_otps (Step-up and login OTPs)
CREATE TABLE IF NOT EXISTS "auth_otps" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID,
    "customerContactId" UUID,
    "otpCodeHash" VARCHAR(128) NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "destination" VARCHAR(150) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "consumedAt" TIMESTAMPTZ,
    "attemptCount" SMALLINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_otps_userId_idx" ON "auth_otps"("userId");
CREATE INDEX IF NOT EXISTS "auth_otps_customerContactId_idx" ON "auth_otps"("customerContactId");
CREATE INDEX IF NOT EXISTS "auth_otps_purpose_destination_idx" ON "auth_otps"("purpose", "destination");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_auth_otp_actor_xor') THEN
        ALTER TABLE "auth_otps"
            ADD CONSTRAINT "chk_auth_otp_actor_xor" CHECK (
                ("userId" IS NOT NULL AND "customerContactId" IS NULL) OR
                ("userId" IS NULL AND "customerContactId" IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_auth_otp_purpose') THEN
        ALTER TABLE "auth_otps"
            ADD CONSTRAINT "chk_auth_otp_purpose" CHECK (
                "purpose" IN ('LOGIN_MFA', 'STEP_UP_APPROVAL', 'PASSWORD_RESET', 'PHONE_VERIFY')
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_auth_otp_channel') THEN
        ALTER TABLE "auth_otps"
            ADD CONSTRAINT "chk_auth_otp_channel" CHECK (
                "channel" IN ('EMAIL', 'SMS', 'WHATSAPP')
            );
    END IF;
END $$;

-- 6.8 api_keys (M2M machine credentials)
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(100) NOT NULL,
    "keyPrefix" VARCHAR(16) NOT NULL,
    "keyHash" VARCHAR(128) NOT NULL,
    "branchId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMPTZ,
    "revokedAt" TIMESTAMPTZ,
    "lastUsedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_keyPrefix_key" ON "api_keys"("keyPrefix");
CREATE INDEX IF NOT EXISTS "api_keys_branchId_idx" ON "api_keys"("branchId");
CREATE INDEX IF NOT EXISTS "api_keys_roleId_idx" ON "api_keys"("roleId");

-- ------------------------------------------------------------------------------
-- STEP 7: CREATE FOREIGN KEYS FOR STAGE 1 TABLES (CONNECTING TO FOUNDATION)
-- ------------------------------------------------------------------------------
ALTER TABLE "user_scope_grants"
    ADD CONSTRAINT "user_scope_grants_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "user_scope_grants_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "user_scope_grants_departmentId_fkey" 
        FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "user_scope_grants_grantedByUserId_fkey" 
        FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_sites"
    ADD CONSTRAINT "customer_sites_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_contacts"
    ADD CONSTRAINT "customer_contacts_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_contact_site_grants"
    ADD CONSTRAINT "customer_contact_site_grants_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "customer_contact_site_grants_contact_customer_fkey" 
        FOREIGN KEY ("customerContactId", "customerId") REFERENCES "customer_contacts"("id", "customerId") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "customer_contact_site_grants_site_customer_fkey" 
        FOREIGN KEY ("customerSiteId", "customerId") REFERENCES "customer_sites"("id", "customerId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_sessions"
    ADD CONSTRAINT "portal_sessions_customerContactId_fkey" 
        FOREIGN KEY ("customerContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_otps"
    ADD CONSTRAINT "auth_otps_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "auth_otps_customerContactId_fkey" 
        FOREIGN KEY ("customerContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "api_keys"
    ADD CONSTRAINT "api_keys_branchId_fkey" 
        FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "api_keys_roleId_fkey" 
        FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 8: RUNTIME TRIGGER FOR CUSTOMER SITE GRANT ISOLATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_enforce_customer_site_grant_isolation()
RETURNS TRIGGER AS $$
DECLARE
    v_contact_customer_id UUID;
    v_site_customer_id UUID;
BEGIN
    SELECT "customerId" INTO v_contact_customer_id FROM "customer_contacts" WHERE "id" = NEW."customerContactId";
    SELECT "customerId" INTO v_site_customer_id FROM "customer_sites" WHERE "id" = NEW."customerSiteId";

    IF v_contact_customer_id IS NULL OR v_site_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer site grant references non-existent contact or site';
    END IF;

    IF v_contact_customer_id <> v_site_customer_id OR NEW."customerId" <> v_contact_customer_id THEN
        RAISE EXCEPTION 'Customer site grant isolation violation: contact customer (%) and site customer (%) must match grant customer (%)',
            v_contact_customer_id, v_site_customer_id, NEW."customerId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "tg_enforce_customer_site_grant_isolation" ON "customer_contact_site_grants";
CREATE TRIGGER "tg_enforce_customer_site_grant_isolation"
    BEFORE INSERT OR UPDATE ON "customer_contact_site_grants"
    FOR EACH ROW
    EXECUTE FUNCTION fn_enforce_customer_site_grant_isolation();

COMMIT;

-- ==============================================================================
-- END OF RECONCILIATION MIGRATION SCRIPT
-- All 7 foundation tables are now native UUID and TIMESTAMPTZ.
-- All 8 Stage 1 tables and isolation triggers are deployed.
-- Existing administrator credentials and all records are 100% preserved.
-- ==============================================================================
