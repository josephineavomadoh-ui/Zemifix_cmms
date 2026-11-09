-- ==============================================================================
-- ZEMIFIX CMMS — MIGRATION: STAGE 1 (FOUNDATION EXTENSION & IDENTITY REALMS)
-- Version: 20261107000001_stage1_foundation_extension
-- Engine: PostgreSQL 18
--
-- Reconciles existing 7 foundation tables:
--   companies, branches, departments, users, roles, permissions, role_permissions
-- Converts existing TEXT identifiers to native UUID and TIMESTAMP to TIMESTAMPTZ.
-- Restores managerUserId, alternateApproverId on branches and headUserId on departments.
-- Deploys 8 new Stage 1 models:
--   user_scope_grants, customers, customer_sites, customer_contacts,
--   customer_contact_site_grants, portal_sessions, auth_otps, api_keys
-- Enforces:
--   - Native PostgreSQL 18 uuidv7() function
--   - Native PostgreSQL types matching Prisma schema exactly
--   - Customer site grant relational and trigger isolation
--   - Zero data loss for existing records and administrator accounts
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ENSURE uuidv7() IS AVAILABLE (CORE NATIVE IN PG18, FALLBACK WITHOUT PGCRYPTO)
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
-- 2. TEMPORARILY DROP EXISTING FOUNDATION FOREIGN KEYS FOR IN-PLACE CONVERSION
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
-- 3. CONVERT EXISTING 7 FOUNDATION TABLES IN-PLACE TO UUID AND TIMESTAMPTZ
-- ------------------------------------------------------------------------------

-- 3.1 Company
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "companies" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID;
    END IF;
    ALTER TABLE "companies" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'businessHoursCalendarId' AND udt_name = 'text') THEN
        ALTER TABLE "companies" ALTER COLUMN "businessHoursCalendarId" SET DATA TYPE UUID USING (CASE WHEN "businessHoursCalendarId" IS NOT NULL AND "businessHoursCalendarId" <> '' THEN "businessHoursCalendarId"::UUID ELSE NULL END);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "companies" 
            ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC');
    END IF;
END $$;

-- 3.2 Roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "roles" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID;
    END IF;
    ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "roles" 
            ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC');
    END IF;
END $$;

-- 3.3 Permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "permissions" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID;
    END IF;
    ALTER TABLE "permissions" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "permissions" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC');
    END IF;
END $$;

-- 3.4 Branches
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "branches" 
            ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
            ALTER COLUMN "parentId" SET DATA TYPE UUID USING (CASE WHEN "parentId" IS NOT NULL AND "parentId" <> '' THEN "parentId"::UUID ELSE NULL END);
    END IF;
    ALTER TABLE "branches" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "branches" 
            ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);
    END IF;
END $$;

-- 3.5 Departments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "departments" 
            ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
            ALTER COLUMN "parentId" SET DATA TYPE UUID USING (CASE WHEN "parentId" IS NOT NULL AND "parentId" <> '' THEN "parentId"::UUID ELSE NULL END);
    END IF;
    ALTER TABLE "departments" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "departments" 
            ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);
    END IF;
END $$;

-- 3.6 Users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id' AND udt_name = 'text') THEN
        ALTER TABLE "users" 
            ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::UUID,
            ALTER COLUMN "roleId" SET DATA TYPE UUID USING "roleId"::UUID,
            ALTER COLUMN "branchId" SET DATA TYPE UUID USING "branchId"::UUID,
            ALTER COLUMN "departmentId" SET DATA TYPE UUID USING (CASE WHEN "departmentId" IS NOT NULL AND "departmentId" <> '' THEN "departmentId"::UUID ELSE NULL END);
    END IF;
    ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuidv7();

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt' AND udt_name = 'timestamp') THEN
        ALTER TABLE "users" 
            ALTER COLUMN "lastLoginAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "lastLoginAt" IS NOT NULL THEN "lastLoginAt" AT TIME ZONE 'UTC' ELSE NULL END),
            ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ USING ("createdAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ USING ("updatedAt" AT TIME ZONE 'UTC'),
            ALTER COLUMN "deletedAt" SET DATA TYPE TIMESTAMPTZ USING (CASE WHEN "deletedAt" IS NOT NULL THEN "deletedAt" AT TIME ZONE 'UTC' ELSE NULL END);
    END IF;
END $$;

-- 3.7 Role Permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'roleId' AND udt_name = 'text') THEN
        ALTER TABLE "role_permissions" 
            ALTER COLUMN "roleId" SET DATA TYPE UUID USING "roleId"::UUID,
            ALTER COLUMN "permissionId" SET DATA TYPE UUID USING "permissionId"::UUID;
    END IF;
END $$;

ALTER TABLE "role_permissions" 
    DROP CONSTRAINT IF EXISTS "role_permissions_pkey";
ALTER TABLE "role_permissions" 
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId");

-- ------------------------------------------------------------------------------
-- 4. RESTORE MISSING FOUNDATION GOVERNANCE COLUMNS
-- ------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------
-- 4. RESTORE AND CONVERT FOUNDATION GOVERNANCE COLUMNS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- branches.managerUserId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'branches'
          AND column_name = 'managerUserId'
    ) THEN
        ALTER TABLE "branches" ADD COLUMN "managerUserId" UUID;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'branches'
          AND column_name = 'managerUserId'
          AND udt_name = 'text'
    ) THEN
        ALTER TABLE "branches"
            ALTER COLUMN "managerUserId"
            TYPE UUID USING NULLIF("managerUserId", '')::UUID;
    END IF;

    -- branches.alternateApproverId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'branches'
          AND column_name = 'alternateApproverId'
    ) THEN
        ALTER TABLE "branches" ADD COLUMN "alternateApproverId" UUID;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'branches'
          AND column_name = 'alternateApproverId'
          AND udt_name = 'text'
    ) THEN
        ALTER TABLE "branches"
            ALTER COLUMN "alternateApproverId"
            TYPE UUID USING NULLIF("alternateApproverId", '')::UUID;
    END IF;

    -- departments.headUserId
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'departments'
          AND column_name = 'headUserId'
    ) THEN
        ALTER TABLE "departments" ADD COLUMN "headUserId" UUID;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'departments'
          AND column_name = 'headUserId'
          AND udt_name = 'text'
    ) THEN
        ALTER TABLE "departments"
            ALTER COLUMN "headUserId"
            TYPE UUID USING NULLIF("headUserId", '')::UUID;
    END IF;
END $$;
-- ------------------------------------------------------------------------------
-- 5. RE-ESTABLISH FOUNDATION FOREIGN KEY CONSTRAINTS WITH MATCHING UUID TYPES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_parentId_fkey') THEN
        ALTER TABLE "branches" ADD CONSTRAINT "branches_parentId_fkey" 
            FOREIGN KEY ("parentId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_managerUserId_fkey') THEN
        ALTER TABLE "branches" ADD CONSTRAINT "branches_managerUserId_fkey" 
            FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branches_alternateApproverId_fkey') THEN
        ALTER TABLE "branches" ADD CONSTRAINT "branches_alternateApproverId_fkey" 
            FOREIGN KEY ("alternateApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_parentId_fkey') THEN
        ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" 
            FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_headUserId_fkey') THEN
        ALTER TABLE "departments" ADD CONSTRAINT "departments_headUserId_fkey" 
            FOREIGN KEY ("headUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_roleId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" 
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_branchId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" 
            FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_departmentId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" 
            FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_roleId_fkey') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" 
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_permissionId_fkey') THEN
        ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" 
            FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. CREATE 8 NEW STAGE 1 TABLES (NATIVE UUID & TIMESTAMPTZ)
-- ------------------------------------------------------------------------------

-- 6.1 user_scope_grants
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

-- 6.2 customers
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

-- 6.3 customer_sites
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

-- 6.4 customer_contacts
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

-- 6.5 customer_contact_site_grants
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

-- 6.6 portal_sessions
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

-- 6.7 auth_otps
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

-- 6.8 api_keys
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
-- 7. CROSS-REALM FOREIGN KEY CONSTRAINTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_scope_grants_userId_fkey') THEN
        ALTER TABLE "user_scope_grants" ADD CONSTRAINT "user_scope_grants_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_scope_grants_branchId_fkey') THEN
        ALTER TABLE "user_scope_grants" ADD CONSTRAINT "user_scope_grants_branchId_fkey" 
            FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_scope_grants_departmentId_fkey') THEN
        ALTER TABLE "user_scope_grants" ADD CONSTRAINT "user_scope_grants_departmentId_fkey" 
            FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_scope_grants_grantedByUserId_fkey') THEN
        ALTER TABLE "user_scope_grants" ADD CONSTRAINT "user_scope_grants_grantedByUserId_fkey" 
            FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_sites_customerId_fkey') THEN
        ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customerId_fkey" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contacts_customerId_fkey') THEN
        ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customerId_fkey" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contact_site_grants_customerId_fkey') THEN
        ALTER TABLE "customer_contact_site_grants" ADD CONSTRAINT "customer_contact_site_grants_customerId_fkey" 
            FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contact_site_grants_contact_customer_fkey') THEN
        ALTER TABLE "customer_contact_site_grants" ADD CONSTRAINT "customer_contact_site_grants_contact_customer_fkey" 
            FOREIGN KEY ("customerContactId", "customerId") REFERENCES "customer_contacts"("id", "customerId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_contact_site_grants_site_customer_fkey') THEN
        ALTER TABLE "customer_contact_site_grants" ADD CONSTRAINT "customer_contact_site_grants_site_customer_fkey" 
            FOREIGN KEY ("customerSiteId", "customerId") REFERENCES "customer_sites"("id", "customerId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portal_sessions_customerContactId_fkey') THEN
        ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_customerContactId_fkey" 
            FOREIGN KEY ("customerContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_otps_userId_fkey') THEN
        ALTER TABLE "auth_otps" ADD CONSTRAINT "auth_otps_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_otps_customerContactId_fkey') THEN
        ALTER TABLE "auth_otps" ADD CONSTRAINT "auth_otps_customerContactId_fkey" 
            FOREIGN KEY ("customerContactId") REFERENCES "customer_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_branchId_fkey') THEN
        ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_branchId_fkey" 
            FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_roleId_fkey') THEN
        ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_roleId_fkey" 
            FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. RUNTIME TRIGGER FOR CUSTOMER SITE GRANT ISOLATION
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
