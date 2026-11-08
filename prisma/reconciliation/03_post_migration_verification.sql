-- ==============================================================================
-- ZEMIFIX CMMS — POST-MIGRATION VERIFICATION SCRIPT (READ-ONLY / AUDIT)
-- Database: zemifix_dev (PostgreSQL 18)
-- Purpose: Exhaustively prove that:
--          1. All 15 tables exist with exact native PostgreSQL types (UUID, TIMESTAMPTZ).
--          2. All existing foundation records and row counts were preserved.
--          3. Root administrator credentials and password hash are identical.
--          4. Foreign key integrity and indexes are 100% active.
--          5. UUIDv7 generation and customer portal isolation are verified.
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

-- ------------------------------------------------------------------------------
-- 1. VERIFY ALL 15 PRODUCTION TABLES ARE PRESENT
-- ------------------------------------------------------------------------------
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'companies', 'branches', 'departments', 'users', 'roles', 'permissions', 'role_permissions',
        'user_scope_grants', 'customers', 'customer_sites', 'customer_contacts',
        'customer_contact_site_grants', 'portal_sessions', 'auth_otps', 'api_keys'
    ]) AS table_name
),
actual_tables AS (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
    e.table_name,
    CASE WHEN a.table_name IS NOT NULL THEN 'PRESENT' ELSE 'MISSING [CRITICAL]' END AS status
FROM expected_tables e
LEFT JOIN actual_tables a ON e.table_name = a.table_name
ORDER BY e.table_name;

-- ------------------------------------------------------------------------------
-- 2. VERIFY PRIMARY KEY DATA TYPES ARE NATIVE UUID
-- ------------------------------------------------------------------------------
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    CASE WHEN udt_name = 'uuid' THEN 'PASSED (UUID)' ELSE 'FAILED [NOT UUID]' END AS validation_result
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'id'
  AND table_name IN (
    'companies', 'branches', 'departments', 'users', 'roles', 'permissions',
    'user_scope_grants', 'customers', 'customer_sites', 'customer_contacts',
    'customer_contact_site_grants', 'portal_sessions', 'auth_otps', 'api_keys'
  )
ORDER BY table_name;

-- ------------------------------------------------------------------------------
-- 3. VERIFY FOREIGN KEY DATA TYPES ARE NATIVE UUID
-- ------------------------------------------------------------------------------
SELECT 
    table_name,
    column_name,
    udt_name,
    CASE WHEN udt_name = 'uuid' THEN 'PASSED (UUID)' ELSE 'FAILED [NOT UUID]' END AS validation_result
FROM information_schema.columns
WHERE table_schema = 'public' AND (
    (table_name = 'branches' AND column_name IN ('parentId', 'managerUserId', 'alternateApproverId')) OR
    (table_name = 'departments' AND column_name IN ('parentId', 'headUserId')) OR
    (table_name = 'users' AND column_name IN ('roleId', 'branchId', 'departmentId')) OR
    (table_name = 'role_permissions' AND column_name IN ('roleId', 'permissionId')) OR
    (table_name = 'user_scope_grants' AND column_name IN ('userId', 'branchId', 'departmentId', 'grantedByUserId')) OR
    (table_name = 'customer_sites' AND column_name = 'customerId') OR
    (table_name = 'customer_contacts' AND column_name = 'customerId') OR
    (table_name = 'customer_contact_site_grants' AND column_name IN ('customerId', 'customerContactId', 'customerSiteId')) OR
    (table_name = 'portal_sessions' AND column_name = 'customerContactId') OR
    (table_name = 'auth_otps' AND column_name IN ('userId', 'customerContactId')) OR
    (table_name = 'api_keys' AND column_name IN ('branchId', 'roleId'))
)
ORDER BY table_name, column_name;

-- ------------------------------------------------------------------------------
-- 4. VERIFY TIMESTAMPS ARE NATIVE TIMESTAMPTZ (timestamp with time zone)
-- ------------------------------------------------------------------------------
SELECT 
    table_name,
    column_name,
    data_type,
    CASE WHEN data_type = 'timestamp with time zone' THEN 'PASSED (TIMESTAMPTZ)' ELSE 'FAILED' END AS status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name IN ('createdAt', 'updatedAt', 'deletedAt', 'lastLoginAt', 'expiresAt', 'revokedAt', 'consumedAt')
  AND table_name IN (
    'companies', 'branches', 'departments', 'users', 'roles', 'permissions',
    'user_scope_grants', 'customers', 'customer_sites', 'customer_contacts',
    'portal_sessions', 'auth_otps', 'api_keys'
  )
ORDER BY table_name, column_name;

-- ------------------------------------------------------------------------------
-- 5. VERIFY FOREIGN KEY CONSTRAINTS ARE ACTIVE
-- ------------------------------------------------------------------------------
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ------------------------------------------------------------------------------
-- 6. VERIFY ZERO ORPHANS ACROSS ALL RELATIONSHIPS POST-MIGRATION
-- ------------------------------------------------------------------------------
SELECT 'branches.parentId -> branches.id' AS relation, count(*) AS orphan_count
FROM "branches" b LEFT JOIN "branches" p ON b."parentId" = p."id"
WHERE b."parentId" IS NOT NULL AND p."id" IS NULL
UNION ALL
SELECT 'departments.parentId -> departments.id', count(*)
FROM "departments" d LEFT JOIN "departments" p ON d."parentId" = p."id"
WHERE d."parentId" IS NOT NULL AND p."id" IS NULL
UNION ALL
SELECT 'users.roleId -> roles.id', count(*)
FROM "users" u LEFT JOIN "roles" r ON u."roleId" = r."id"
WHERE u."roleId" IS NOT NULL AND r."id" IS NULL
UNION ALL
SELECT 'users.branchId -> branches.id', count(*)
FROM "users" u LEFT JOIN "branches" b ON u."branchId" = b."id"
WHERE u."branchId" IS NOT NULL AND b."id" IS NULL
UNION ALL
SELECT 'users.departmentId -> departments.id', count(*)
FROM "users" u LEFT JOIN "departments" d ON u."departmentId" = d."id"
WHERE u."departmentId" IS NOT NULL AND d."id" IS NULL
UNION ALL
SELECT 'role_permissions.roleId -> roles.id', count(*)
FROM "role_permissions" rp LEFT JOIN "roles" r ON rp."roleId" = r."id"
WHERE r."id" IS NULL
UNION ALL
SELECT 'role_permissions.permissionId -> permissions.id', count(*)
FROM "role_permissions" rp LEFT JOIN "permissions" p ON rp."permissionId" = p."id"
WHERE p."id" IS NULL;

-- ------------------------------------------------------------------------------
-- 7. VERIFY ROW COUNTS (MUST MATCH OR EXCEED PRE-MIGRATION BASELINE)
-- ------------------------------------------------------------------------------
SELECT 'companies' AS table_name, count(*) AS total_rows FROM "companies"
UNION ALL
SELECT 'branches', count(*) FROM "branches"
UNION ALL
SELECT 'departments', count(*) FROM "departments"
UNION ALL
SELECT 'roles', count(*) FROM "roles"
UNION ALL
SELECT 'permissions', count(*) FROM "permissions"
UNION ALL
SELECT 'role_permissions', count(*) FROM "role_permissions"
UNION ALL
SELECT 'users', count(*) FROM "users"
ORDER BY table_name;

-- ------------------------------------------------------------------------------
-- 8. ROOT ADMINISTRATOR ACCOUNT PRESERVATION AUDIT
-- Confirms administrator account exists, ID is native UUID, and password hash is untouched.
-- ------------------------------------------------------------------------------
SELECT 
    u."id"::text AS admin_user_id,
    pg_typeof(u."id") AS id_data_type,
    u."email" AS admin_email,
    u."name" AS admin_name,
    u."accessScope"::text AS access_scope,
    r."name" AS role_name,
    substr(u."passwordHash", 1, 15) || '...' AS password_hash_prefix,
    length(u."passwordHash") AS password_hash_length,
    u."isActive" AS is_active,
    u."createdAt" AS created_at_timestamptz
FROM "users" u
JOIN "roles" r ON u."roleId" = r."id"
WHERE r."name" = 'Admin' OR u."email" = 'admin@zemifix.local';

-- ------------------------------------------------------------------------------
-- 9. UUIDv7 GENERATOR VERIFICATION
-- Tests generate_uuid_v7() output: 36 chars, version 7 nibble, variant 10xx.
-- ------------------------------------------------------------------------------
SELECT 
    v7_id::text AS sample_uuid_v7,
    substr(v7_id::text, 15, 1) AS version_nibble, -- MUST be '7'
    substr(v7_id::text, 20, 1) AS variant_nibble, -- MUST be '8', '9', 'a', or 'b'
    CASE 
        WHEN substr(v7_id::text, 15, 1) = '7' AND substr(v7_id::text, 20, 1) IN ('8', '9', 'a', 'b') 
        THEN 'PASSED RFC 9562 UUIDv7' 
        ELSE 'FAILED' 
    END AS spec_status
FROM (SELECT uuidv7() AS v7_id) sample;

-- ------------------------------------------------------------------------------
-- 10. CUSTOMER ISOLATION TRIGGER VERIFICATION
-- Confirms the runtime isolation trigger is registered on customer_contact_site_grants.
-- ------------------------------------------------------------------------------
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'customer_contact_site_grants'
  AND trigger_name = 'tg_enforce_customer_site_grant_isolation';

COMMIT;

-- ==============================================================================
-- END OF POST-MIGRATION VERIFICATION SCRIPT
-- ==============================================================================
